import copy

import numpy as np
import pytest
from fastapi.testclient import TestClient

from app.analysis.model.catalog import FACTORS
from app.analysis.model.config import ConfigError, config_hash, default_config, default_hash, parse_config
from app.analysis.scoring.composite import evaluate, score_series
from app.analysis.scoring.fundamental import fundamental_factors
from app.analysis.scoring.regime import regime_factors
from app.analysis.scoring.risk import risk_plan
from app.analysis.scoring.technical import technical_factors
from app.api.main import app
from app.market.models import Fundamentals, Market
from tests.test_scoring import contributions_sum, daily

H = {"X-Internal-Token": "local-dev-token"}
FUND = Fundamentals(market=Market.KR_STOCK, code="X", per=11, pbr=1.3, roe=0.14, operating_margin=0.12,
                    eps_growth=0.15, revenue_growth=0.05, debt_to_equity=0.8, dividend_yield=0.025, source="t")


def groups_for(market, cfg, df=None, bench=None):
    df = daily() if df is None else df
    bench = daily(seed=2)["close"] if bench is None else bench
    g = {"technical": technical_factors(df, bench, cfg),
         "regime": regime_factors(market, bench, "IDX", daily(seed=9, start=18)["close"],
                                  breadth=0.6 if market != "US_STOCK" else None,
                                  fear_greed=40 if market == "CRYPTO" else None, cfg=cfg)}
    if market != "CRYPTO":
        g["fundamental"] = fundamental_factors(FUND, cfg)
    return g


def random_config(seed: int) -> dict:
    """밴드·가중치·기간을 무작위로 바꾼 부분 설정"""
    rng = np.random.default_rng(seed)
    factors = {}
    for f in FACTORS:
        entry = {"weight": float(rng.uniform(0, 2)), "enabled": bool(rng.uniform() > 0.2)}
        params = {}
        for p in f.params:
            # 대소 제약이 있는 팩터는 기본값 ±30% 안에서 뽑아 순서를 유지한다
            v = p.default * rng.uniform(0.7, 1.3) if f.ordered else rng.uniform(p.min, p.max)
            params[p.key] = float(round(v)) if p.integer else float(v)
        entry["params"] = params
        bands = {}
        for b in f.bands:
            n = int(rng.integers(2, 7))
            lo, hi = min(b.xs), max(b.xs)
            xs = sorted(set(round(float(x), 6) for x in rng.uniform(lo - abs(lo) - 1, hi + abs(hi) + 1, n)))
            if len(xs) < 2:
                xs = [lo, hi]
            bands[b.name] = {"xs": xs, "ys": [float(y) for y in rng.uniform(-1, 1, len(xs))]}
        entry["bands"] = bands
        factors[f.key] = entry
    factors["rsi"]["enabled"] = True  # 활성 팩터 최소 1개 보장
    factors["rsi"]["weight"] = 1.0
    return {"factors": factors,
            "groupWeights": {m: {"technical": float(rng.uniform(0.1, 1)), "fundamental": float(rng.uniform(0, 1)),
                                 "regime": float(rng.uniform(0, 1))} for m in ("KR_STOCK", "US_STOCK", "CRYPTO")},
            "subgroupWeights": {s: float(rng.uniform(0.1, 1)) for s in ("trend", "momentum", "volatility", "volume")}}


def test_default_and_partial_config_merge():
    assert parse_config(None).dump() == default_config().dump()
    assert config_hash(parse_config({})) == default_hash()
    cfg = parse_config({"factors": {"rsi": {"params": {"period": 9}}}})
    assert cfg.param("rsi", "period") == 9
    assert cfg.band("rsi", "rsi") == default_config().band("rsi", "rsi")  # 나머지는 기본값 유지
    assert config_hash(cfg) != default_hash()


@pytest.mark.parametrize("seed", range(8))
@pytest.mark.parametrize("market", ["KR_STOCK", "US_STOCK", "CRYPTO"])
def test_invariant_holds_for_random_configs(seed, market):
    cfg = parse_config(random_config(seed))
    ev = evaluate(market, groups_for(market, cfg), cfg)
    assert contributions_sum(ev) == pytest.approx(ev["score"], abs=0.01)
    assert 0 <= ev["score"] <= 100


def test_score_series_matches_evaluate_with_custom_config():
    cfg = parse_config(random_config(3))
    groups = groups_for("CRYPTO", cfg)
    groups.pop("fundamental", None)
    series = score_series("CRYPTO", groups, daily().index, cfg)
    assert series.iloc[-1] == pytest.approx(evaluate("CRYPTO", groups, cfg)["score"], abs=1e-2)


def test_disabled_factor_is_excluded_and_renormalized():
    cfg = parse_config({"factors": {"rsi": {"enabled": False}, "macd_hist": {"weight": 0}}})
    keys = [f.key for f in technical_factors(daily(), None, cfg)]
    assert "rsi" not in keys and "macd_hist" not in keys
    ev = evaluate("US_STOCK", {"technical": technical_factors(daily(), None, cfg)}, cfg)
    assert contributions_sum(ev) == pytest.approx(ev["score"], abs=0.01)


def test_period_change_changes_raw_and_label():
    base = {f.key: f for f in technical_factors(daily())}
    cfg = parse_config({"factors": {"rsi": {"params": {"period": 7}}, "ma_alignment": {"params": {"fast": 10}}}})
    custom = {f.key: f for f in technical_factors(daily(), None, cfg)}
    assert custom["rsi"].label == "RSI(7)" and base["rsi"].label == "RSI(14)"
    assert custom["rsi"].raw["rsi"] != base["rsi"].raw["rsi"]
    assert custom["ma_alignment"].raw["maFast"] != base["ma_alignment"].raw["maFast"]


def test_band_change_changes_score_and_explain_is_consistent():
    flat = parse_config({"factors": {"rsi": {"bands": {"rsi": {"xs": [0, 100], "ys": [1, 1]}}}}})
    f = next(x for x in technical_factors(daily(), None, flat) if x.key == "rsi")
    assert f.value_at() == pytest.approx(1)
    band = f.explain["bands"][0]
    assert band["xs"] == [0, 100] and band["y"] == pytest.approx(1) and band["x"] == f.raw["rsi"]
    assert f.explain["inputs"][0]["label"] == "RSI" and "Wilder" in f.explain["formula"]


def test_explain_weight_path_multiplies_to_effective_weight():
    ev = evaluate("KR_STOCK", groups_for("KR_STOCK", default_config()))
    for g in ev["groups"]:
        for f in g["factors"]:
            wp = f["explain"]["weightPath"]
            assert wp["effective"] == pytest.approx(f["weight"], abs=1e-4)
            assert wp["groupShare"] * wp["inGroup"] == pytest.approx(wp["effective"], abs=1e-3)


def test_signal_thresholds_and_gate_follow_config():
    bullish = groups_for("CRYPTO", default_config(), df=daily(drift=0.006, seed=4))
    cfg = parse_config({"signal": {"strongBuy": 99, "buy": 98, "sell": 3, "strongSell": 2}})
    assert evaluate("CRYPTO", bullish, cfg)["strength"] == "HOLD"
    from app.analysis.scoring.primitives import Factor
    strong = {"technical": [Factor(key="t", label="t", weight=1, score=1.0)],
              "regime": [Factor(key="r", label="r", weight=1, score=-0.6)]}
    assert evaluate("CRYPTO", strong)["signal"] == "HOLD"  # 기본: 위험회피 게이트
    assert evaluate("CRYPTO", strong, parse_config({"gate": {"enabled": False}}))["signal"] == "BUY"


def test_risk_plan_uses_config_multiples():
    cfg = parse_config({"risk": {"stopAtrStock": 1.0, "target1R": 1.0, "target2R": 2.0}})
    plan = risk_plan("US_STOCK", daily(n=200), cfg=cfg)
    assert plan["riskPerUnit"] == pytest.approx(plan["atr"], rel=1e-6)
    assert plan["takeProfit2"] - plan["entry"] == pytest.approx(2 * plan["riskPerUnit"], abs=0.02)
    assert plan["riskReward"] == 2.0


@pytest.mark.parametrize("patch, path", [
    ({"factors": {"rsi": {"bands": {"rsi": {"xs": [50, 30], "ys": [0, 1]}}}}}, "factors.rsi.bands.rsi.xs"),
    ({"factors": {"rsi": {"bands": {"rsi": {"xs": [0, 50], "ys": [0, 1.5]}}}}}, "factors.rsi.bands.rsi.ys"),
    ({"factors": {"rsi": {"bands": {"rsi": {"xs": [0, 50, 60], "ys": [0, 1]}}}}}, "factors.rsi.bands.rsi.ys"),
    ({"factors": {"rsi": {"params": {"period": 500}}}}, "factors.rsi.params.period"),
    ({"factors": {"rsi": {"params": {"period": 9.5}}}}, "factors.rsi.params.period"),
    ({"factors": {"ma_alignment": {"params": {"fast": 80, "mid": 60}}}}, "factors.ma_alignment.params.mid"),
    ({"factors": {"rsi": {"params": {"nope": 1}}}}, "factors.rsi.params.nope"),
    ({"factors": {"rsi": {"weight": -1}}}, "factors.rsi.weight"),
    ({"signal": {"buy": 30}}, "signal"),
    ({"gate": {"threshold": 3}}, "gate.threshold"),
    ({"risk": {"target1R": 4, "target2R": 3}}, "risk.target2R"),
    ({"groupWeights": {"CRYPTO": {"technical": 0, "fundamental": 0, "regime": 0}}}, "groupWeights.CRYPTO"),
    ({"unknownKey": 1}, "unknownKey"),
])
def test_validation_errors_report_field_path(patch, path):
    with pytest.raises(ConfigError) as e:
        parse_config(patch)
    assert path in [err["path"] for err in e.value.errors]


def test_all_factors_disabled_is_rejected():
    with pytest.raises(ConfigError) as e:
        parse_config({"factors": {f.key: {"enabled": False} for f in FACTORS}})
    assert e.value.errors[0]["path"] == "factors"


def test_model_and_validate_api(fake_redis):
    c = TestClient(app)
    model = c.get("/internal/v1/analysis/model", headers=H).json()
    assert {f["key"] for f in model["factors"]} == {f.key for f in FACTORS}
    assert model["defaultHash"] == default_hash()
    assert model["defaultConfig"]["factors"]["rsi"]["params"]["period"] == 14

    ok = c.post("/internal/v1/analysis/config/validate", headers=H, json={"factors": {"rsi": {"weight": 0.5}}})
    assert ok.status_code == 200 and not ok.json()["isDefault"]
    assert ok.json()["config"]["factors"]["rsi"]["weight"] == 0.5

    bad = c.post("/internal/v1/analysis/config/validate", headers=H,
                 json=copy.deepcopy({"signal": {"buy": 10}}))
    assert bad.status_code == 422 and bad.json()["code"] == "STRATEGY_CONFIG_INVALID"
    assert bad.json()["errors"][0]["path"] == "signal"
