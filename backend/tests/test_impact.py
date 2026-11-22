import json
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from app.engine.batches import list_batches
from app.engine.impact import ImpactSummary
from app.main import app

MOCK = Path(__file__).resolve().parents[2] / "frontend" / "src" / "mocks" / "impact.json"


@pytest.fixture(scope="module")
def body():
    with TestClient(app) as c:
        r = c.get("/api/impact")
        assert r.status_code == 200
        return r.json()


def test_shape_and_ranges(body):
    ImpactSummary.model_validate(body)
    assert body["tww_allocated_m3"] > 0 and body["fresh_water_saved_m3"] > 0
    assert 0 <= body["solar_share"] <= 1 and body["energy_kwh"] > 0
    assert 0 < body["small_farms_served"] <= body["farms_served"] <= 10
    assert 0 < body["batches_blocked"] < len(list_batches())
    assert body["tag"]["status"] == "ESTIMATE"


def test_period_covers_the_batches(body):
    dates = sorted(b.date[:10] for b in list_batches())
    assert body["period"] == f"{dates[0]}/{dates[-1]}"


def test_no_co2_figure_while_the_emission_factor_is_unsourced(body):
    assert body["co2_avoided_kg"] is None


def test_totals_only_no_personal_data(body):
    text = json.dumps(body)
    assert "farm_id" not in text and "phone" not in text and "name" not in text


def test_mock_matches_the_response(body):
    assert json.loads(MOCK.read_text(encoding="utf-8")) == body
