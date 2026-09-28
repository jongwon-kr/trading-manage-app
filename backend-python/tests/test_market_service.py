import pytest

from app.core.cache import set_json
from app.core.errors import BadRequest, IntervalNotSupported, SymbolNotFound
from app.market.models import Market
from app.market.normalize import now_ms
from tests.conftest import make_frame


def _fail(*_):
    raise RuntimeError("provider down")


def test_kr_daily_falls_back_to_pykrx_when_fdr_fails(service, monkeypatch):
    monkeypatch.setattr(service.fdr, "daily_candles", _fail)
    monkeypatch.setattr(service.pykrx, "daily_candles", lambda *a: make_frame(10))
    df, source, delayed = service.get_candles(Market.KR_STOCK, "005930", "1d", limit=5)
    assert source == "pykrx" and not delayed
    assert len(df) == 5 and df["close"].iloc[-1] == 109


def test_second_call_is_served_from_cache(service, monkeypatch):
    calls = []
    monkeypatch.setattr(service.fdr, "daily_candles", lambda *a: calls.append(1) or make_frame(10))
    service.get_candles(Market.KR_STOCK, "005930", "1d", limit=5)
    service.get_candles(Market.KR_STOCK, "005930", "1d", limit=5)
    assert len(calls) == 1


def test_kr_weekly_is_resampled_from_daily(service, monkeypatch):
    monkeypatch.setattr(service.fdr, "daily_candles", lambda *a: make_frame(14, start="2026-09-07"))  # 월요일 시작
    df, _, _ = service.get_candles(Market.KR_STOCK, "005930", "1w", limit=10)
    assert len(df) == 2 and df.index[0].day_name() == "Monday"


def test_kosdaq_symbol_uses_kq_suffix_for_yfinance(service, monkeypatch):
    seen = []
    monkeypatch.setattr(service.yf, "candles", lambda t, *a: seen.append(t) or make_frame(3, freq="5min"))
    service.get_candles(Market.KR_STOCK, "247540", "5m", limit=3)
    assert seen == ["247540.KQ"]


def test_validation_errors(service):
    with pytest.raises(IntervalNotSupported):
        service.get_candles(Market.KR_STOCK, "005930", "1m")
    with pytest.raises(SymbolNotFound):
        service.get_candles(Market.KR_STOCK, "999999", "1d")
    with pytest.raises(BadRequest):
        service.get_candles(Market.KR_STOCK, "005930", "1d", limit=5000)
    with pytest.raises(BadRequest):
        service.get_fundamentals(Market.CRYPTO, "KRW-BTC")
    with pytest.raises(BadRequest):
        service.get_quotes(["NOPE"])


def test_crypto_quote_prefers_fresh_streamer_snapshot(service, monkeypatch):
    snap = {"key": "CRYPTO:KRW-BTC", "market": "CRYPTO", "code": "KRW-BTC", "price": 1.0, "change": "EVEN",
            "changePrice": 0, "changeRate": 0, "currency": "KRW", "ts": now_ms(), "source": "upbit-ws"}
    set_json("quote:CRYPTO:KRW-BTC", snap, 60)
    monkeypatch.setattr(service.upbit, "quotes", lambda codes: pytest.fail("스냅샷이 신선하면 REST 를 호출하지 않는다"))
    q = service.get_quote(Market.CRYPTO, "KRW-BTC")
    assert q.source == "upbit-ws" and q.name == "비트코인"


def test_search_ranking(service):
    assert [s.code for s in service.search("005930", None, 5)] == ["005930"]
    assert service.search("btc", None, 5)[0].code == "KRW-BTC"  # 코드(BTC) 정확 일치 우선
    assert [s.code for s in service.search("비트", Market.CRYPTO, 5)] == ["KRW-BTC", "KRW-BTT"]
    assert service.search("  ", None, 5) == []
