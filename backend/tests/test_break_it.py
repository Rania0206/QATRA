"""B-04c "break it": a judge raises a farm's soil salinity; the soil curves and the allocator follow."""
import pytest
from fastapi.testclient import TestClient

from app.engine.plan import plan
from app.main import app
from app.schemas import Allocation, SoilSimulation

LIMITED = "SSUD-20260827"  # 700 m3: smaller than the total need, so water a farm cannot take goes to the others


@pytest.fixture(scope="module")
def client():
    with TestClient(app) as c:
        yield c


def volumes(alloc):
    return {i.farm_id: i.m3 for i in alloc.items}


def test_no_override_changes_nothing():
    assert volumes(plan(LIMITED)) == volumes(plan(LIMITED, soil_ece=None)) == volumes(plan(LIMITED, soil_ece={}))


def test_salty_soil_takes_the_farm_out_and_the_others_share_its_water():
    before, after = volumes(plan(LIMITED)), volumes(plan(LIMITED, soil_ece={"A": 5.0}))
    assert before["A"] > 0 and after["A"] == 0
    assert all(after[f] > before[f] for f in "BDEFGHIJ")  # every farm that can receive water gets more
    assert after["C"] == 0  # blocked by law, never receives the freed water
    assert sum(after.values()) <= 700 + 0.5


def test_a_small_rise_keeps_the_farm_but_it_is_limited_or_conditional():
    a = {i.farm_id: i for i in plan(LIMITED, soil_ece={"A": 1.8}).items}["A"]
    assert a.status in ("conditional", "capped")


def test_only_the_named_farm_is_changed():
    before, after = volumes(plan(LIMITED)), volumes(plan(LIMITED, soil_ece={"A": 5.0}))
    assert plan(LIMITED, soil_ece={"A": 5.0}).items[1].farm_id == "B"
    assert after["B"] >= before["B"]


def test_api_allocate_accepts_the_override(client):
    base = client.post("/api/allocate", json={"batch_id": LIMITED}).json()
    r = client.post("/api/allocate", json={"batch_id": LIMITED, "soil_ece": {"A": 6.0}})
    assert r.status_code == 200
    Allocation.model_validate(r.json())
    a = {i["farm_id"]: i["m3"] for i in r.json()["items"]}
    assert a["A"] == 0 and a["A"] < {i["farm_id"]: i["m3"] for i in base["items"]}["A"]


@pytest.mark.parametrize("bad", [{"A": -1}, {"A": 31}])
def test_api_allocate_rejects_values_out_of_range(client, bad):
    assert client.post("/api/allocate", json={"batch_id": LIMITED, "soil_ece": bad}).status_code == 422


def test_soil_response_reports_the_starting_salinity(client):
    farm = client.get("/api/farms").json()
    a = next(f for f in farm if f["id"] == "A")
    plain = client.post("/api/soil/simulate", json={"farm_id": "A", "batch_id": "SSUD-20260713"}).json()
    assert plain["soil_ece"] == a["soil_ece"]
    raised = client.post("/api/soil/simulate", json={"farm_id": "A", "batch_id": "SSUD-20260713", "soil_ece": 4.5}).json()
    SoilSimulation.model_validate(raised)
    assert raised["soil_ece"] == 4.5 and raised["naive"]["series"][0] == 4.5 and raised["qatra"]["series"][0] == 4.5
    assert raised["naive"]["series"][-1] > plain["naive"]["series"][-1]  # a saltier start ends saltier
