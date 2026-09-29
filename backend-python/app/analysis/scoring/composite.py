"""그룹 점수 → 종합 점수(0~100), 팩터별 기여도, 신호·신뢰도.

  그룹 유효가중치 W_g = 기본가중치 × 커버리지
  C = Σ W_g·S_g / Σ W_g ,  score = 50 + 50·C
  팩터 기여도(점) = 50 · (W_g/ΣW) · (w_f / Σw_available_in_g) · s_f
  → 불변식: 50 + Σ 기여도 = score
"""
import pandas as pd

from app.analysis.model.catalog import GROUP_LABELS
from app.analysis.model.config import SignalConfig, StrategyConfig, default_config
from app.analysis.scoring.primitives import Factor, group_point, group_series

SIGNAL_LABELS = {"STRONG_BUY": "강한 매수", "BUY": "매수", "HOLD": "관망", "SELL": "매도", "STRONG_SELL": "강한 매도"}


def strength_of(score: float, signal: SignalConfig | None = None) -> str:
    t = signal or SignalConfig()
    if score >= t.strong_buy:
        return "STRONG_BUY"
    if score >= t.buy:
        return "BUY"
    if score <= t.strong_sell:
        return "STRONG_SELL"
    if score <= t.sell:
        return "SELL"
    return "HOLD"


def evaluate(market: str, groups: dict[str, list[Factor]], cfg: StrategyConfig | None = None) -> dict:
    """마지막 시점 기준 종합 평가. groups: {"technical": [...], "fundamental": [...], "regime": [...]}"""
    cfg = cfg or default_config()
    base = cfg.group_weights[market]
    points = {g: group_point(fs) for g, fs in groups.items()}
    eff = {g: base.get(g, 0.0) * cov if points[g][0] is not None else 0.0 for g, (_, cov) in points.items()}
    total_eff = sum(eff.values())
    if total_eff == 0:
        raise ValueError("점수를 계산할 데이터가 없습니다.")

    composite = sum(eff[g] * points[g][0] for g in groups if eff[g] > 0) / total_eff
    score = 50 + 50 * composite

    group_out = []
    for g, factors in groups.items():
        g_score, coverage = points[g]
        g_share = eff[g] / total_eff
        avail_w = sum(f.weight for f in factors if f.value_at() is not None) or 1.0
        factor_out = []
        for f in factors:
            v = f.value_at()
            in_group = f.weight / avail_w if v is not None else 0.0
            explain = dict(f.explain)
            if explain:
                explain["weightPath"] = {**explain["weightPath"], "groupShare": _r(g_share),
                                         "inGroup": _r(in_group), "effective": _r(g_share * in_group)}
            factor_out.append({
                "key": f.key, "label": f.label, "subGroup": f.sub_group,
                "score": _r(v), "weight": _r(g_share * in_group),
                "contribution": _r(50 * g_share * in_group * v) if v is not None else 0.0,
                "raw": f.raw, "note": f.note, "explain": explain,
            })
        group_out.append({
            "key": g, "label": GROUP_LABELS[g], "score": _r(g_score),
            "baseWeight": base.get(g, 0.0), "effectiveWeight": _r(g_share), "coverage": _r(coverage),
            "contribution": _r(50 * g_share * g_score) if g_score is not None else 0.0,
            "factors": factor_out,
        })

    strength = strength_of(score, cfg.signal)
    warnings = []
    regime_score = points.get("regime", (None, 0))[0]
    if (cfg.gate.enabled and strength in ("BUY", "STRONG_BUY") and regime_score is not None
            and regime_score < cfg.gate.threshold):
        warnings.append("시장 위험회피 국면 — 매수 신호를 관망으로 낮춤")
        strength = "HOLD"
    signal = "BUY" if strength in ("BUY", "STRONG_BUY") else "SELL" if strength in ("SELL", "STRONG_SELL") else "HOLD"

    # 신뢰도 = 데이터 커버리지 × 그룹 간 방향 일치도
    base_total = sum(base.get(g, 0) for g in groups if base.get(g, 0) > 0) or 1.0
    coverage_all = sum(base.get(g, 0) * points[g][1] for g in groups if base.get(g, 0) > 0) / base_total
    abs_sum = sum(eff[g] * abs(points[g][0]) for g in groups if eff[g] > 0)
    agreement = abs(composite * total_eff) / abs_sum if abs_sum > 0 else 0.0
    confidence = coverage_all * (0.5 + 0.5 * agreement)

    return {"score": _r(score, 2), "composite": composite, "signal": signal, "strength": strength,
            "confidence": _r(confidence, 3), "groups": group_out, "warnings": warnings,
            "regimeScore": regime_score}


def score_series(market: str, groups: dict[str, list[Factor]], index: pd.Index,
                 cfg: StrategyConfig | None = None) -> pd.Series:
    """시계열 종합 점수 (백테스트용). evaluate 와 같은 재정규화 규칙."""
    base = (cfg or default_config()).group_weights[market]
    num = pd.Series(0.0, index=index)
    den = pd.Series(0.0, index=index)
    for g, factors in groups.items():
        w = base.get(g, 0.0)
        if w == 0:
            continue
        s, cov = group_series(factors, index)
        ok = s.notna()
        num += (s.fillna(0) * w * cov).where(ok, 0.0)
        den += (w * cov).where(ok, 0.0)
    return 50 + 50 * (num / den).where(den > 0)


def _r(v, digits: int = 4):
    return None if v is None else round(float(v), digits)
