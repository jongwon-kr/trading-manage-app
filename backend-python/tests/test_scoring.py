import numpy as np
import pandas as pd
import pytest

from app.analysis.scoring.composite import evaluate, score_series, strength_of
from app.analysis.scoring.fundamental import fundamental_factors
from app.analysis.scoring.primitives import Factor, clip_lin, group_point, interp
from app.analysis.scoring.regime import regime_factors
from app.analysis.scoring.risk import risk_plan
from app.analysis.scoring.technical import technical_factors
from app.core.ticks import round_price, tick_size
from app.market.models import Fundamentals, Market


def daily(n=300, drift=0.001, seed=1, start=100.0):
    rng = np.random.default_rng(seed)
    close = start * np.exp(np.cumsum(rng.normal(drift, 0.015, n)))
    idx = pd.date_range("2025-01-01", periods=n, freq="D", tz="UTC")
    return pd.DataFrame({"open": close * 0.998, "high": close * 1.01, "low": close * 0.99, "close": close,
                         "volume": rng.uniform(1e5, 2e5, n)}, index=idx)


def contributions_sum(ev):
    return 50 + sum(f["contribution"] for g in ev["groups"] for f in g["factors"])


def test_primitives():
    assert interp(5, [0, 10], [-1, 1]) == 0
    assert interp(-100, [0, 10], [-1, 1]) == -1  # 양 끝 고정
    assert interp(None, [0, 1], [0, 1]) is None
    assert clip_lin(0.2, 0.05) == 1
    s = interp(pd.Series([np.nan, 5.0]), [0, 10], [-1, 1])
    assert np.isnan(s.iloc[0]) and s.iloc[1] == 0


def test_contribution_invariant_holds_for_every_market():
    df = daily()
    bench = daily(seed=2)["close"]
    tech = technical_factors(df, bench)
    fund = fundamental_factors(Fundamentals(market=Market.KR_STOCK, code="X", per=10, pbr=1.2, roe=0.12,
                                            eps_growth=0.2, dividend_yield=0.02, source="t"))
    regime = regime_factors("KR_STOCK", bench, "코스피", None, breadth=0.55)
    for market, groups in [("KR_STOCK", {"technical": tech, "fundamental": fund, "regime": regime}),
                           ("CRYPTO", {"technical": tech, "regime": regime}),
                           ("US_STOCK", {"technical": tech})]:
        ev = evaluate(market, groups)
        assert contributions_sum(ev) == pytest.approx(ev["score"], abs=0.01)  # 점수는 소수 2자리 반올림
        assert 0 <= ev["score"] <= 100
        assert sum(g["effectiveWeight"] for g in ev["groups"]) == pytest.approx(1, abs=1e-3)


def test_missing_group_is_renormalized():
    good = [Factor(key="a", label="a", weight=1, score=0.5)]
    missing = [Factor(key="b", label="b", weight=1, score=None)]
    ev = evaluate("KR_STOCK", {"technical": good, "fundamental": missing, "regime": good})
    # 기본적 분석이 없으면 기술 0.5 : 국면 0.25 → 2/3 : 1/3 로 재정규화
    eff = {g["key"]: g["effectiveWeight"] for g in ev["groups"]}
    assert eff == {"technical": pytest.approx(2 / 3, abs=1e-4), "fundamental": 0, "regime": pytest.approx(1 / 3, abs=1e-4)}
    assert ev["score"] == pytest.approx(75)
    assert ev["confidence"] < 1  # 커버리지 감소 반영


def test_signal_thresholds_and_risk_off_gate():
    assert [strength_of(s) for s in (80, 65, 50, 35, 20)] == ["STRONG_BUY", "BUY", "HOLD", "SELL", "STRONG_SELL"]
    bullish = [Factor(key="t", label="t", weight=1, score=1.0)]
    risk_off = [Factor(key="r", label="r", weight=1, score=-0.6)]
    ev = evaluate("CRYPTO", {"technical": bullish, "regime": risk_off})
    assert ev["score"] >= 60  # 원래는 매수 구간
    assert ev["signal"] == "HOLD" and ev["warnings"]


def test_valuation_is_monotonic_in_per():
    def valuation(per):
        f = Fundamentals(market=Market.US_STOCK, code="X", per=per, source="t")
        return next(x for x in fundamental_factors(f) if x.key == "valuation").score
    assert valuation(8) > valuation(15) > valuation(30) > valuation(60)
    assert valuation(-5) == -0.8  # 적자


def test_fundamentals_missing_returns_unavailable_factors():
    factors = fundamental_factors(None)
    assert all(f.score is None for f in factors)
    assert group_point(factors) == (None, 0.0)


def test_technical_trend_direction():
    up = evaluate("US_STOCK", {"technical": technical_factors(daily(drift=0.004, seed=3))})
    down = evaluate("US_STOCK", {"technical": technical_factors(daily(drift=-0.004, seed=3))})
    assert up["score"] > 55 > 45 > down["score"]


def test_relative_strength_excluded_without_benchmark():
    factors = technical_factors(daily())
    rs = next(f for f in factors if f.key == "relative_strength")
    assert rs.score is None


def test_score_series_matches_point_evaluation_on_last_bar():
    df = daily()
    bench = daily(seed=2)["close"]
    groups = {"technical": technical_factors(df, bench), "regime": regime_factors("CRYPTO", bench, "BTC")}
    series = score_series("CRYPTO", groups, df.index)
    assert series.iloc[-1] == pytest.approx(evaluate("CRYPTO", groups)["score"], abs=1e-2)


def test_risk_plan_levels():
    df = daily(n=200)
    plan = risk_plan("US_STOCK", df, account_equity=100_000, risk_pct=0.01)
    assert plan["stopLoss"] < plan["entryLow"] <= plan["entry"] <= plan["entryHigh"]
    assert plan["takeProfit1"] < plan["takeProfit2"]
    r = plan["riskPerUnit"]
    assert plan["takeProfit2"] - plan["entry"] == pytest.approx(3 * r, abs=0.02)
    assert plan["quantity"] * plan["entry"] <= 100_000 * 0.25 + 1e-6  # 비중 상한
    crypto = risk_plan("CRYPTO", df, account_equity=1_000_000)
    assert crypto["positionSizePct"] <= 0.10


def test_tick_rounding():
    assert tick_size("KR_STOCK", 1_999) == 1 and tick_size("KR_STOCK", 271_500) == 500
    assert round_price("KR_STOCK", 271_530) == 271_500
    assert round_price("KR_STOCK", 19_987, "down") == 19_980
    assert round_price("CRYPTO", 25.867) == 25.87
    assert round_price("US_STOCK", 341.066) == 341.07
