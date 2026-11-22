import json
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from app.engine import requests as engine
from app.main import app
from app.schemas import WaterRequest

MOCKS = Path(__file__).resolve().parents[2] / "frontend" / "src" / "mocks"


@pytest.fixture(scope="module")
def client():
    with TestClient(app) as c:
        yield c


@pytest.fixture(autouse=True)
def clean():
    engine.reset()
    yield
    engine.reset()


def make(client, farm_id="G", m3=80, date="2026-07-09"):
    return client.post("/api/requests", json={"farm_id": farm_id, "requested_m3": m3, "date": date})


def test_create_returns_a_pending_request(client):
    r = make(client)
    assert r.status_code == 201
    body = r.json()
    assert set(body) == {"id", "farm_id", "requested_m3", "date", "status", "created_at"}
    assert body["id"] == "REQ-001" and body["farm_id"] == "G" and body["requested_m3"] == 80 and body["date"] == "2026-07-09"
    assert body["status"] == "pending" and body["created_at"]
    assert make(client, "I", 150).json()["id"] == "REQ-002"


def test_unknown_farm_is_404(client):
    assert make(client, farm_id="Z").status_code == 404
    assert client.get("/api/requests").json() == []


@pytest.mark.parametrize("m3", [0, -5, -0.1])
def test_requested_m3_must_be_positive(client, m3):
    assert make(client, m3=m3).status_code == 422
    assert client.get("/api/requests").json() == []


@pytest.mark.parametrize("body", [
    {"farm_id": "G", "requested_m3": "lots", "date": "2026-07-09"},
    {"farm_id": "G", "requested_m3": 10, "date": "not a date"},
    {"farm_id": "G", "requested_m3": 10},
    {"requested_m3": 10, "date": "2026-07-09"},
])
def test_bad_bodies_are_422(client, body):
    assert client.post("/api/requests", json=body).status_code == 422


def test_list_and_filter_by_status(client):
    a, b, c = (make(client, f).json()["id"] for f in ("G", "I", "A"))
    client.patch(f"/api/requests/{b}", json={"status": "approved"})
    client.patch(f"/api/requests/{c}", json={"status": "rejected"})
    assert [r["id"] for r in client.get("/api/requests").json()] == [a, b, c]
    assert [r["id"] for r in client.get("/api/requests", params={"status": "pending"}).json()] == [a]
    assert [r["id"] for r in client.get("/api/requests", params={"status": "approved"}).json()] == [b]
    assert [r["id"] for r in client.get("/api/requests", params={"status": "rejected"}).json()] == [c]
    assert client.get("/api/requests", params={"status": "maybe"}).status_code == 422


@pytest.mark.parametrize("decision", ["approved", "rejected"])
def test_pending_to_decided(client, decision):
    req_id = make(client).json()["id"]
    r = client.patch(f"/api/requests/{req_id}", json={"status": decision})
    assert r.status_code == 200 and r.json()["status"] == decision and r.json()["id"] == req_id
    assert client.get("/api/requests").json()[0]["status"] == decision


def test_unknown_id_is_404(client):
    assert client.patch("/api/requests/REQ-999", json={"status": "approved"}).status_code == 404


def test_a_decision_is_final(client):
    req_id = make(client).json()["id"]
    assert client.patch(f"/api/requests/{req_id}", json={"status": "approved"}).status_code == 200
    for decision in ("approved", "rejected"):
        r = client.patch(f"/api/requests/{req_id}", json={"status": decision})
        assert r.status_code == 409 and "already approved" in r.json()["detail"]
    assert client.get("/api/requests").json()[0]["status"] == "approved"


@pytest.mark.parametrize("status", ["pending", "done", "", "APPROVED"])
def test_patch_status_must_be_approved_or_rejected(client, status):
    req_id = make(client).json()["id"]
    assert client.patch(f"/api/requests/{req_id}", json={"status": status}).status_code == 422
    assert client.get("/api/requests").json()[0]["status"] == "pending"


def test_mocks_match_the_schema():
    for name in ("post_requests.json", "patch_requests_id.json"):
        WaterRequest.model_validate(json.loads((MOCKS / name).read_text(encoding="utf-8")))
    for r in json.loads((MOCKS / "requests.json").read_text(encoding="utf-8")):
        WaterRequest.model_validate(r)
