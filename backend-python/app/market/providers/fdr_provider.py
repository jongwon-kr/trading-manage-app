from datetime import date

import FinanceDataReader as fdr
import pandas as pd

from app.market.normalize import to_ohlcv
from app.market.providers.base import Provider


class FdrProvider(Provider):
    """FinanceDataReader: KR/US 일봉, KRX 상장목록(당일 시세 스냅샷 포함)"""

    name = "fdr"
    min_interval = 0.2

    def daily_candles(self, code: str, start: date, end: date | None) -> pd.DataFrame:
        self.limiter.wait()
        df = fdr.DataReader(code, start.isoformat(), end.isoformat() if end else None)
        return to_ohlcv(df, daily=True)

    def krx_listing(self) -> pd.DataFrame:
        """컬럼: Code, Name, Market(KOSPI/KOSDAQ/KONEX), Close, Changes, ChagesRatio, Open, High, Low, Volume, Amount, Marcap ..."""
        self.limiter.wait()
        return fdr.StockListing("KRX")
