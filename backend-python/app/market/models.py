from enum import Enum

from pydantic import BaseModel, ConfigDict
from pydantic.alias_generators import to_camel


class CamelModel(BaseModel):
    """모든 외부 payload 는 camelCase 로 직렬화한다 (Java·Frontend 계약)."""

    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

    def dump(self) -> dict:
        return self.model_dump(mode="json", by_alias=True)


class Market(str, Enum):
    KR_STOCK = "KR_STOCK"
    US_STOCK = "US_STOCK"
    CRYPTO = "CRYPTO"


# 지원 interval 과 봉 길이(초). 1w/1M 은 근사값(캐시·기간 계산용)
INTERVAL_SECONDS = {
    "1m": 60, "5m": 300, "15m": 900, "30m": 1800, "1h": 3600, "4h": 14400,
    "1d": 86400, "1w": 604800, "1M": 2_592_000,
}
DAILY_OR_LONGER = {"1d", "1w", "1M"}

SUPPORTED_INTERVALS = {
    Market.KR_STOCK: ["5m", "15m", "30m", "1h", "1d", "1w", "1M"],  # 분봉은 yfinance 지연·최근 60일
    Market.US_STOCK: ["1m", "5m", "15m", "30m", "1h", "4h", "1d", "1w", "1M"],
    Market.CRYPTO: ["1m", "5m", "15m", "30m", "1h", "4h", "1d", "1w", "1M"],
}


class SymbolInfo(CamelModel):
    market: Market
    exchange: str
    code: str
    name: str
    name_en: str | None = None
    currency: str
    sector: str | None = None
    # KR 0, US 2, CRYPTO 는 가격대별로 달라 None (클라이언트가 크기로 결정)
    price_precision: int | None = None
    warning: str | None = None  # Upbit 투자유의 등

    @property
    def key(self) -> str:
        return f"{self.market.value}:{self.code}"


class Quote(CamelModel):
    key: str
    market: Market
    code: str
    name: str | None = None
    price: float
    open: float | None = None
    high: float | None = None
    low: float | None = None
    prev_close: float | None = None
    change: str  # RISE | EVEN | FALL
    change_price: float  # 부호 포함
    change_rate: float  # 소수 (−0.015 = −1.5%)
    volume: float | None = None
    acc_trade_volume: float | None = None  # 당일 누적 거래량 (실시간 봉 거래량 누적용)
    trade_value: float | None = None
    currency: str
    ts: int  # epoch ms
    delayed: bool = False
    source: str


class Fundamentals(CamelModel):
    market: Market
    code: str
    per: float | None = None
    pbr: float | None = None
    eps: float | None = None
    bps: float | None = None
    roe: float | None = None  # 소수 (0.12 = 12%)
    operating_margin: float | None = None  # 소수
    debt_to_equity: float | None = None  # 배수 (0.3 = 30%)
    dividend_yield: float | None = None  # 소수
    eps_growth: float | None = None  # 전년 대비, 소수
    revenue_growth: float | None = None  # 전년 대비, 소수
    market_cap: float | None = None
    sector: str | None = None
    as_of: str | None = None
    source: str


def make_quote(market: Market, code: str, price: float, prev_close: float | None, currency: str,
               ts: int, source: str, **kw) -> Quote:
    """전일 종가 기준으로 change/changePrice/changeRate 를 계산해 Quote 를 만든다."""
    change_price = price - prev_close if prev_close else 0.0
    change_rate = change_price / prev_close if prev_close else 0.0
    change = "RISE" if change_price > 0 else "FALL" if change_price < 0 else "EVEN"
    return Quote(key=f"{market.value}:{code}", market=market, code=code, price=price, prev_close=prev_close,
                 change=change, change_price=change_price, change_rate=change_rate, currency=currency,
                 ts=ts, source=source, **kw)
