from datetime import datetime, timezone

import pandas as pd

from app.market.models import Market, Quote
from app.market.normalize import to_ohlcv
from app.market.providers.base import Provider

_BASE = "https://api.upbit.com/v1"
_PAGE = 200  # Upbit 캔들 1회 최대 개수
_MAX_PAGES = 10
_TICKER_CHUNK = 100

_CANDLE_PATH = {"1m": "minutes/1", "5m": "minutes/5", "15m": "minutes/15", "30m": "minutes/30",
                "1h": "minutes/60", "4h": "minutes/240", "1d": "days", "1w": "weeks", "1M": "months"}


class UpbitProvider(Provider):
    """Upbit 공개 시세 API (KRW 마켓). quotation 요청 제한 ~10회/초 → 8회/초로 제한"""

    name = "upbit"
    min_interval = 0.125

    def markets(self) -> list[dict]:
        return [m for m in self.get_json(f"{_BASE}/market/all", isDetails="true")
                if m["market"].startswith("KRW-")]

    def candles(self, code: str, interval: str, start: datetime | None, end: datetime | None,
                limit: int) -> pd.DataFrame:
        """최신 → 과거 방향으로 페이지를 넘기며 limit 개(또는 start 이전까지) 수집"""
        rows: list[dict] = []
        to = end
        for _ in range(_MAX_PAGES):
            params = {"market": code, "count": min(_PAGE, limit - len(rows))}
            if to is not None:
                params["to"] = to.astimezone(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
            page = self.get_json(f"{_BASE}/candles/{_CANDLE_PATH[interval]}", **params)
            if not page:
                break
            rows += page
            oldest = datetime.fromisoformat(page[-1]["candle_date_time_utc"]).replace(tzinfo=timezone.utc)
            if len(rows) >= limit or len(page) < params["count"] or (start and oldest <= start):
                break
            to = oldest
        if not rows:
            return to_ohlcv(pd.DataFrame())
        df = pd.DataFrame({
            "open": [r["opening_price"] for r in rows],
            "high": [r["high_price"] for r in rows],
            "low": [r["low_price"] for r in rows],
            "close": [r["trade_price"] for r in rows],
            "volume": [r["candle_acc_trade_volume"] for r in rows],
        }, index=pd.to_datetime([r["candle_date_time_utc"] for r in rows], utc=True))
        out = to_ohlcv(df)
        if start is not None:
            out = out[out.index >= start]
        return out

    def tickers(self, codes: list[str]) -> list[dict]:
        out: list[dict] = []
        for i in range(0, len(codes), _TICKER_CHUNK):
            out += self.get_json(f"{_BASE}/ticker", markets=",".join(codes[i:i + _TICKER_CHUNK]))
        return out

    def quotes(self, codes: list[str]) -> list[Quote]:
        return [ticker_to_quote(t, self.name) for t in self.tickers(codes)]


def ticker_to_quote(t: dict, source: str) -> Quote:
    """Upbit ticker(REST/WebSocket 공통 필드) → Quote. 전일 종가는 UTC 0시 기준."""
    code = t.get("market") or t.get("code")
    return Quote(
        key=f"{Market.CRYPTO.value}:{code}", market=Market.CRYPTO, code=code,
        price=t["trade_price"], open=t.get("opening_price"), high=t.get("high_price"), low=t.get("low_price"),
        prev_close=t.get("prev_closing_price"), change=t.get("change", "EVEN"),
        change_price=t.get("signed_change_price", 0.0), change_rate=t.get("signed_change_rate", 0.0),
        volume=t.get("acc_trade_volume_24h"), acc_trade_volume=t.get("acc_trade_volume"),
        trade_value=t.get("acc_trade_price_24h"), currency="KRW",
        ts=int(t.get("trade_timestamp") or t.get("timestamp") or 0), source=source,
    )
