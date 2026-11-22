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


def test_cors_allows_any_local_dev_port():
    from fastapi.testclient import TestClient
    from app.main import app
    with TestClient(app) as c:
        for origin in ("http://localhost:5173", "http://localhost:5199", "http://127.0.0.1:4173"):
            r = c.get("/api/health", headers={"Origin": origin})
            assert r.headers.get("access-control-allow-origin") == origin
        assert "access-control-allow-origin" not in c.get("/api/health", headers={"Origin": "http://evil.example"}).headers
