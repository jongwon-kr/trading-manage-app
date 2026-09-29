"""기술적 분석 팩터 (모든 시장). 각 팩터 점수는 시계열(Series) — 라이브는 마지막 값, 백테스트는 전체를 쓴다.

기간·밴드·가중치는 설정(cfg, 기본값 = 모델 v1)에서 읽는다. 설명과 기본값은 app/analysis/model/catalog.py.
"""
import numpy as np
import pandas as pd

from app.analysis import indicators as ind
from app.analysis.model.catalog import factors_of
from app.analysis.model.config import StrategyConfig, default_config
from app.analysis.scoring.build import band_score, is_active, make_factor
from app.analysis.scoring.primitives import Factor


def _last(s: pd.Series | None) -> float | None:
    if s is None or len(s) == 0 or pd.isna(s.iloc[-1]):
        return None
    v = float(s.iloc[-1])
    return None if not np.isfinite(v) else round(v, 6)


def technical_factors(df: pd.DataFrame, bench_close: pd.Series | None = None,
                      cfg: StrategyConfig | None = None) -> list[Factor]:
    """df: 일봉 open/high/low/close/volume. bench_close: 벤치마크 종가 (없거나 자기 자신이면 상대강도 제외).
    사용하지 않는(꺼졌거나 가중치 0) 팩터는 결과에서 빠진다."""
    cfg = cfg or default_config()
    c, v = df["close"], df["volume"]
    out: list[Factor] = []
    for spec in factors_of("technical"):
        if is_active(cfg, spec.key):
            out.append(_COMPUTE[spec.key](df, c, v, bench_close, cfg))
    return out


def _ma_alignment(df, c, v, bench, cfg):
    k = "ma_alignment"
    fast, mid, slow = (ind.sma(c, cfg.iparam(k, n)) for n in ("fast", "mid", "slow"))
    x1, x2, x3 = c / fast - 1, fast / mid - 1, mid / slow - 1
    align = pd.concat([band_score(cfg, k, "priceVsFast", x1), band_score(cfg, k, "fastVsMid", x2),
                       band_score(cfg, k, "midVsSlow", x3)], axis=1)
    # 장기 이동평균이 아직 없으면(상장 초기) 앞의 두 항목만으로 계산
    score = align.mean(axis=1, skipna=True).where(align.iloc[:, :2].notna().all(axis=1))
    raw = {"close": _last(c), "maFast": _last(fast), "maMid": _last(mid), "maSlow": _last(slow)}
    return make_factor(cfg, k, score, raw, {"priceVsFast": _last(x1), "fastVsMid": _last(x2), "midVsSlow": _last(x3)},
                       _alignment_note(raw["close"], raw["maFast"], raw["maMid"], raw["maSlow"], cfg))


def _ma20_slope(df, c, v, bench, cfg):
    k = "ma20_slope"
    ma = ind.sma(c, cfg.iparam(k, "period"))
    slope = ma / ma.shift(cfg.iparam(k, "lookback")) - 1
    return make_factor(cfg, k, band_score(cfg, k, "slope", slope), {"slope": _last(slope)}, {"slope": _last(slope)})


def _adx_direction(df, c, v, bench, cfg):
    k = "adx_direction"
    adx = ind.adx(df, cfg.iparam(k, "period"))
    direction = np.sign(adx["plus_di"] - adx["minus_di"])
    raw = {"adx": _last(adx["adx"]), "plusDi": _last(adx["plus_di"]), "minusDi": _last(adx["minus_di"])}
    return make_factor(cfg, k, direction * band_score(cfg, k, "adx", adx["adx"]), raw, {"adx": raw["adx"]})


def _relative_strength(df, c, v, bench, cfg):
    k = "relative_strength"
    if bench is None or bench.empty:
        return make_factor(cfg, k, None, {}, {}, "벤치마크 없음")
    n = cfg.iparam(k, "lookback")
    rel = ind.roc(c, n) - ind.roc(bench.reindex(c.index).ffill(), n)
    return make_factor(cfg, k, band_score(cfg, k, "excess", rel), {"excessReturn": _last(rel)},
                       {"excess": _last(rel)})


def _rsi(df, c, v, bench, cfg):
    k = "rsi"
    rsi = ind.rsi(c, cfg.iparam(k, "period"))
    return make_factor(cfg, k, band_score(cfg, k, "rsi", rsi), {"rsi": _last(rsi)}, {"rsi": _last(rsi)})


def _macd_hist(df, c, v, bench, cfg):
    k = "macd_hist"
    macd = ind.macd(c, cfg.iparam(k, "fast"), cfg.iparam(k, "slow"), cfg.iparam(k, "signal"))
    ratio = macd["hist"] / ind.atr(df)
    raw = {"macd": _last(macd["macd"]), "signal": _last(macd["signal"]), "hist": _last(macd["hist"]),
           "histToAtr": _last(ratio)}
    return make_factor(cfg, k, band_score(cfg, k, "histToAtr", ratio), raw, {"histToAtr": raw["histToAtr"]})


def _roc20(df, c, v, bench, cfg):
    k = "roc20"
    n = cfg.iparam(k, "period")
    vol = c.pct_change().rolling(n, min_periods=n).std() * np.sqrt(n)
    roc = ind.roc(c, n)
    z = roc / vol
    raw = {"roc": _last(roc), "vol": _last(vol), "zScore": _last(z)}
    return make_factor(cfg, k, band_score(cfg, k, "zScore", z), raw, {"zScore": raw["zScore"]})


def _bb_pctb(df, c, v, bench, cfg):
    k = "bb_pctb"
    bb = ind.bollinger(c, cfg.iparam(k, "period"), cfg.param(k, "k"))
    raw = {"pctB": _last(bb["pct_b"]), "upper": _last(bb["upper"]), "lower": _last(bb["lower"])}
    return make_factor(cfg, k, band_score(cfg, k, "pctB", bb["pct_b"]), raw, {"pctB": raw["pctB"]})


def _atr_regime(df, c, v, bench, cfg):
    k = "atr_regime"
    atr = ind.atr(df, cfg.iparam(k, "period"))
    atr_pct = atr / c
    ratio = atr_pct / atr_pct.rolling(cfg.iparam(k, "lookback"), min_periods=60).median()
    raw = {"atr": _last(atr), "atrPct": _last(atr_pct), "vsMedian": _last(ratio)}
    return make_factor(cfg, k, band_score(cfg, k, "vsMedian", ratio), raw, {"vsMedian": raw["vsMedian"]})


def _obv_flow(df, c, v, bench, cfg):
    k = "obv_flow"
    n = cfg.iparam(k, "lookback")
    obv = ind.obv(df)
    change = obv - obv.shift(n)
    vol_sum = v.rolling(n, min_periods=n).sum()
    ratio = change / vol_sum.where(vol_sum > 0)
    raw = {"obvChange": _last(change), "volumeSum": _last(vol_sum), "flowRatio": _last(ratio)}
    return make_factor(cfg, k, band_score(cfg, k, "flowRatio", ratio), raw, {"flowRatio": raw["flowRatio"]})


def _volume_surge(df, c, v, bench, cfg):
    k = "volume_surge"
    short, long = cfg.iparam(k, "short"), cfg.iparam(k, "long")
    long_avg = ind.sma(v, long)
    surge = ind.sma(v, short) / long_avg.where(long_avg > 0)
    change = c / c.shift(short) - 1
    raw = {"volumeRatio": _last(surge), "priceChange": _last(change)}
    score = np.sign(c - c.shift(short)) * band_score(cfg, k, "volumeRatio", surge)
    return make_factor(cfg, k, score, raw, {"volumeRatio": raw["volumeRatio"]})


_COMPUTE = {
    "ma_alignment": _ma_alignment, "ma20_slope": _ma20_slope, "adx_direction": _adx_direction,
    "relative_strength": _relative_strength, "rsi": _rsi, "macd_hist": _macd_hist, "roc20": _roc20,
    "bb_pctb": _bb_pctb, "atr_regime": _atr_regime, "obv_flow": _obv_flow, "volume_surge": _volume_surge,
}


def _alignment_note(c, fast, mid, slow, cfg: StrategyConfig) -> str:
    if None in (c, fast, mid):
        return ""
    f, m, s = (cfg.iparam("ma_alignment", n) for n in ("fast", "mid", "slow"))
    if slow is not None and c > fast > mid > slow:
        return f"정배열 (종가 > {f}일 > {m}일 > {s}일)"
    if slow is not None and c < fast < mid < slow:
        return f"역배열 (종가 < {f}일 < {m}일 < {s}일)"
    return "혼조"
