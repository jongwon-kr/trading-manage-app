"""시장 국면 팩터: 지수 추세, 변동성 국면, 시장 폭·심리.

지수 추세·변동성은 시계열(백테스트 가능), 시장 폭·심리는 당일 스냅샷만 있어 라이브 점수에서만 쓴다.
"""
import pandas as pd

from app.analysis import indicators as ind
from app.analysis.scoring.primitives import Factor, clip_lin, interp
from app.analysis.scoring.weights import REGIME_FACTORS


def _last(s: pd.Series | None) -> float | None:
    if s is None or len(s) == 0 or pd.isna(s.iloc[-1]):
        return None
    return round(float(s.iloc[-1]), 6)


def index_trend(index_close: pd.Series) -> pd.Series:
    ma50, ma200 = ind.sma(index_close, 50), ind.sma(index_close, 200)
    parts = pd.concat([clip_lin(index_close / ma50 - 1, 0.05), clip_lin(ma50 / ma200 - 1, 0.05)], axis=1)
    # MA200 이 없는 기간은 MA50 항목만 사용
    return parts.mean(axis=1, skipna=True).where(parts.iloc[:, 0].notna())


def vix_band(vix: pd.Series) -> pd.Series:
    return interp(vix, [12, 16, 20, 28, 40], [0.6, 0.3, 0, -0.6, -1])


def realized_vol_band(index_close: pd.Series, periods_per_year: int) -> pd.Series:
    """지수 20일 실현변동성이 최근 1년 중 어느 백분위인지 → 높을수록 위험회피"""
    pct = ind.rolling_pct_rank(ind.realized_vol(index_close, 20, periods_per_year), 252, min_periods=120)
    return interp(pct, [0.2, 0.5, 0.8, 0.95], [0.4, 0, -0.5, -1])


def regime_factors(market: str, index_close: pd.Series, index_name: str, vix_close: pd.Series | None = None,
                   breadth: float | None = None, fear_greed: int | None = None) -> list[Factor]:
    """market: KR_STOCK | US_STOCK | CRYPTO
    breadth: 상승 종목 비율(0~1, 당일). fear_greed: 코인 공포탐욕지수(0~100, 당일)."""
    trend = index_trend(index_close)
    ma50, ma200 = ind.sma(index_close, 50), ind.sma(index_close, 200)

    if market == "US_STOCK":
        vol = vix_band(vix_close.reindex(index_close.index).ffill()) if vix_close is not None else None
        vol_raw = {"vix": _last(vix_close)}
    elif market == "KR_STOCK":
        rv = realized_vol_band(index_close, 252)
        if vix_close is not None:
            vix = vix_band(vix_close.reindex(index_close.index).ffill())
            vol = pd.concat([rv, vix], axis=1).mean(axis=1, skipna=True).where(rv.notna() | vix.notna())
        else:
            vol = rv
        vol_raw = {"realizedVol20": _last(ind.realized_vol(index_close, 20, 252)), "vix": _last(vix_close)}
    else:
        vol = realized_vol_band(index_close, 365)
        vol_raw = {"btcRealizedVol20": _last(ind.realized_vol(index_close, 20, 365))}

    breadth_score = interp(breadth, [0.35, 0.5, 0.65], [-1, 0, 1]) if breadth is not None else None
    if market == "CRYPTO":
        # 공포탐욕지수는 역발상: 극단적 탐욕은 감점, 공포는 소폭 가점
        fg_score = interp(fear_greed, [10, 25, 50, 75, 90], [0.5, 0.3, 0, -0.3, -0.6]) if fear_greed is not None else None
        parts = [p for p in (breadth_score, fg_score) if p is not None]
        sentiment = sum(parts) / len(parts) if parts else None
    else:
        sentiment = breadth_score  # 미국은 무료 breadth 소스가 없어 None → 재정규화

    raw = {
        "index_trend": {"index": index_name, "close": _last(index_close), "ma50": _last(ma50), "ma200": _last(ma200)},
        "volatility_regime": vol_raw,
        "breadth_sentiment": {"advanceRatio": breadth, "fearGreed": fear_greed},
    }
    scores = {"index_trend": trend, "volatility_regime": vol, "breadth_sentiment": sentiment}
    return [Factor(key=k, label=label, weight=w, score=scores[k], raw=raw[k],
                   note="" if scores[k] is not None else "데이터 없음")
            for k, (w, label) in REGIME_FACTORS.items()]
