from fastapi.testclient import TestClient

from app.api.main import app


def test_health_reports_redis_up(fake_redis):
    res = TestClient(app).get("/health")
    assert res.status_code == 200
    assert res.json() == {"status": "UP", "redis": True, "streamerAlive": False}
