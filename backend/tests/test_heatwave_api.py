import json
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.schemas import HeatwaveResult

MOCK = Path(__file__).resolve().parents[2] / "frontend" / "src" / "mocks" / "post_scenarios_heatwave.json"


@pytest.fixture(scope="module")
def client():
    with TestClient(app) as c:
        yield c


def post(client, **body):
    return client.post("/api/scenarios/heatwave", json=body)


def test_heatwave_scenario_ok_and_valid(client):
    r = post(client, scenario_id="heatwave_outage")
    assert r.status_code == 200
    d = HeatwaveResult.model_validate(r.json())  # response validates against the pydantic model
    assert d.date == "2026-08-26" and d.label.startswith("Summer 2026 heatwave")
    assert d.naive.hours_without_water > 0 and d.qatra.hours_without_water == 0
    assert all(h.grid_kw == 0 for h in d.qatra.hourly if h.outage)
    assert all(0 <= h.basin_m3 <= 3000 for h in d.qatra.hourly)
    assert d.baseline.solar_share == 0 and d.allocation.solar_share > 0


def test_default_scenario_works_too(client):
    d = post(client, scenario_id="default").json()
    assert d["date"] == "2026-07-08" and d["naive"]["hours_without_water"] == 0 and d["qatra"]["hours_without_water"] == 0


def test_unknown_scenario_is_404_and_bad_body_is_422(client):
    assert post(client, scenario_id="nope").status_code == 404
    assert client.post("/api/scenarios/heatwave", json={}).status_code == 422
    assert client.post("/api/scenarios/heatwave", json={"scenario_id": 5}).status_code == 422


def test_mock_is_the_real_response(client):
    real = post(client, scenario_id="heatwave_outage").json()
    mock = json.loads(MOCK.read_text(encoding="utf-8"))
    HeatwaveResult.model_validate(mock)
    assert set(mock) == set(real)
    assert set(mock["allocation"]) == set(real["allocation"])
    assert set(mock["naive"]) == set(mock["qatra"]) == set(real["qatra"])
    assert set(mock["qatra"]["hourly"][0]) == set(real["qatra"]["hourly"][0])
    assert mock == real  # the mock is the real response for the heatwave scenario


def test_dates_are_listed_and_the_default_day_is_the_heatwave(client):
    d = post(client, scenario_id="heatwave_outage").json()
    assert d["date"] == "2026-08-26" and "2026-08-26" in d["dates"] and len(d["dates"]) == 12
    assert d["allocated_m3"] > 0


def test_date_switches_the_day_and_reruns_the_scenario(client):
    a = post(client, scenario_id="heatwave_outage", date="2026-07-20")
    assert a.status_code == 200
    d = HeatwaveResult.model_validate(a.json())
    assert d.date == "2026-07-20" and d.allocation.batch_id == "SSUD-20260720"
    assert d.naive.hours_without_water > 0 and d.qatra.hours_without_water == 0
    other = post(client, scenario_id="heatwave_outage", date="2026-08-27").json()
    assert other["allocation"]["batch_id"] == "SSUD-20260827"
    assert other["qatra"]["solar_kwh"] != d.qatra.solar_kwh  # different weather, different solar


def test_unusable_batch_day_returns_zero_allocated_with_a_reason(client):
    d = post(client, scenario_id="heatwave_outage", date="2026-07-12").json()
    assert d["allocated_m3"] == 0 and d["naive"]["hours_without_water"] == 0
    assert any("no farm can receive it" in w for w in d["allocation"]["warnings"])


def test_bad_dates_are_422(client):
    assert post(client, scenario_id="heatwave_outage", date="2026-07-08").status_code == 422  # no outage that day
    assert post(client, scenario_id="heatwave_outage", date="2026-08-24").status_code == 422
    assert post(client, scenario_id="heatwave_outage", date="26/08/2026").status_code == 422
    assert post(client, scenario_id="nope", date="2026-08-26").status_code == 404
