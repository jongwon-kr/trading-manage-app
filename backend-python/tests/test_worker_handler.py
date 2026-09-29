import json

import numpy as np
import pandas as pd
import pytest

from app.market.models import Fundamentals, Market
from app.worker.handler import AnalysisHandler


def _message(**kw):
    base = {"requestId": "req-1", "userEmail": "a@b.c", "requestedAt": [2026, 9, 28, 10, 0, 0, 123456789]}
    return {**base, **kw}


def _saved(fake_redis, rid="req-1"):
    return json.loads(fake_redis.get(f"analysis:{rid}"))


def _daily(n=300, drift=0.002):
    rng = np.random.default_rng(7)
    close = 100 * np.exp(np.cumsum(rng.normal(drift, 0.01, n)))
    idx = pd.date_range("2025-01-01", periods=n, freq="D", tz="UTC")
    return pd.DataFrame({"open": close, "high": close * 1.01, "low": close * 0.99, "close": close,
                         "volume": 1e5}, index=idx)


def _stub_market_data(service, monkeypatch):
    df = _daily()
    monkeypatch.setattr(service, "get_candles", lambda *a, **k: (df, "stub", False))
    monkeypatch.setattr(service, "get_index_daily", lambda *a, **k: _daily(drift=0.001))
    monkeypatch.setattr(service, "get_fundamentals", lambda m, c: Fundamentals(market=m, code=c, per=12, pbr=1.1,
                                                                             roe=0.1, source="stub"))
    monkeypatch.setattr(service, "kr_breadth", lambda: 0.55)
    monkeypatch.setattr(service, "crypto_breadth", lambda: 0.5)
    monkeypatch.setattr(service, "fear_greed", lambda: 50)


def test_strategy_success_result_is_camel_case_v2(service, fake_redis, monkeypatch):
    _stub_market_data(service, monkeypatch)
    AnalysisHandler().handle_analysis_request(_message(analysisType="STRATEGY", symbol="005930", market="KR_STOCK"))
    r = _saved(fake_redis)
    assert r["status"] == "SUCCESS" and r["schemaVersion"] == 3 and r["requestId"] == "req-1"
    assert r["name"] == "삼성전자" and r["signal"] in ("BUY", "HOLD", "SELL")
    assert {g["key"] for g in r["groups"]} == {"technical", "fundamental", "regime"}
    assert r["risk"]["stopLoss"] < r["risk"]["entry"]
    assert 50 + sum(f["contribution"] for g in r["groups"] for f in g["factors"]) == pytest.approx(r["score"], abs=0.01)
    assert fake_redis.ttl("analysis:req-1") > 0


def test_technical_legacy_request_infers_market_and_limits_groups(service, fake_redis, monkeypatch):
    _stub_market_data(service, monkeypatch)
    AnalysisHandler().handle_analysis_request(_message(analysisType="TECHNICAL", symbol="AAPL", market="STOCK",
                                                       timeframe="1d"))
    r = _saved(fake_redis)
    assert r["status"] == "SUCCESS" and r["market"] == Market.US_STOCK.value
    assert [g["key"] for g in r["groups"]] == ["technical"]


def test_invalid_type_still_writes_failed(fake_redis):
    AnalysisHandler().handle_analysis_request(_message(analysisType="FOO"))
    r = _saved(fake_redis)
    assert r["status"] == "FAILED" and "잘못된 분석 요청" in r["errorMessage"]


def test_domain_error_is_reported(service, fake_redis):
    AnalysisHandler().handle_analysis_request(_message(analysisType="STRATEGY", symbol="999999", market="KR_STOCK"))
    r = _saved(fake_redis)
    assert r["status"] == "FAILED" and "999999" in r["errorMessage"]


def test_market_trend_requires_market_code(service, fake_redis, monkeypatch):
    _stub_market_data(service, monkeypatch)
    AnalysisHandler().handle_analysis_request(_message(analysisType="MARKET_TREND", market="STOCK"))
    assert _saved(fake_redis)["status"] == "FAILED"
    AnalysisHandler().handle_analysis_request(_message(requestId="req-2", analysisType="MARKET_TREND",
                                                       market="US_STOCK"))
    r = _saved(fake_redis, "req-2")
    assert r["status"] == "SUCCESS" and r["groups"][0]["key"] == "regime"
