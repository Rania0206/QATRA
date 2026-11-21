import json
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.schemas import SoilSimulation

MOCK = Path(__file__).resolve().parents[2] / "frontend" / "src" / "mocks" / "post_soil_simulate.json"
LOW_EC_BATCH = "SSUD-20260713"  # EC 2.67 dS/m: low enough for alfalfa to be managed
MEDIAN_BATCH = "SSUD-20260708"  # EC 3.66 dS/m


@pytest.fixture(scope="module")
def client():
    with TestClient(app) as c:
        yield c


def post(client, **body):
    return client.post("/api/soil/simulate", json=body)


def test_farm_a_naive_crosses_and_qatra_does_not(client):
    r = post(client, farm_id="A", batch_id=LOW_EC_BATCH)
    assert r.status_code == 200
    d = SoilSimulation.model_validate(r.json())  # response validates against the pydantic model
    assert d.ecw == 2.67 and d.threshold_ece == 2.0 and d.crop == "alfalfa"
    assert d.naive.first_year_over is not None
    assert d.qatra.first_year_over is None
    assert d.years == list(range(31))
    assert len(d.naive.series) == len(d.qatra.series) == 31
    assert d.qatra.series[0] == d.naive.series[0] == 1.9
    assert max(d.qatra.series) <= d.threshold_ece
    assert d.qatra.water_used_m3_season > d.naive.water_used_m3_season  # leaching costs water
    assert d.naive.yield_loss_pct_30y > 0 and d.qatra.yield_loss_pct_30y == 0


def test_too_saline_batch_is_flagged_not_hidden(client):
    d = post(client, farm_id="A", batch_id=MEDIAN_BATCH).json()  # EC 3.66: LR 0.58 > max leaching 0.5
    assert d["qatra"]["first_year_over"] is not None
    assert "exceeds the maximum leaching fraction" in d["warning"]


def test_legacy_fields_follow_the_qatra_curve(client):
    d = post(client, farm_id="A", batch_id=LOW_EC_BATCH, days=60).json()  # `days` accepted
    assert d["leaching_fraction"] == d["qatra"]["leaching_fraction"]
    assert [p["ece"] for p in d["series"]] == d["qatra"]["series"]
    assert [p["day"] for p in d["series"]][:3] == [0, 365, 730]


def test_yield_loss_is_null_without_a_published_slope(client):
    for farm in ("B", "G"):  # olive, oat_fodder: slope missing in crop_salt_tolerance.csv
        d = post(client, farm_id=farm, batch_id=LOW_EC_BATCH).json()
        assert d["naive"]["yield_loss_pct_30y"] is None and d["qatra"]["yield_loss_pct_30y"] is None
        assert d["tag"]["status"] == "TO_VERIFY"
    d = post(client, farm_id="J", batch_id=LOW_EC_BATCH).json()  # barley has a slope (5.0)
    assert d["naive"]["yield_loss_pct_30y"] == 0.0


def test_yield_loss_formula(client):
    d = post(client, farm_id="A", batch_id=LOW_EC_BATCH).json()
    expected = min(max(7.3 * (d["naive"]["series"][-1] - 2.0), 0), 100)  # alfalfa slope 7.3
    assert d["naive"]["yield_loss_pct_30y"] == pytest.approx(expected, abs=0.01)
    extreme = post(client, farm_id="A", batch_id=LOW_EC_BATCH, ecw=20, soil_ece=30).json()
    assert extreme["naive"]["yield_loss_pct_30y"] == 100.0  # clipped


def test_overrides(client):
    d = post(client, farm_id="A", batch_id=LOW_EC_BATCH, ecw=1.0, soil_ece=1.5, years=10).json()
    assert d["ecw"] == 1.0 and d["years"] == list(range(11))
    assert d["naive"]["series"][0] == 1.5


def test_blocked_crop_is_warned(client):
    d = post(client, farm_id="C", batch_id=LOW_EC_BATCH).json()
    assert "cannot receive treated wastewater" in d["warning"]


@pytest.mark.parametrize("body,status", [
    ({"farm_id": "Z", "batch_id": LOW_EC_BATCH}, 404),
    ({"farm_id": "A", "batch_id": "nope"}, 404),
    ({"farm_id": "A", "batch_id": LOW_EC_BATCH, "years": 0}, 422),
    ({"farm_id": "A", "batch_id": LOW_EC_BATCH, "years": 101}, 422),
    ({"farm_id": "A", "batch_id": LOW_EC_BATCH, "ecw": 0}, 422),
    ({"farm_id": "A", "batch_id": LOW_EC_BATCH, "soil_ece": -1}, 422),
    ({"farm_id": "A"}, 422),
])
def test_errors(client, body, status):
    assert client.post("/api/soil/simulate", json=body).status_code == status


def test_mock_keys_match_the_real_response(client):
    real = post(client, farm_id="A", batch_id=LOW_EC_BATCH).json()
    mock = json.loads(MOCK.read_text(encoding="utf-8"))
    assert set(mock) == set(real)
    assert set(mock["naive"]) == set(real["naive"]) and set(mock["qatra"]) == set(real["qatra"])
    assert mock == real  # the mock is the real response for farm A / SSUD-20260713
