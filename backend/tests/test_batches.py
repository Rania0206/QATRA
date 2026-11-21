import pytest
from fastapi.testclient import TestClient

from app.engine.batches import get_batch, list_batches
from app.main import app
from app.schemas import Batch


@pytest.fixture(scope="module")
def client():
    with TestClient(app) as c:
        yield c


def test_list_returns_60_batches_newest_first():
    batches = list_batches()
    assert len(batches) == 60
    dates = [b.date for b in batches]
    assert dates == sorted(dates, reverse=True)
    assert batches[0].id == "SSUD-20260829"


def test_plant_filter():
    assert len(list_batches("w27944541")) == 60
    assert list_batches("unknown-plant") == []


def test_get_batch_maps_real_values():
    b = get_batch("SSUD-20260701")
    assert b is not None
    assert b.plant_id == "w27944541"
    assert b.date == "2026-07-01"
    assert b.volume_m3 == 1680
    assert b.status == "pending_rules"
    assert b.tag.status == "SIMULATED" and b.tag.source == "data/simulated/sim_batches"
    by_type = {a.type: a for a in b.analyses}
    assert by_type["physico_chemical"].values["EC_dS_m"] == 3.34
    assert by_type["parasite_eggs"].values["helminth_eggs_per_L"] == 0.42
    assert "metals" not in by_type  # no metal columns in the data: not invented


def test_get_unknown_batch_is_none():
    assert get_batch("NOPE") is None


def test_api_list(client):
    r = client.get("/api/batches")
    assert r.status_code == 200
    body = r.json()
    assert len(body) == 60
    for b in body:
        Batch.model_validate(b)


def test_api_get_one_and_404(client):
    assert client.get("/api/batches/SSUD-20260808").json()["id"] == "SSUD-20260808"
    r = client.get("/api/batches/NOPE")
    assert r.status_code == 404
    assert "NOPE" in r.json()["detail"]
