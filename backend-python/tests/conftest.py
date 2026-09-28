import fakeredis
import pandas as pd
import pytest

from app.core import redis_client


@pytest.fixture
def fake_redis():
    """모든 테스트는 실제 Redis 대신 fakeredis 를 사용한다."""
    client = fakeredis.FakeRedis()
    redis_client.set_redis(client)
    yield client
    redis_client.set_redis(None)


@pytest.fixture
def service(fake_redis, monkeypatch):
    """네트워크 없이 쓰는 MarketDataService: 심볼 마스터를 소규모 목록으로 대체한다."""
    from app.market import service as service_module
    from app.market.models import Market, SymbolInfo

    svc = service_module.MarketDataService()
    symbols = [
        SymbolInfo(market=Market.KR_STOCK, exchange="KOSPI", code="005930", name="삼성전자", currency="KRW", price_precision=0),
        SymbolInfo(market=Market.KR_STOCK, exchange="KOSDAQ", code="247540", name="에코프로비엠", currency="KRW", price_precision=0),
        SymbolInfo(market=Market.US_STOCK, exchange="NASDAQ", code="AAPL", name="Apple Inc.", currency="USD", price_precision=2),
        SymbolInfo(market=Market.CRYPTO, exchange="UPBIT", code="KRW-BTC", name="비트코인", name_en="Bitcoin", currency="KRW"),
        SymbolInfo(market=Market.CRYPTO, exchange="UPBIT", code="KRW-BTT", name="비트토렌트", name_en="BitTorrent", currency="KRW"),
    ]
    for m in Market:
        svc.symbols._by_market[m] = {s.code.upper(): s for s in symbols if s.market == m}
    monkeypatch.setattr(service_module, "_service", svc)
    return svc


def make_frame(n: int = 5, start: str = "2026-09-01", freq: str = "D", close: float = 100.0) -> pd.DataFrame:
    idx = pd.date_range(start, periods=n, freq=freq, tz="UTC", name="time")
    closes = [close + i for i in range(n)]
    return pd.DataFrame({"open": closes, "high": closes, "low": closes, "close": closes, "volume": [1.0] * n},
                        index=idx)
