"""A-03c: GET /api/farms, GET /api/farms/{id}/compatibility, GET /api/compatibility."""
from fastapi.testclient import TestClient

from app.engine.compatibility import AllFarmsCompatibility, Compatibility, default_batch
from app.main import app
from app.schemas import Farm
from app.store import init_store

init_store()

GOOD = "SSUD-20260708"
LATEST_USABLE = "SSUD-20260829"  # newest batch whose status is not analysis_invalid


def test_get_farms():
    with TestClient(app) as c:
        r = c.get("/api/farms")
    assert r.status_code == 200
    farms = [Farm.model_validate(f) for f in r.json()]
    assert [f.id for f in farms] == list("ABCDEFGHIJ")
    assert all(f.tag.status == "SIMULATED" for f in farms)


def test_default_batch_skips_analysis_invalid():
    b = default_batch()
    assert b.id == LATEST_USABLE and b.status != "analysis_invalid"


def test_farm_compatibility_a_b_c():
    with TestClient(app) as c:
        got = {f: c.get(f"/api/farms/{f}/compatibility?batch_id={GOOD}") for f in "ABC"}
    assert all(r.status_code == 200 for r in got.values())
    body = {f: Compatibility.model_validate(r.json()) for f, r in got.items()}
    assert body["A"].decision == "conditional"
    assert body["B"].decision == "compatible"
    assert body["C"].decision == "blocked"
    assert any(r.rule_id == "R-RAW-EATEN" and not r.passed for r in body["C"].results)


def test_farm_compatibility_errors_and_default():
    with TestClient(app) as c:
        assert c.get(f"/api/farms/Z/compatibility?batch_id={GOOD}").status_code == 404
        assert c.get("/api/farms/A/compatibility?batch_id=NOPE").status_code == 404
        r = c.get("/api/farms/A/compatibility")
    assert r.status_code == 200 and r.json()["batch_id"] == LATEST_USABLE


def test_all_farms_compatibility():
    with TestClient(app) as c:
        r = c.get(f"/api/compatibility?batch_id={GOOD}")
        default = c.get("/api/compatibility")
        missing = c.get("/api/compatibility?batch_id=NOPE")
    assert r.status_code == 200 and default.status_code == 200 and missing.status_code == 404
    body = AllFarmsCompatibility.model_validate(r.json())
    assert body.batch_id == GOOD and body.batch_status == "compliant"
    assert [i.farm_id for i in body.items] == list("ABCDEFGHIJ")
    dec = {i.farm_id: i.decision for i in body.items}
    assert (dec["A"], dec["B"], dec["C"]) == ("conditional", "compatible", "blocked")
    assert default.json()["batch_id"] == LATEST_USABLE


def test_all_farms_blocked_on_expired_batch():
    with TestClient(app) as c:
        body = AllFarmsCompatibility.model_validate(c.get("/api/compatibility?batch_id=SSUD-20260712").json())
    assert body.batch_status == "analysis_invalid"
    assert {i.decision for i in body.items} == {"blocked"}
