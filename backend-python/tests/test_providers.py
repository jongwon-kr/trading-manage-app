from datetime import datetime, timedelta, timezone

import httpx
import pytest
import respx

from app.market.providers.naver_provider import NaverProvider
from app.market.providers.upbit_provider import UpbitProvider


def _upbit_candle(t: datetime) -> dict:
    return {"candle_date_time_utc": t.strftime("%Y-%m-%dT%H:%M:%S"), "opening_price": 1.0, "high_price": 2.0,
            "low_price": 0.5, "trade_price": 1.5, "candle_acc_trade_volume": 3.0}


@respx.mock
def test_upbit_paginates_until_limit():
    base = datetime(2026, 9, 28, tzinfo=timezone.utc)
    page1 = [_upbit_candle(base - timedelta(days=i)) for i in range(200)]
    page2 = [_upbit_candle(base - timedelta(days=200 + i)) for i in range(50)]
    route = respx.get("https://api.upbit.com/v1/candles/days").mock(
        side_effect=[httpx.Response(200, json=page1), httpx.Response(200, json=page2)])
    df = UpbitProvider().candles("KRW-BTC", "1d", None, None, limit=250)
    assert len(df) == 250 and df.index.is_monotonic_increasing
    second = route.calls[1].request.url.params
    assert second["to"] == (base - timedelta(days=199)).strftime("%Y-%m-%dT%H:%M:%SZ")  # 1페이지 가장 오래된 봉
    assert second["count"] == "50"


@respx.mock
def test_naver_quote_parsing():
    respx.get("https://polling.finance.naver.com/api/realtime/domestic/stock/005930").mock(
        return_value=httpx.Response(200, json={"datas": [{
            "itemCode": "005930", "stockName": "삼성전자", "closePrice": "273,000",
            "compareToPreviousClosePrice": "-12,500", "openPrice": "284,500", "highPrice": "285,500",
            "lowPrice": "271,500", "accumulatedTradingVolume": "15,431,479", "accumulatedTradingValue": "4조 2,655억",
            "localTradedAt": "2026-09-28T14:37:48.609387+09:00"}]}))
    q = NaverProvider().quotes(["005930"])[0]
    assert q.price == 273000 and q.prev_close == 285500 and q.change == "FALL"
    assert round(q.change_rate, 4) == -0.0438 and q.trade_value == 4.2655e12


@respx.mock
def test_naver_fundamentals_parsing():
    respx.get("https://m.stock.naver.com/api/stock/005930/integration").mock(return_value=httpx.Response(200, json={
        "totalInfos": [{"code": "per", "value": "12.22배", "valueDesc": "2026.06."}, {"code": "pbr", "value": "3.17배"},
                       {"code": "dividendYieldRatio", "value": "0.61%"}]}))
    respx.get("https://m.stock.naver.com/api/stock/005930/finance/annual").mock(return_value=httpx.Response(200, json={
        "financeInfo": {
            "trTitleList": [{"key": "202412", "isConsensus": "N"}, {"key": "202512", "isConsensus": "N"},
                            {"key": "202612", "isConsensus": "Y"}],
            "rowList": [
                {"title": "ROE", "columns": {"202412": {"value": "9.03"}, "202512": {"value": "10.85"},
                                             "202612": {"value": "56.03"}}},
                {"title": "EPS", "columns": {"202412": {"value": "4,950"}, "202512": {"value": "6,564"}}},
                {"title": "부채비율", "columns": {"202412": {"value": "27.93"}, "202512": {"value": "29.94"}}},
            ]}}))
    f = NaverProvider().fundamentals("005930")
    assert f.per == 12.22 and f.dividend_yield == pytest.approx(0.0061)
    assert f.roe == 0.1085  # 컨센서스(2026E) 제외, 최근 실적
    assert round(f.eps_growth, 4) == round(6564 / 4950 - 1, 4)
    assert f.debt_to_equity == 0.2994 and f.as_of == "2026.06."
