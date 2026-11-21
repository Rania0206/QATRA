from fastapi.testclient import TestClient

from app.main import app


def test_health_lists_datasets():
    with TestClient(app) as client:
        r = client.get("/api/health")
    assert r.status_code == 200
    body = r.json()
    assert body["status"] == "ok"
    assert body["datasets"]
    assert not body["errors"], body["errors"]
