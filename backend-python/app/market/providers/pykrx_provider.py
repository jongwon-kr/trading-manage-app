from datetime import date

import pandas as pd

from app.market.normalize import to_ohlcv
from app.market.providers.base import Provider

_RENAME = {"시가": "open", "고가": "high", "저가": "low", "종가": "close", "거래량": "volume"}


class PykrxProvider(Provider):
    """pykrx: KR 일봉 폴백. (전 종목 횡단면 조회는 KRX 로그인이 필요해져 사용하지 않는다)"""

    name = "pykrx"
    min_interval = 1.0

    def daily_candles(self, code: str, start: date, end: date | None) -> pd.DataFrame:
        from pykrx import stock  # import 시 KRX 로그인 경고를 출력하므로 지연 로딩

        self.limiter.wait()
        df = stock.get_market_ohlcv(start.strftime("%Y%m%d"), (end or date.today()).strftime("%Y%m%d"), code)
        return to_ohlcv(df, rename=_RENAME, daily=True)
