"""기술적 분석 팩터 (모든 시장). 각 팩터 점수는 시계열(Series) — 라이브는 마지막 값, 백테스트는 전체를 쓴다."""
import numpy as np
import pandas as pd

from app.analysis import indicators as ind
from app.analysis.scoring.primitives import Factor, clip_lin, interp
from app.analysis.scoring.weights import TECHNICAL_FACTORS, TECHNICAL_SUBGROUPS


def _last(s: pd.Series) -> float | None:
    if s is None or len(s) == 0 or pd.isna(s.iloc[-1]):
        return None
    return round(float(s.iloc[-1]), 6)


def technical_factors(df: pd.DataFrame, bench_close: pd.Series | None = None) -> list[Factor]:
    """df: 일봉 open/high/low/close/volume. bench_close: 벤치마크 종가 (없거나 자기 자신이면 상대강도 제외)"""
    c, v = df["close"], df["volume"]
    ma20, ma60, ma120 = ind.sma(c, 20), ind.sma(c, 60), ind.sma(c, 120)
    atr = ind.atr(df)
    adx = ind.adx(df)
    rsi = ind.rsi(c)
    macd = ind.macd(c)
    bb = ind.bollinger(c)
    daily_ret = c.pct_change()

    s: dict[str, tuple[pd.Series | None, dict, str]] = {}

    # --- 추세 ---
    align = pd.concat([clip_lin(c / ma20 - 1, 0.05), clip_lin(ma20 / ma60 - 1, 0.05),
                       clip_lin(ma60 / ma120 - 1, 0.05)], axis=1)
    # MA120 이 아직 없으면(상장 초기) 앞의 두 항목만으로 계산
    s["ma_alignment"] = (align.mean(axis=1, skipna=True).where(align.iloc[:, :2].notna().all(axis=1)),
                         {"close": _last(c), "ma20": _last(ma20), "ma60": _last(ma60), "ma120": _last(ma120)},
                         _alignment_note(_last(c), _last(ma20), _last(ma60), _last(ma120)))
    s["ma20_slope"] = (clip_lin(ma20 / ma20.shift(5) - 1, 0.03),
                       {"slope5d": _last(ma20 / ma20.shift(5) - 1)}, "")
    direction = np.sign(adx["plus_di"] - adx["minus_di"])
    s["adx_direction"] = (direction * interp(adx["adx"], [15, 25, 40], [0, 0.6, 1]),
                          {"adx": _last(adx["adx"]), "plusDi": _last(adx["plus_di"]), "minusDi": _last(adx["minus_di"])},
                          "")
    if bench_close is not None and not bench_close.empty:
        bench = bench_close.reindex(c.index).ffill()
        rel = ind.roc(c, 60) - ind.roc(bench, 60)
        s["relative_strength"] = (clip_lin(rel, 0.15), {"excessReturn60d": _last(rel)}, "")
    else:
        s["relative_strength"] = (None, {}, "벤치마크 없음")

    # --- 모멘텀 ---
    # 건전한 상승 모멘텀(50~70)은 가점, 과열(80+)은 감점, 과매도(20대)는 소폭 반등 기대
    s["rsi"] = (interp(rsi, [20, 30, 50, 65, 75, 85], [0.2, -0.2, 0, 0.8, 0.3, -0.6]), {"rsi": _last(rsi)}, "")
    s["macd_hist"] = (clip_lin(macd["hist"] / atr, 0.25),
                      {"macd": _last(macd["macd"]), "signal": _last(macd["signal"]), "hist": _last(macd["hist"])}, "")
    vol20 = daily_ret.rolling(20, min_periods=20).std() * np.sqrt(20)
    roc20 = ind.roc(c, 20)
    s["roc20"] = (clip_lin(roc20 / vol20, 2), {"roc20": _last(roc20), "vol20": _last(vol20)}, "")

    # --- 변동성 ---
    s["bb_pctb"] = (interp(bb["pct_b"], [-0.2, 0, 0.5, 0.9, 1.1, 1.3], [-0.6, -0.3, 0, 0.4, 0, -0.5]),
                    {"pctB": _last(bb["pct_b"]), "upper": _last(bb["upper"]), "lower": _last(bb["lower"])}, "")
    atr_pct = atr / c
    ratio = atr_pct / atr_pct.rolling(252, min_periods=60).median()
    s["atr_regime"] = (interp(ratio, [0.7, 1, 1.5, 2.5], [0.3, 0.1, -0.3, -0.8]),
                       {"atr": _last(atr), "atrPct": _last(atr_pct), "vsMedian": _last(ratio)}, "")

    # --- 거래량 ---
    obv = ind.obv(df)
    vol_sum20 = v.rolling(20, min_periods=20).sum()
    s["obv_flow"] = (clip_lin((obv - obv.shift(20)) / vol_sum20.where(vol_sum20 > 0), 0.5), {}, "")
    surge = ind.sma(v, 5) / ind.sma(v, 20).where(ind.sma(v, 20) > 0)
    s["volume_surge"] = (np.sign(c - c.shift(5)) * interp(surge, [0.8, 1, 1.5, 2.5], [0, 0.2, 0.6, 1]),
                         {"volumeRatio5to20": _last(surge)}, "")

    factors = []
    for key, (sub, w, label) in TECHNICAL_FACTORS.items():
        score, raw, note = s[key]
        factors.append(Factor(key=key, label=label, weight=TECHNICAL_SUBGROUPS[sub] * w, score=score,
                              raw=raw, sub_group=sub, note=note))
    return factors


def _alignment_note(c, ma20, ma60, ma120) -> str:
    if None in (c, ma20, ma60):
        return ""
    if ma120 is not None and c > ma20 > ma60 > ma120:
        return "정배열 (종가 > 20일 > 60일 > 120일)"
    if ma120 is not None and c < ma20 < ma60 < ma120:
        return "역배열 (종가 < 20일 < 60일 < 120일)"
    return "혼조"
