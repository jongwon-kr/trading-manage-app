from datetime import datetime

import pandas as pd
import yfinance as yf

from app.market.models import DAILY_OR_LONGER, Fundamentals, Market, Quote, make_quote
from app.market.normalize import resample, to_ohlcv
from app.market.providers.base import Provider

_YF_INTERVAL = {"1m": "1m", "5m": "5m", "15m": "15m", "30m": "30m", "1h": "1h", "4h": "1h",
                "1d": "1d", "1w": "1wk", "1M": "1mo"}


class YfinanceProvider(Provider):
    """Yahoo Finance(비공식): US 캔들/시세/재무, KR 분봉(.KS/.KQ), 지수(^GSPC ^IXIC ^VIX KRW=X)"""

    name = "yfinance"
    min_interval = 0.5

    def candles(self, ticker: str, interval: str, start: datetime, end: datetime | None) -> pd.DataFrame:
        self.limiter.wait()
        df = yf.Ticker(ticker).history(interval=_YF_INTERVAL[interval], start=start, end=end,
                                       auto_adjust=False, actions=False)
        out = to_ohlcv(df, daily=interval in DAILY_OR_LONGER)
        return resample(out, "4h") if interval == "4h" else out

    def daily_closes(self, tickers: list[str], period: str = "3mo") -> dict[str, pd.DataFrame]:
        """여러 티커 일봉을 한 번에 (지수 스파크라인·시세 계산용)"""
        self.limiter.wait()
        df = yf.download(tickers, period=period, interval="1d", group_by="ticker",
                         auto_adjust=False, progress=False, threads=False)
        out = {}
        for t in tickers:
            if t in df.columns.get_level_values(0):
                out[t] = to_ohlcv(df[t], daily=True)
        return out

    def sector_top(self, key: str, count: int = 15) -> list[dict]:
        """yf.Sector(key) 상위 기업: [{code, name, weight}] (weight = 섹터 내 시총 비중)"""
        self.limiter.wait()
        top = yf.Sector(key).top_companies
        if top is None or top.empty:
            return []
        return [{"code": str(code), "name": row.get("name"), "weight": float(row["market weight"])
                 if "market weight" in row and pd.notna(row["market weight"]) else None}
                for code, row in top.head(count).iterrows()]

    def quotes(self, tickers: dict[str, str], market: Market = Market.US_STOCK, currency: str = "USD",
               key_prefix: str | None = None) -> list[Quote]:
        """tickers: {code: yf_ticker}. 최근 일봉 2개로 현재가/전일종가를 계산한다."""
        frames = self.daily_closes(list(tickers.values()), period="5d")
        out = []
        for code, t in tickers.items():
            df = frames.get(t)
            if df is None or df.empty:
                continue
            last = df.iloc[-1]
            prev_close = float(df["close"].iloc[-2]) if len(df) > 1 else None
            q = make_quote(market, code, float(last["close"]), prev_close, currency,
                           int(df.index[-1].timestamp() * 1000), self.name, open=float(last["open"]),
                           high=float(last["high"]), low=float(last["low"]), volume=float(last["volume"]),
                           acc_trade_volume=float(last["volume"]), delayed=True)
            if key_prefix:
                q.key = f"{key_prefix}:{code}"
            out.append(q)
        return out

    def fundamentals(self, ticker: str, market: Market, code: str) -> Fundamentals:
        self.limiter.wait()
        info = yf.Ticker(ticker).info or {}
        if not info.get("quoteType"):
            return Fundamentals(market=market, code=code, source=self.name)
        dte = info.get("debtToEquity")
        div = info.get("dividendYield")
        return Fundamentals(
            market=market, code=code,
            per=info.get("trailingPE"), pbr=info.get("priceToBook"),
            eps=info.get("trailingEps"), bps=info.get("bookValue"),
            roe=info.get("returnOnEquity"), operating_margin=info.get("operatingMargins"),
            debt_to_equity=dte / 100 if dte is not None else None,  # yfinance 는 % 단위
            dividend_yield=div / 100 if div is not None else None,  # yfinance 1.x 는 % 단위 (0.32 = 0.32%)
            eps_growth=info.get("earningsGrowth"), revenue_growth=info.get("revenueGrowth"),
            market_cap=info.get("marketCap"), sector=info.get("sector"),
            source=self.name,
        )

    def screen(self, name: str, count: int) -> list[Quote]:
        """name: day_gainers | day_losers | most_actives"""
        self.limiter.wait()
        res = yf.screen(name, count=count) or {}
        out = []
        for x in res.get("quotes", []):
            price = x.get("regularMarketPrice")
            if price is None:
                continue
            out.append(make_quote(
                Market.US_STOCK, x["symbol"], float(price), x.get("regularMarketPreviousClose"), "USD",
                int(x.get("regularMarketTime", 0)) * 1000, self.name, name=x.get("shortName"),
                open=x.get("regularMarketOpen"), high=x.get("regularMarketDayHigh"),
                low=x.get("regularMarketDayLow"), volume=x.get("regularMarketVolume"), delayed=True))
        return out
