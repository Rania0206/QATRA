"""A-14a: money saved per farm (well electricity + fertiliser - treated water) and POST /api/savings."""
import time

import pytest
from fastapi.testclient import TestClient

from app.engine import savings as sv
from app.engine.batches import get_batch
from app.engine.farms import get_farm
from app.engine.plan import plan
from app.engine.savings import Overrides, SavingsReport, savings, well_energy_kwh_per_m3
from app.main import app
from app.schemas import Allocation, AllocationItem
from app.store import init_store

init_store()

GOOD = "SSUD-20260708"


def one(farm_id="B", m3=100.0, status="allocated", **kw):
    """A plan with one farm and a hand-picked volume."""
    p = Allocation(batch_id=GOOD, items=[AllocationItem(farm_id=farm_id, status=status, m3=m3)], schedule=[],
                   energy_kwh=0, solar_share=0, fresh_replaced_m3=m3, warnings=[])
    return savings(p, **kw)


def test_formula_energy_per_m3():
    assert well_energy_kwh_per_m3(50, 0.5) == pytest.approx(0.272)  # 0.00272 x 50 / 0.5


def test_hand_calculated_values(monkeypatch):
    """100 m3 on a 50 m well, efficiency 0.5, N 30 mg/L, default prices."""
    farm = get_farm("B").model_copy(update={"well_depth_m": 50.0, "pump_efficiency": 0.5})
    monkeypatch.setattr(sv, "get_farm", lambda fid: farm)
    monkeypatch.setattr(sv, "_nitrogen", lambda b: (30.0, "test", "ESTIMATE"))
    i = one("B", 100.0).items[0]
    assert i.well_kwh_saved == pytest.approx(27.2)  # 100 x 0.272
    assert i.electricity_saved_tnd == pytest.approx(7.91, abs=0.01)  # 27.2 kWh x 0.2907 TND
    assert i.nitrogen_kg == pytest.approx(3.0)  # 100 m3 x 30 mg/L / 1000
    assert i.fertiliser_value_tnd == pytest.approx(4.48, abs=0.01)  # 3 / 0.335 x 1.0 TND/kg x 0.5
    assert i.water_cost_tnd == pytest.approx(2.0)  # 100 x 0.020
    assert i.net_saving_tnd == pytest.approx(10.39, abs=0.02)  # 7.91 + 4.48 - 2.00
    assert i.qatra_fee_tnd == pytest.approx(1.04, abs=0.01) and i.farmer_net_tnd == pytest.approx(9.35, abs=0.02)


def test_blocked_farm_gets_zero_and_a_reason():
    i = one("C", 0.0, status="blocked").items[0]
    assert i.m3 == 0 and i.net_saving_tnd == i.electricity_saved_tnd == i.fertiliser_value_tnd == i.qatra_fee_tnd == 0
    assert i.reason
    c = [x for x in savings(plan()).items if x.farm_id == "C"][0]  # also in the real plan
    assert c.net_saving_tnd == 0 and c.reason and "raw" in c.reason.lower()


def test_network_farm_saves_no_electricity():
    i = one("H", 50.0).items[0]  # farm H takes water from the network: no pump of its own
    assert i.electricity_saved_tnd == 0 and i.fertiliser_value_tnd > 0 and "no own pump" in i.reason


def test_higher_price_in_overrides_raises_the_saving():
    base = one("B", 100.0).items[0]
    elec = one("B", 100.0, overrides=Overrides(electricity_price=0.6)).items[0]
    fert = one("B", 100.0, overrides=Overrides(fertiliser_price=3.0)).items[0]
    assert elec.net_saving_tnd > base.net_saving_tnd and elec.electricity_saved_tnd > base.electricity_saved_tnd
    assert fert.net_saving_tnd > base.net_saving_tnd and fert.fertiliser_value_tnd > base.fertiliser_value_tnd
    assert one("B", 100.0, overrides=Overrides(treated_water_price=0.5)).items[0].net_saving_tnd < base.net_saving_tnd
    half = one("B", 100.0, overrides=Overrides(availability_factor=0.25)).items[0]
    assert half.fertiliser_value_tnd == pytest.approx(base.fertiliser_value_tnd / 2, abs=0.02)


def test_fee_is_ten_percent_of_a_positive_net_and_never_negative():
    i = one("B", 100.0).items[0]
    assert i.qatra_fee_tnd == pytest.approx(0.10 * i.net_saving_tnd, abs=0.01)
    assert i.farmer_net_tnd == pytest.approx(i.net_saving_tnd - i.qatra_fee_tnd, abs=0.01)
    loss = one("B", 100.0, overrides=Overrides(treated_water_price=5.0)).items[0]  # water costs more than it saves
    assert loss.net_saving_tnd < 0 and loss.qatra_fee_tnd == 0 and loss.farmer_net_tnd == loss.net_saving_tnd
    twenty = one("B", 100.0, overrides=Overrides(qatra_fee_pct=20)).items[0]
    assert twenty.qatra_fee_tnd == pytest.approx(2 * i.qatra_fee_tnd, abs=0.02)


def test_default_plan_totals_season_and_year():
    r = savings(plan(), date="2026-11-21")
    assert len(r.items) == 10
    for field in ("electricity_saved_tnd", "fertiliser_value_tnd", "water_cost_tnd", "net_saving_tnd", "qatra_fee_tnd"):
        assert getattr(r.day, field) == pytest.approx(sum(getattr(i, field) for i in r.items), abs=0.02)
    assert r.day.net_saving_tnd == pytest.approx(
        r.day.electricity_saved_tnd + r.day.fertiliser_value_tnd - r.day.water_cost_tnd, abs=0.02)
    assert r.day.tag.status == "ESTIMATE" and r.season.tag.status == r.year.tag.status == "PROJECTION"
    assert r.season.net_saving_tnd == pytest.approx(150 * r.day.net_saving_tnd, rel=0.001)
    assert r.year.net_saving_tnd == r.season.net_saving_tnd  # one season a year by default
    more = savings(plan(), Overrides(irrigation_days=100, seasons_per_year=2))
    assert more.season.net_saving_tnd == pytest.approx(100 * more.day.net_saving_tnd, rel=0.001)
    assert more.year.net_saving_tnd == pytest.approx(2 * more.season.net_saving_tnd, rel=0.001)


def test_assumptions_carry_a_status_and_the_unverified_prices_say_so():
    a = {x.name: x for x in savings(plan()).assumptions}
    assert a["fertiliser_price"].status == "TO_VERIFY" and a["treated_water_price"].status == "TO_VERIFY"
    assert a["electricity_price"].value == pytest.approx(0.2907) and a["availability_factor"].value == 0.5
    assert all(x.source and x.status in ("REPORTED", "ESTIMATE", "SIMULATED", "TO_VERIFY", "PROJECTION") for x in a.values())
    edited = {x.name: x for x in savings(plan(), Overrides(fertiliser_price=2.0)).assumptions}["fertiliser_price"]
    assert edited.value == 2.0 and edited.status == "ESTIMATE" and "user" in edited.source  # no longer the TO_VERIFY default


def test_batch_without_nitrogen_uses_the_typical_value():
    b = get_batch(GOOD).model_copy(deep=True)
    for an in b.analyses:
        an.values.pop("total_N_mg_L", None)
    mg, _, status = sv._nitrogen(b)
    assert mg == 30.0 and status == "ESTIMATE"  # secondary effluent, tww_quality_ranges.csv


def test_unknown_batch_and_farm_filter():
    assert savings(Allocation(batch_id="NOPE", items=[], schedule=[], energy_kwh=0, solar_share=0,
                              fresh_replaced_m3=0, warnings=[])) is None
    assert [i.farm_id for i in savings(plan(), farm_id="D").items] == ["D"]


# ---------- endpoint
def test_endpoint_shape_speed_and_overrides():
    with TestClient(app) as c:
        t0 = time.perf_counter()
        r = c.post("/api/savings", json={})
        assert r.status_code == 200 and time.perf_counter() - t0 < 1.0
        SavingsReport.model_validate(r.json())
        body = r.json()
        assert len(body["items"]) == 10 and body["date"] == "2026-11-21" and body["assumptions"]
        higher = c.post("/api/savings", json={"overrides": {"fertiliser_price": 2.0}}).json()
        assert higher["day"]["net_saving_tnd"] > body["day"]["net_saving_tnd"]
        one_farm = c.post("/api/savings", json={"farm_id": "B", "scenario": "outage"}).json()
        assert [i["farm_id"] for i in one_farm["items"]] == ["B"] and one_farm["scenario"] == "outage"


def test_endpoint_errors():
    with TestClient(app) as c:
        assert c.post("/api/savings", json={"batch_id": "NOPE"}).status_code == 404
        assert c.post("/api/savings", json={"farm_id": "ZZ"}).status_code == 404
        assert c.post("/api/savings", json={"overrides": {"availability_factor": 3}}).status_code == 422
        assert c.post("/api/savings", json={"scenario": "flood"}).status_code == 422
