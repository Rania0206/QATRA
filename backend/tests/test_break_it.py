"""B-04c "break it": a judge raises a farm's soil salinity; the soil curves and the allocator follow."""
import pytest
from fastapi.testclient import TestClient

from app.engine.plan import plan
from app.main import app
from app.schemas import Allocation, SoilSimulation

LIMITED = "SSUD-20260827"
VOL = 250.0  # the judge panel plans this batch as if it held 250 m3: less than the total need (about 390 m3), so the sharing binds


@pytest.fixture(scope="module")
def client():
    with TestClient(app) as c:
        yield c


def run(**kw):
    return plan(LIMITED, volume_m3=VOL, **kw)


def volumes(alloc):
    return {i.farm_id: i.m3 for i in alloc.items}


def test_no_override_changes_nothing():
    assert volumes(run()) == volumes(run(soil_ece=None)) == volumes(run(soil_ece={}))


def test_salty_soil_takes_the_farm_out_and_the_others_share_its_water():
    before, after = volumes(run()), volumes(run(soil_ece={"A": 5.0}))
    assert before["A"] > 0 and after["A"] == 0
    assert all(after[f] > before[f] for f in "BDEFGHIJ")  # every farm that can receive water gets more
    assert after["C"] == 0  # blocked by law, never receives the freed water
    assert sum(after.values()) <= VOL + 0.5


def test_a_small_rise_keeps_the_farm_but_it_is_limited_or_conditional():
    a = {i.farm_id: i for i in run(soil_ece={"A": 1.8}).items}["A"]
    assert a.status in ("conditional", "capped")


def test_only_the_named_farm_is_changed():
    before, after = volumes(run()), volumes(run(soil_ece={"A": 5.0}))
    assert all(after[f] >= before[f] for f in after if f != "A")  # nobody else loses


def test_api_allocate_accepts_the_override(client):
    base = client.post("/api/allocate", json={"batch_id": LIMITED, "volume_m3": VOL}).json()
    r = client.post("/api/allocate", json={"batch_id": LIMITED, "volume_m3": VOL, "soil_ece": {"A": 6.0}})
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


def test_volume_override_changes_the_plan_but_not_the_stored_batch(client):
    from app.engine.batches import get_batch
    stored = get_batch(LIMITED).volume_m3
    small = client.post("/api/allocate", json={"batch_id": LIMITED, "volume_m3": 100}).json()
    assert sum(i["m3"] for i in small["items"]) <= 100.5
    assert get_batch(LIMITED).volume_m3 == stored


@pytest.mark.parametrize("v", [0, -5, 100001])
def test_volume_override_must_be_positive_and_reasonable(client, v):
    assert client.post("/api/allocate", json={"batch_id": LIMITED, "volume_m3": v}).status_code == 422
