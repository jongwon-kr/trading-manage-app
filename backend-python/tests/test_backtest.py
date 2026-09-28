import numpy as np
import pandas as pd
import pytest

from app.analysis.backtest import BacktestParams, metrics, simulate
from app.core.errors import BadRequest
from app.market.models import Market


def frame(opens, highs, lows, closes):
    idx = pd.date_range("2026-01-01", periods=len(closes), freq="D", tz="UTC")
    return pd.DataFrame({"open": opens, "high": highs, "low": lows, "close": closes, "volume": 1.0}, index=idx,
                        dtype=float)


def flat_frame(n=40, price=100.0, rng=1.0):
    return frame([price] * n, [price + rng] * n, [price - rng] * n, [price] * n)


P = BacktestParams(buy_threshold=60, sell_threshold=45, stop_atr=2.0, take_profit_r=3.0, fee_bps=0, tax_bps=0,
                   slippage_bps=0, initial_capital=10_000)


def run(df, score, start=20, fractional=True, params=P):
    allow = pd.Series(True, index=df.index)
    return simulate(df, pd.Series(score, index=df.index, dtype=float), allow, params, start, fractional)


def test_signal_at_close_fills_next_open_and_exit_on_sell_signal():
    df = flat_frame()
    score = [50.0] * 40
    score[22] = 70  # 22일 종가 매수 신호 → 23일 시가 진입
    score[30] = 40  # 30일 종가 매도 신호 → 31일 시가 청산
    for i in range(23, 30):
        score[i] = 55
    eq, trades = run(df, score)
    assert len(trades) == 1
    t = trades[0]
    assert t["entryTime"] == "2026-01-24" and t["exitTime"] == "2026-02-01" and t["exitReason"] == "SIGNAL"
    assert t["returnPct"] == pytest.approx(0)


def test_gap_below_stop_exits_at_open():
    df = flat_frame()  # ATR = 2 → 손절 = 진입 - 4 = 96
    df.iloc[25, :4] = [90, 91, 89, 90]  # 갭 하락
    score = [50.0] * 40
    score[22] = 70
    _, trades = run(df, score)
    assert trades[0]["exitReason"] == "STOP" and trades[0]["exitPrice"] == 90


def test_stop_has_priority_when_stop_and_target_hit_same_bar():
    df = flat_frame()
    df.iloc[25, :4] = [100, 120, 90, 100]  # 목표(112)와 손절(96)을 모두 터치
    score = [50.0] * 40
    score[22] = 70
    _, trades = run(df, score)
    assert trades[0]["exitReason"] == "STOP" and trades[0]["exitPrice"] == 96


def test_target_exit_and_end_close():
    df = flat_frame()
    df.iloc[25, :4] = [100, 115, 99.5, 110]
    score = [50.0] * 40
    score[22] = 70
    score[30] = 70  # 다시 진입 → 마지막 봉에서 END 청산
    _, trades = run(df, score)
    assert [t["exitReason"] for t in trades] == ["TARGET", "END"]
    assert trades[0]["exitPrice"] == 112  # 목표 = 100 + 3 × 4


def test_integer_shares_and_costs():
    df = flat_frame()
    score = [50.0] * 40
    score[22] = 70
    params = BacktestParams(buy_threshold=60, sell_threshold=45, fee_bps=10, tax_bps=20, slippage_bps=0,
                            initial_capital=1_050)
    eq, trades = run(df, score, fractional=False, params=params)
    t = trades[0]
    assert t["exitReason"] == "END"
    assert t["returnPct"] == pytest.approx((1 - 0.003) / (1 + 0.001) - 1, abs=1e-9)  # 매수 수수료 + 매도 수수료·세금
    assert eq.iloc[-1] < 1_050


def test_metrics_known_equity_curve():
    idx = pd.date_range("2026-01-01", periods=4, freq="D", tz="UTC")
    m = metrics(pd.Series([100.0, 120, 90, 130], index=idx), [{"returnPct": 0.1, "bars": 2},
                                                               {"returnPct": -0.05, "bars": 1}], 252)
    assert m["mdd"] == pytest.approx(-0.25)
    assert m["totalReturn"] == pytest.approx(0.3)
    assert m["winRate"] == 0.5 and m["profitFactor"] == pytest.approx(2.0)


def test_params_validation():
    with pytest.raises(BadRequest):
        BacktestParams.from_dict(Market.KR_STOCK, {"buyThreshold": 40, "sellThreshold": 50})
    kr = BacktestParams.from_dict(Market.KR_STOCK, {})
    assert kr.tax_bps == 20 and kr.stop_atr == 2.0
    assert BacktestParams.from_dict(Market.CRYPTO, {}).stop_atr == 2.5


def test_no_trades_when_score_never_crosses():
    df = flat_frame()
    eq, trades = run(df, [50.0] * 40)
    assert trades == [] and np.allclose(eq.to_numpy(), 10_000)
