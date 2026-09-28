"""분석 작업: 시세 데이터를 모아 점수 모델을 실행하고 결과 dict(camelCase, schemaVersion 2)를 만든다.

worker(Kafka) 와 시세 API(overview regime)가 공유한다.
"""
import logging
from datetime import datetime, timezone

import pandas as pd

from app.analysis.schemas import SCHEMA_VERSION
from app.analysis.scoring.composite import SIGNAL_LABELS, evaluate
from app.analysis.scoring.fundamental import fundamental_factors
from app.analysis.scoring.primitives import Factor
from app.analysis.scoring.regime import regime_factors
from app.analysis.scoring.risk import risk_plan
from app.analysis.scoring.technical import technical_factors
from app.analysis.scoring.weights import MIN_BARS, MODEL_VERSION
from app.core.cache import get_or_load
from app.core.errors import BadRequest, InsufficientData
from app.market.models import Market, SymbolInfo
from app.market.service import MarketDataService, get_service

logger = logging.getLogger(__name__)

DAILY_LIMIT = 500
STRATEGY_CACHE_TTL = 600
INDEX_NAMES = {"KOSPI": "코스피", "KOSDAQ": "코스닥", "SPX": "S&P 500", "IXIC": "나스닥 종합", "KRW-BTC": "비트코인"}


def infer_market(market: str | None, symbol: str | None) -> Market:
    """요청의 market 이 시장 코드가 아니면(구 API 의 STOCK 등) 종목 코드로 추정한다."""
    if market in Market.__members__:
        return Market(market)
    code = (symbol or "").upper()
    if code.startswith("KRW-"):
        return Market.CRYPTO
    if code.isdigit() and len(code) == 6:
        return Market.KR_STOCK
    return Market.US_STOCK


def benchmark_code(sym: SymbolInfo) -> str:
    if sym.market == Market.KR_STOCK:
        return "KOSDAQ" if sym.exchange.startswith("KOSDAQ") else "KOSPI"
    if sym.market == Market.US_STOCK:
        return "IXIC" if sym.exchange == "NASDAQ" else "SPX"
    return "KRW-BTC"


def regime_index_code(market: Market, sym: SymbolInfo | None = None) -> str:
    if market == Market.KR_STOCK:
        return benchmark_code(sym) if sym else "KOSPI"
    return "SPX" if market == Market.US_STOCK else "KRW-BTC"


def _index_close(svc: MarketDataService, code: str) -> pd.Series:
    if code == "KRW-BTC":
        df, _, _ = svc.get_candles(Market.CRYPTO, "KRW-BTC", "1d", limit=DAILY_LIMIT)
    else:
        df = svc.get_index_daily(code, DAILY_LIMIT)
    return df["close"]


def _vix(svc: MarketDataService, market: Market) -> pd.Series | None:
    if market == Market.CRYPTO:
        return None
    try:
        return svc.get_index_daily("VIX", DAILY_LIMIT)["close"]
    except Exception as e:
        logger.warning(f"VIX 조회 실패: {e}")
        return None


def build_regime(svc: MarketDataService, market: Market, sym: SymbolInfo | None = None) -> list[Factor]:
    code = regime_index_code(market, sym)
    breadth = svc.kr_breadth() if market == Market.KR_STOCK else svc.crypto_breadth() if market == Market.CRYPTO else None
    fear_greed = svc.fear_greed() if market == Market.CRYPTO else None
    return regime_factors(market.value, _index_close(svc, code), INDEX_NAMES.get(code, code), _vix(svc, market),
                          breadth=breadth, fear_greed=fear_greed)


def _daily(svc: MarketDataService, sym: SymbolInfo) -> tuple[pd.DataFrame, str]:
    df, source, _ = svc.get_candles(sym.market, sym.code, "1d", limit=DAILY_LIMIT)
    if len(df) < MIN_BARS:
        raise InsufficientData(f"일봉이 {len(df)}개뿐이라 분석할 수 없습니다 (최소 {MIN_BARS}개).")
    return df, source


def run_strategy(market: Market, code: str, params: dict | None = None, include: tuple[str, ...] = (
        "technical", "fundamental", "regime")) -> dict:
    """종합 전략 분석. include 로 그룹을 제한하면 TECHNICAL 등 부분 분석이 된다."""
    params = params or {}
    svc = get_service()
    sym = svc.get_symbol(market, code)
    interval = params.get("interval", "1d")
    if interval != "1d":
        raise BadRequest("전략 분석은 일봉(1d) 기준만 지원합니다.")
    df, candle_source = _daily(svc, sym)
    as_of = df.index[-1].strftime("%Y-%m-%d")

    def compute() -> dict:
        warnings: list[str] = []
        sources = {"candles": candle_source}
        groups: dict[str, list[Factor]] = {}

        if "technical" in include:
            bench = benchmark_code(sym)
            bench_close = None
            if not (market == Market.CRYPTO and sym.code == "KRW-BTC"):
                try:
                    bench_close = _index_close(svc, bench)
                    sources["benchmark"] = INDEX_NAMES.get(bench, bench)
                except Exception as e:
                    warnings.append("벤치마크 데이터를 가져오지 못해 상대강도를 제외했습니다.")
                    logger.warning(f"벤치마크 조회 실패: {bench}: {e}")
            groups["technical"] = technical_factors(df, bench_close)

        if "fundamental" in include and market != Market.CRYPTO:
            fundamentals = None
            try:
                fundamentals = svc.get_fundamentals(market, sym.code)
                sources["fundamentals"] = fundamentals.source
            except Exception as e:
                warnings.append("재무 데이터를 가져오지 못해 기본적 분석을 제외했습니다.")
                logger.warning(f"재무 조회 실패: {sym.key}: {e}")
            groups["fundamental"] = fundamental_factors(fundamentals)

        if "regime" in include:
            try:
                groups["regime"] = build_regime(svc, market, sym)
            except Exception as e:
                warnings.append("시장 국면 데이터를 가져오지 못해 제외했습니다.")
                logger.warning(f"시장 국면 조회 실패: {market.value}: {e}")

        ev = evaluate(market.value, groups)
        risk = risk_plan(market.value, df, params.get("accountEquity"), params.get("riskPct"))
        if sym.warning:
            warnings.append("업비트 투자유의·주의 종목입니다.")
        return {
            "schemaVersion": SCHEMA_VERSION, "modelVersion": MODEL_VERSION,
            "market": market.value, "symbol": sym.code, "name": sym.name, "interval": "1d", "asOf": as_of,
            "lastPrice": float(df["close"].iloc[-1]), "currency": sym.currency,
            "score": ev["score"], "signal": ev["signal"], "strength": ev["strength"],
            "confidence": ev["confidence"], "groups": ev["groups"], "risk": risk,
            "warnings": ev["warnings"] + risk.pop("warnings") + warnings,
            "dataSources": sources, "summary": summarize(sym.name, ev),
        }

    # 계정 규모(수량 계산)가 들어간 요청은 개인화 결과라 캐시하지 않는다
    if params.get("accountEquity"):
        return compute()
    key = f"strategy:{market.value}:{sym.code}:{'-'.join(include)}:{as_of}:{MODEL_VERSION}:{params.get('riskPct')}"
    return get_or_load(key, STRATEGY_CACHE_TTL, compute)


def run_market_trend(market: Market) -> dict:
    """시장 국면만 평가 (MARKET_TREND)"""
    svc = get_service()
    code = regime_index_code(market)
    factors = build_regime(svc, market)
    ev = evaluate(market.value, {"regime": factors})
    name = INDEX_NAMES.get(code, code)
    return {
        "schemaVersion": SCHEMA_VERSION, "modelVersion": MODEL_VERSION,
        "market": market.value, "symbol": code, "name": name, "interval": "1d",
        "asOf": datetime.now(timezone.utc).strftime("%Y-%m-%d"),
        "score": ev["score"], "signal": ev["signal"], "strength": ev["strength"],
        "confidence": ev["confidence"], "groups": ev["groups"], "risk": None,
        "warnings": ev["warnings"], "dataSources": {"index": name},
        "summary": summarize(f"{name} 시장", ev),
    }


def regime_summary() -> dict:
    """시장 개요용: 시장별 국면 점수(0~100)와 라벨. 실패한 시장은 제외."""
    def load() -> dict:
        out = {}
        for m in Market:
            try:
                r = run_market_trend(m)
                out[m.value] = {"score": r["score"], "label": _tone(((r["score"] or 50) - 50) / 50)}
            except Exception as e:
                logger.warning(f"시장 국면 요약 실패: {m.value}: {e}")
        return out
    return get_or_load("mkt:regime:summary", 600, load)


def _tone(s: float | None) -> str:
    if s is None:
        return "데이터 없음"
    if s >= 0.3:
        return "강세"
    if s >= 0.1:
        return "약한 강세"
    if s <= -0.3:
        return "약세"
    if s <= -0.1:
        return "약한 약세"
    return "중립"


def summarize(name: str, ev: dict) -> str:
    parts = [f"{g['label']} {_tone(g['score'])}" for g in ev["groups"] if g["score"] is not None]
    factors = [f for g in ev["groups"] for f in g["factors"] if f["contribution"]]
    pos = [f["label"] for f in sorted(factors, key=lambda f: -f["contribution"])[:2] if f["contribution"] > 0.5]
    neg = [f["label"] for f in sorted(factors, key=lambda f: f["contribution"])[:2] if f["contribution"] < -0.5]
    text = f"{name}: {', '.join(parts)} → {SIGNAL_LABELS[ev['strength']]} ({ev['score']:.0f}점)"
    if pos:
        text += f". 강점: {', '.join(pos)}"
    if neg:
        text += f". 약점: {', '.join(neg)}"
    return text
