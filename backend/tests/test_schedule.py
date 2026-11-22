"""A-05b/d/e: 24-hour pump schedule (hybrid solar), plan() and POST /api/allocate."""
import time

import pytest
from fastapi.testclient import TestClient

from app.engine import schedule as sch
from app.engine.plan import plan
from app.engine.schedule import pump_spec, schedule
from app.main import app
from app.schemas import Allocation
from app.store import init_store

init_store()

HEATWAVE = "2026-08-26"  # hottest day of the summer; sun peaks at 44.3 kW, just under the 44.6 kW pump
HEATWAVE_BATCH = "SSUD-20260826"
SUMMER = "2026-07-08"
GOOD = "SSUD-20260708"


def pumping(s):
    return [x for x in s.slots if x.source != "off"]


def in_window(h):
    return 13 <= h < 17


# ---------- the schedule
def test_24_slots_and_hours_needed():
    s = schedule(800, HEATWAVE)
    assert [x.hour for x in s.slots] == list(range(24))
    assert s.pumped_m3 == 800 and s.warnings == []
    assert len(pumping(s)) == 6  # 800 m3 at 150 m3/h: 5 full hours + 1 partial


def test_energy_formula_unchanged():
    p = pump_spec()
    for date in (HEATWAVE, "2026-11-21"):
        s = schedule(800, date)
        assert s.energy_kwh == pytest.approx(800 * 0.00272 * p["head_m"] / p["efficiency"], abs=0.1)


def test_hours_are_chosen_by_highest_sun_first():
    s = schedule(450, HEATWAVE)  # 3 hours of water: they must be the 3 best sun hours
    pv = sch._pv_kw(HEATWAVE)
    best = sorted(range(24), key=lambda h: -pv.get(h, 0))[:3]
    assert sorted(x.hour for x in pumping(s)) == sorted(best) == [11, 12, 13]
    assert all(x.source == "solar" for x in pumping(s))


def test_hybrid_solar_share_is_energy_based_with_partial_credit():
    s = schedule(800, "2026-11-21")  # the sun never reaches the pump's 44.6 kW in November (peak 26 kW)
    pv = sch._pv_kw("2026-11-21")
    assert 0 < s.solar_share < 1
    solar_kwh = sum(min(x.pump_kw, pv.get(x.hour, 0)) for x in s.slots)
    assert s.solar_share == pytest.approx(solar_kwh / s.energy_kwh, abs=0.02)  # solar_kw = min(pv, pump_kw)


def test_source_label_rule_is_one_constant_at_the_top(monkeypatch):
    pv, kw = sch._pv_kw(HEATWAVE), pump_spec()["kw"]
    s = schedule(1200, HEATWAVE)
    for x in pumping(s):  # "solar" iff PV >= 50% of the pump's kW
        assert (x.source == "solar") == (pv.get(x.hour, 0) >= sch.SOLAR_LABEL_FRACTION * kw)
    monkeypatch.setattr(sch, "SOLAR_LABEL_FRACTION", 0.99)  # a stricter label: nothing is called solar ...
    strict = schedule(800, "2026-11-21")
    assert not any(x.source == "solar" for x in strict.slots)
    assert 0 < strict.solar_share < 1  # ... but the sun still gets its partial credit


def test_outage_never_uses_the_grid_between_13_and_17_but_pumps_on_the_sun():
    s = schedule(2400, HEATWAVE, "outage", basin_initial_m3=600)
    pv, kw = sch._pv_kw(HEATWAVE), pump_spec()["kw"]
    assert not any(x.source == "grid" and in_window(x.hour) for x in s.slots)
    window = [x for x in pumping(s) if in_window(x.hour)]
    assert [x.hour for x in window] == [13, 14, 15]  # the sunny hours of the window; 16:00 is too dark
    for x in window:  # solar only, at the reduced flow = pump flow x PV / pump kW
        assert x.source == "solar" and x.pump_kw == pytest.approx(min(pv[x.hour], kw), abs=0.06)
    assert any(x.pump_kw < kw - 1 for x in window)  # partial pumping, not the full 44.6 kW
    assert 0 < s.solar_share <= 1


def test_outage_reports_what_cannot_be_pumped():
    normal = schedule(2400, HEATWAVE, "normal", basin_initial_m3=600)
    outage = schedule(2400, HEATWAVE, "outage", basin_initial_m3=600)
    assert normal.pumped_m3 == 2400 and normal.warnings == []
    assert outage.pumped_m3 < normal.pumped_m3
    assert any("could not be pumped: not enough pumping hours" in w and "no grid during the outage" in w for w in outage.warnings)


def test_basin_level_is_tracked_and_capped():
    s = schedule(800, HEATWAVE)
    levels = [x.basin_m3 for x in s.slots]
    assert levels == sorted(levels) and levels[0] >= 1200 and levels[-1] == 1200 + 800
    big = schedule(2500, HEATWAVE)  # the basin (3000 m3) already holds 1200
    assert max(x.basin_m3 for x in big.slots) <= 3000 and big.pumped_m3 == 1800
    assert any("basin is full" in w for w in big.warnings)


def test_nothing_to_pump_and_missing_pv_data_do_not_crash():
    assert pumping(schedule(0, HEATWAVE)) == [] and schedule(0, HEATWAVE).energy_kwh == 0
    s = schedule(300, "2030-01-01")
    assert any("No PV data" in w for w in s.warnings) and s.solar_share == 0


# ---------- plan() and the endpoint
def test_default_plan_has_a_solar_share():  # 21 Nov, the first forecast day
    a = plan(GOOD)
    assert 0 < a.solar_share < 1 and a.warnings and not any("historical" in w for w in a.warnings)


def test_heatwave_plan_has_needs_solar_and_no_grid_in_the_outage():
    normal = plan(HEATWAVE_BATCH, HEATWAVE, "normal")
    outage = plan(HEATWAVE_BATCH, HEATWAVE, "outage")
    for a in (normal, outage):
        by = {i.farm_id: i for i in a.items}
        assert all(by[f].m3 > 0 for f in "ABD"), "farms A, B and D need water on the heatwave day"
        assert 0 < a.solar_share <= 1
        assert any("historical data" in w for w in a.warnings)  # the weather is not a forecast: say so
    assert not any(s.source == "grid" and in_window(s.hour) for s in outage.schedule)
    assert any(s.source == "solar" and in_window(s.hour) for s in outage.schedule)  # pumping on the sun only


def test_plan_default_batch_is_the_latest_not_invalid():
    assert plan().batch_id == "SSUD-20260829"
    assert plan("NOPE") is None


@pytest.mark.parametrize("scenario", ["normal", "outage"])
def test_plan_has_the_contract_shape(scenario):
    a = plan(GOOD, None, scenario)
    Allocation.model_validate(a.model_dump())
    assert len(a.schedule) == 24 and len(a.items) == 10 and 0 <= a.solar_share <= 1
    assert a.fresh_replaced_m3 == pytest.approx(sum(i.m3 for i in a.items), abs=0.2)
    assert set(a.items[0].model_dump()) == {"farm_id", "status", "m3", "cap_reason"}  # the contract's item, no extras


def test_endpoint_contract_shape_and_speed():
    with TestClient(app) as c:
        t0 = time.perf_counter()
        r = c.post("/api/allocate", json={"batch_id": GOOD})
        elapsed = time.perf_counter() - t0
        assert r.status_code == 200 and elapsed < 1.0, elapsed
        Allocation.model_validate(r.json())
        assert set(r.json()) == {"batch_id", "items", "schedule", "energy_kwh", "solar_share", "fresh_replaced_m3", "warnings"}
        assert set(r.json()["schedule"][0]) == {"hour", "pump_kw", "source", "basin_m3"}
        assert r.json()["solar_share"] > 0  # default date
        assert c.post("/api/allocate", json={}).json()["batch_id"] == "SSUD-20260829"  # all fields optional


def test_endpoint_heatwave_replay():
    with TestClient(app) as c:
        r = c.post("/api/allocate", json={"batch_id": HEATWAVE_BATCH, "date": HEATWAVE, "scenario": "outage"}).json()
    assert sum(i["m3"] for i in r["items"]) > 0 and r["solar_share"] > 0
    assert not any(s["source"] == "grid" and in_window(s["hour"]) for s in r["schedule"])


def test_endpoint_errors():
    with TestClient(app) as c:
        assert c.post("/api/allocate", json={"batch_id": "NOPE"}).status_code == 404
        assert c.post("/api/allocate", json={"scenario": "flood"}).status_code == 422
