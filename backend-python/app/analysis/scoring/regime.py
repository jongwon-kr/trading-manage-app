"""시장 국면 팩터: 지수 추세, 변동성 국면, 시장 폭·심리.

지수 추세·변동성은 시계열(백테스트 가능), 시장 폭·심리는 당일 스냅샷만 있어 라이브 점수에서만 쓴다.
기간·밴드·가중치는 설정(cfg, 기본값 = 모델 v1)에서 읽는다.
"""
import pandas as pd

from app.analysis import indicators as ind
from app.analysis.model.config import StrategyConfig, default_config
from app.analysis.scoring.build import band_score, is_active, make_factor
from app.analysis.scoring.primitives import Factor


def _last(s: pd.Series | None) -> float | None:
    if s is None or len(s) == 0 or pd.isna(s.iloc[-1]):
        return None
    return round(float(s.iloc[-1]), 6)


def regime_factors(market: str, index_close: pd.Series, index_name: str, vix_close: pd.Series | None = None,
                   breadth: float | None = None, fear_greed: int | None = None,
                   cfg: StrategyConfig | None = None) -> list[Factor]:
    """market: KR_STOCK | US_STOCK | CRYPTO
    breadth: 상승 종목 비율(0~1, 당일). fear_greed: 코인 공포탐욕지수(0~100, 당일)."""
    cfg = cfg or default_config()
    out = []
    if is_active(cfg, "index_trend"):
        out.append(_index_trend(index_close, index_name, cfg))
    if is_active(cfg, "volatility_regime"):
        out.append(_volatility(market, index_close, vix_close, cfg))
    if is_active(cfg, "breadth_sentiment"):
        out.append(_breadth_sentiment(market, breadth, fear_greed, cfg))
    return out


def _index_trend(index_close: pd.Series, index_name: str, cfg: StrategyConfig) -> Factor:
    k = "index_trend"
    fast, slow = ind.sma(index_close, cfg.iparam(k, "fast")), ind.sma(index_close, cfg.iparam(k, "slow"))
    x1, x2 = index_close / fast - 1, fast / slow - 1
    parts = pd.concat([band_score(cfg, k, "priceVsFast", x1), band_score(cfg, k, "fastVsSlow", x2)], axis=1)
    # 장기 이동평균이 없는 기간은 첫 항목만 사용
    trend = parts.mean(axis=1, skipna=True).where(parts.iloc[:, 0].notna())
    raw = {"index": index_name, "close": _last(index_close), "maFast": _last(fast), "maSlow": _last(slow)}
    return make_factor(cfg, k, trend, raw, {"priceVsFast": _last(x1), "fastVsSlow": _last(x2)},
                       "" if _last(trend) is not None else "데이터 없음")


def _volatility(market: str, index_close: pd.Series, vix_close: pd.Series | None, cfg: StrategyConfig) -> Factor:
    k = "volatility_regime"
    n, window = cfg.iparam(k, "rvPeriod"), cfg.iparam(k, "rankWindow")
    periods = 365 if market == "CRYPTO" else 252
    vix = vix_close.reindex(index_close.index).ffill() if vix_close is not None else None
    rv = ind.realized_vol(index_close, n, periods)
    rank = ind.rolling_pct_rank(rv, window, min_periods=min(120, window))

    if market == "US_STOCK":
        vol = band_score(cfg, k, "vix", vix) if vix is not None else None
        raw, band_x = {"vix": _last(vix_close)}, {"vix": _last(vix)}
    elif market == "KR_STOCK":
        rv_score = band_score(cfg, k, "realizedVolRank", rank)
        if vix is not None:
            vix_score = band_score(cfg, k, "vix", vix)
            vol = pd.concat([rv_score, vix_score], axis=1).mean(axis=1, skipna=True).where(
                rv_score.notna() | vix_score.notna())
        else:
            vol = rv_score
        raw = {"realizedVol": _last(rv), "realizedVolRank": _last(rank), "vix": _last(vix_close)}
        band_x = {"realizedVolRank": _last(rank), "vix": _last(vix)}
    else:
        vol = band_score(cfg, k, "realizedVolRank", rank)
        raw, band_x = {"realizedVol": _last(rv), "realizedVolRank": _last(rank)}, {"realizedVolRank": _last(rank)}
    has = vol is not None and _last(vol) is not None
    return make_factor(cfg, k, vol, raw, band_x, "" if has else "데이터 없음")


def _breadth_sentiment(market: str, breadth: float | None, fear_greed: int | None, cfg: StrategyConfig) -> Factor:
    k = "breadth_sentiment"
    breadth_score = band_score(cfg, k, "advanceRatio", breadth)
    band_x: dict = {"advanceRatio": breadth}
    if market == "CRYPTO":
        # 공포탐욕지수는 역발상: 극단적 탐욕은 감점, 공포는 소폭 가점
        fg_score = band_score(cfg, k, "fearGreed", fear_greed)
        band_x["fearGreed"] = fear_greed
        parts = [p for p in (breadth_score, fg_score) if p is not None]
        sentiment = sum(parts) / len(parts) if parts else None
    elif market == "US_STOCK":
        sentiment, band_x = None, {}  # 미국은 무료 breadth 소스가 없어 None → 재정규화
    else:
        sentiment = breadth_score
    raw = {"advanceRatio": breadth, "fearGreed": fear_greed}
    return make_factor(cfg, k, sentiment, raw, band_x, "" if sentiment is not None else "데이터 없음")
