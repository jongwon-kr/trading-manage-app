from fastapi.testclient import TestClient

from app.api.main import app
from tests.conftest import make_frame

H = {"X-Internal-Token": "local-dev-token"}


def test_requires_internal_token(service):
    res = TestClient(app).get("/internal/v1/symbols/search", params={"q": "a"})
    assert res.status_code == 401 and res.json()["code"] == "UNAUTHORIZED"


def test_candles_response_shape(service, monkeypatch):
    monkeypatch.setattr(service.fdr, "daily_candles", lambda *a: make_frame(3))
    res = TestClient(app).get("/internal/v1/candles", headers=H,
                              params={"market": "KR_STOCK", "symbol": "005930", "limit": 3})
    body = res.json()
    assert res.status_code == 200
    assert body["symbol"]["pricePrecision"] == 0 and body["source"] == "fdr"
    assert body["candles"][0] == {"time": 1788220800, "open": 100.0, "high": 100.0, "low": 100.0,
                                  "close": 100.0, "volume": 1.0}


def test_error_mapping(service):
    c = TestClient(app)
    r = c.get("/internal/v1/candles", headers=H, params={"market": "KR_STOCK", "symbol": "005930", "interval": "1m"})
    assert r.status_code == 422 and r.json()["code"] == "INTERVAL_NOT_SUPPORTED"
    r = c.get("/internal/v1/symbols/KR_STOCK/999999", headers=H)
    assert r.status_code == 404 and r.json()["code"] == "MARKET_SYMBOL_NOT_FOUND"
    r = c.get("/internal/v1/candles", headers=H, params={"market": "NOPE", "symbol": "x"})
    assert r.status_code == 422 and r.json()["code"] == "MARKET_BAD_REQUEST"
    r = c.get("/internal/v1/candles", headers=H, params={"market": "KR_STOCK", "symbol": "005930", "from": "yesterday"})
    assert r.status_code == 422
