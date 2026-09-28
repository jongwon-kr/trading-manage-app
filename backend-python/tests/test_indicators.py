import numpy as np
import pandas as pd
import pytest

from app.analysis import indicators as ind

# StockCharts ChartSchool RSI(14) 예제 — frontend/src/lib/indicators.test.ts 와 같은 기준값
CLOSES = [44.3389, 44.0902, 44.1497, 43.6124, 44.2779, 44.9951, 45.2461, 45.4238, 45.8411, 46.0826, 45.8931,
          46.0328, 45.614, 46.282, 46.282, 46.0028, 46.0328, 46.4116, 46.2222, 45.6439]
EXPECTED_RSI = [70.53, 66.32, 66.55, 69.41, 66.36, 57.97]


def _ohlc(close, spread=1.0):
    c = pd.Series(close, dtype=float)
    return pd.DataFrame({"open": c, "high": c + spread, "low": c - spread, "close": c, "volume": 1000.0})


def test_rsi_matches_stockcharts_wilder_example():
    out = ind.rsi(pd.Series(CLOSES))
    assert out.iloc[:14].isna().all()
    np.testing.assert_allclose(out.iloc[14:].to_numpy(), EXPECTED_RSI, atol=0.01)


def test_rsi_bounds_and_monotonic_series():
    up = ind.rsi(pd.Series(np.arange(1, 40, dtype=float)))
    assert up.iloc[-1] == 100
    rnd = ind.rsi(pd.Series(np.random.default_rng(0).normal(0, 1, 300).cumsum() + 100))
    assert rnd.dropna().between(0, 100).all()


def test_ema_seeded_with_sma():
    out = ind.ema(pd.Series([1.0, 2, 3, 4, 5]), 3)
    assert out.iloc[:2].isna().all()
    assert out.iloc[2] == 2 and out.iloc[3] == pytest.approx(3) and out.iloc[4] == pytest.approx(4)


def test_macd_signal_starts_after_warmup():
    m = ind.macd(pd.Series(np.linspace(100, 150, 60)))
    assert m["macd"].first_valid_index() == 25
    assert m["signal"].first_valid_index() == 25 + 8
    assert (m["hist"] - (m["macd"] - m["signal"])).dropna().abs().max() < 1e-12


def test_atr_constant_range():
    df = _ohlc([100.0] * 30, spread=1.0)  # 고저 폭 2, 갭 없음
    assert ind.atr(df).iloc[-1] == pytest.approx(2.0)


def test_adx_strong_uptrend():
    df = _ohlc(np.linspace(100, 200, 80), spread=0.5)
    out = ind.adx(df)
    assert out["adx"].iloc[-1] > 40
    assert out["plus_di"].iloc[-1] > out["minus_di"].iloc[-1]


def test_bollinger_population_std():
    b = ind.bollinger(pd.Series([2.0, 4, 4, 4, 5, 5, 7, 9]), n=8, k=2)
    assert b["mid"].iloc[-1] == 5 and b["upper"].iloc[-1] == 9 and b["lower"].iloc[-1] == 1
    assert b["pct_b"].iloc[-1] == pytest.approx(1.0)  # 종가 9 = 상단


def test_obv_and_rank():
    df = pd.DataFrame({"close": [1.0, 2, 1, 1, 3], "volume": [10.0, 20, 30, 40, 50]})
    assert ind.obv(df).tolist() == [0, 20, -10, -10, 40]
    r = ind.rolling_pct_rank(pd.Series([1.0, 2, 3, 4]), window=4, min_periods=1)
    assert r.tolist() == [1.0, 1.0, 1.0, 1.0]
    assert ind.rolling_pct_rank(pd.Series([4.0, 3, 2, 1]), window=4, min_periods=1).iloc[-1] == 0.25
