"""A-05b/d: 24-hour pump schedule, plan() and POST /api/allocate."""
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

SUMMER_SOLAR_DAY = "2026-07-08"  # PV reaches the pump's kW at 11:00-13:00
NO_SOLAR_DAY = "2026-08-26"  # PV peaks at 44.3 kW, just under the pump's 44.6 kW: no solar hour
GOOD = "SSUD-20260708"


def pumping(s):
    return [x for x in s.slots if x.source != "off"]


# ---------- the schedule
def test_24_slots_and_hours_needed_is_ceil_of_volume_over_flow():
    s = schedule(800, NO_SOLAR_DAY)
    assert [x.hour for x in s.slots] == list(range(24))
    assert len(pumping(s)) == 6  # ceil(800 / 150)
    assert s.pumped_m3 == 800 and s.warnings == []


def test_energy_formula():
    p = pump_spec()
    s = schedule(800, NO_SOLAR_DAY)
    assert s.energy_kwh == pytest.approx(800 * 0.00272 * p["head_m"] / p["efficiency"], abs=0.1)


def test_solar_share_between_0_and_1_and_solar_hours_really_have_enough_sun():
    s = schedule(1800, SUMMER_SOLAR_DAY)
    assert 0 < s.solar_share < 1
    pv, kw = sch._pv_kw(SUMMER_SOLAR_DAY), pump_spec()["power_kW"]
    solar_hours = [x.hour for x in s.slots if x.source == "solar"]
    assert solar_hours == [11, 12, 13] and all(pv[h] >= kw for h in solar_hours)
    assert schedule(800, NO_SOLAR_DAY).solar_share == 0.0  # no hour qualifies on that day


def test_solar_threshold_is_one_constant(monkeypatch):
    monkeypatch.setattr(sch, "SOLAR_MIN_FRACTION", 0.8)  # weaker sun counts
    assert schedule(800, NO_SOLAR_DAY).solar_share > 0


def test_no_grid_between_13_and_17_in_an_outage():
    # heatwave start: basin at 600 m3, so 2,400 m3 can be pumped = 16 hours; an outage removes 4 of the grid hours
    normal = schedule(2400, NO_SOLAR_DAY, "normal", basin_initial_m3=600)
    outage = schedule(2400, NO_SOLAR_DAY, "outage", basin_initial_m3=600)
    assert any(x.source == "grid" and 13 <= x.hour < 17 for x in normal.slots) and normal.pumped_m3 == 2400
    assert not any(x.source == "grid" and 13 <= x.hour < 17 for x in outage.slots)
    # and the volume that no longer fits is reported, not hidden
    assert outage.pumped_m3 == 1800
    assert any("600 m3 could not be pumped: not enough pumping hours" in w and "no grid during the outage" in w for w in outage.warnings)


def test_outage_without_a_squeeze_changes_nothing_visible():
    # a normal-sized day fits outside the window: same hours, no warning
    assert schedule(800, NO_SOLAR_DAY, "outage").warnings == [] and schedule(800, NO_SOLAR_DAY, "outage").pumped_m3 == 800


def test_outage_does_not_stop_solar():
    s = schedule(1800, SUMMER_SOLAR_DAY, "outage")
    assert [x.hour for x in s.slots if x.source == "solar"] == [11, 12, 13]  # 13:00 is in the window: sun, not grid


def test_basin_level_is_tracked_and_capped():
    s = schedule(800, NO_SOLAR_DAY)
    levels = [x.basin_m3 for x in s.slots]
    assert levels == sorted(levels) and levels[0] >= 1200 and levels[-1] == 1200 + 800
    big = schedule(2500, NO_SOLAR_DAY)  # the basin (3000 m3) already holds 1200
    assert max(x.basin_m3 for x in big.slots) <= 3000 and big.pumped_m3 == 1800
    assert any("basin is full" in w for w in big.warnings)


def test_nothing_to_pump_and_missing_pv_data_do_not_crash():
    assert pumping(schedule(0, NO_SOLAR_DAY)) == [] and schedule(0, NO_SOLAR_DAY).energy_kwh == 0
    s = schedule(300, "2030-01-01")
    assert any("No PV data" in w for w in s.warnings) and s.solar_share == 0


# ---------- plan() and the endpoint
def test_plan_default_batch_is_the_latest_not_invalid():
    a = plan()
    assert a.batch_id == "SSUD-20260829"
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
        assert c.post("/api/allocate", json={}).json()["batch_id"] == "SSUD-20260829"  # all fields optional
        assert c.post("/api/allocate", json={"batch_id": GOOD, "scenario": "outage"}).status_code == 200


def test_endpoint_errors():
    with TestClient(app) as c:
        assert c.post("/api/allocate", json={"batch_id": "NOPE"}).status_code == 404
        assert c.post("/api/allocate", json={"scenario": "flood"}).status_code == 422
