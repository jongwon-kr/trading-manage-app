"""시장 동향: 섹터 로테이션(상대강도 사분면)·주도 섹터·오늘의 업종/테마·코인 카테고리.

섹터 추세 (sector_rotation, 순수 함수 — 테스트 가능)
  수익률      1D·1W(5봉)·1M(21봉)·3M(63봉), 벤치마크 대비 초과수익 = 섹터 − 벤치마크
  상대강도선  RS = 섹터 종가 ÷ 벤치마크 종가
  RS-Ratio    100 × RS ÷ RS 의 50일 평균            (100 위 = 시장보다 강함)
  RS-Mom      RS-Ratio − 10일 전 RS-Ratio            (0 위 = 상대강도가 좋아지는 중)
  사분면      주도(Ratio≥100, Mom≥0) · 약화(≥100, <0) · 소외(<100, <0) · 개선(<100, ≥0)  — RRG 방식
  주도 점수   0.2·1W + 0.3·1M + 0.5·3M 초과수익 (높을수록 최근 꾸준히 시장을 이김)
"""
import logging
import math

import pandas as pd

from app.core.cache import get_or_load
from app.core.market_hours import is_market_open
from app.market.models import Market
from app.market.normalize import now_ms
from app.market.sectors import KR_BENCHMARK, KR_SECTOR_ETFS, US_BENCHMARK, US_SECTOR_ETFS, SectorEtf

logger = logging.getLogger(__name__)

PERIODS = {"1d": 1, "1w": 5, "1m": 21, "3m": 63}
LEADER_WEIGHTS = {"1w": 0.2, "1m": 0.3, "3m": 0.5}
RS_MA = 50
RS_MOM = 10
TAIL_POINTS = 6  # 사분면 차트 꼬리 (5봉 간격)
QUADRANT_LABELS = {"LEADING": "주도", "WEAKENING": "약화", "LAGGING": "소외", "IMPROVING": "개선"}
MIN_GROUP_SIZE = 5  # 종목이 너무 적은 업종·테마는 순위에서 뺀다
MIN_CATEGORY_CAP = 1e9  # 코인 카테고리 최소 시총(USD)
MAX_CATEGORY_MOVE = 0.5  # 24시간 ±50% 초과는 카테고리 구성 변경 등 이상치로 보고 제외


def _ret(s: pd.Series, n: int) -> float | None:
    s = s.dropna()
    if len(s) <= n or s.iloc[-1 - n] == 0:
        return None
    return float(s.iloc[-1] / s.iloc[-1 - n] - 1)


def _r(v, d=6):
    return None if v is None or (isinstance(v, float) and math.isnan(v)) else round(float(v), d)


def quadrant(ratio: float | None, mom: float | None) -> str | None:
    if ratio is None or mom is None:
        return None
    if ratio >= 100:
        return "LEADING" if mom >= 0 else "WEAKENING"
    return "IMPROVING" if mom >= 0 else "LAGGING"


def sector_rotation(sectors: list[tuple[SectorEtf, pd.Series]], bench: pd.Series) -> list[dict]:
    """sectors: [(섹터, 일봉 종가)], bench: 벤치마크 종가 (날짜 인덱스). 주도 점수 내림차순."""
    bench = bench.dropna()
    bench_ret = {k: _ret(bench, n) for k, n in PERIODS.items()}
    rows = []
    for etf, close in sectors:
        close = close.dropna()
        if len(close) < 2:
            continue
        aligned = pd.concat([close, bench], axis=1, join="inner").dropna()
        rets = {k: _ret(close, n) for k, n in PERIODS.items()}
        excess = {k: (rets[k] - bench_ret[k]) if rets[k] is not None and bench_ret[k] is not None else None
                  for k in PERIODS}
        ratio = mom = None
        tail: list[dict] = []
        if len(aligned) >= RS_MA + RS_MOM:
            rs = aligned.iloc[:, 0] / aligned.iloc[:, 1]
            rs_ratio = 100 * rs / rs.rolling(RS_MA).mean()
            rs_mom = rs_ratio - rs_ratio.shift(RS_MOM)
            ratio, mom = _r(rs_ratio.iloc[-1], 3), _r(rs_mom.iloc[-1], 3)
            for i in range(TAIL_POINTS - 1, -1, -1):
                j = len(rs_ratio) - 1 - i * 5
                if j >= 0 and not (pd.isna(rs_ratio.iloc[j]) or pd.isna(rs_mom.iloc[j])):
                    tail.append({"ratio": _r(rs_ratio.iloc[j], 3), "momentum": _r(rs_mom.iloc[j], 3)})
        ma50 = close.rolling(50).mean().iloc[-1] if len(close) >= 50 else None
        parts = [(LEADER_WEIGHTS[k], excess[k]) for k in LEADER_WEIGHTS if excess[k] is not None]
        leader = sum(w * v for w, v in parts) / sum(w for w, _ in parts) if parts else None
        q = quadrant(ratio, mom)
        rows.append({
            "key": etf.key, "name": etf.name, "ticker": etf.ticker, "close": _r(close.iloc[-1], 4),
            "returns": {k: _r(v) for k, v in rets.items()}, "excess": {k: _r(v) for k, v in excess.items()},
            "aboveMa50": bool(close.iloc[-1] > ma50) if ma50 is not None and not pd.isna(ma50) else None,
            "rsRatio": ratio, "rsMomentum": mom, "quadrant": q, "quadrantLabel": QUADRANT_LABELS.get(q),
            "leaderScore": _r(leader), "tail": tail,
        })
    rows.sort(key=lambda r: -1e9 if r["leaderScore"] is None else -r["leaderScore"])
    for i, r in enumerate(rows):
        r["rank"] = i + 1
    return rows


def rank_groups(groups: list[dict], top: int = 8) -> dict:
    """Naver 업종·테마 → 상승·하락 상위 (구성 종목 MIN_GROUP_SIZE 개 이상)"""
    ok = [g for g in groups if g["total"] >= MIN_GROUP_SIZE]
    ok.sort(key=lambda g: g["changeRate"], reverse=True)
    for g in ok:
        g["advanceRatio"] = round(g["rise"] / g["total"], 4) if g["total"] else None
    return {"top": ok[:top], "bottom": list(reversed(ok[-top:])) if len(ok) > top else [], "count": len(ok)}


def rank_categories(cats: list[dict], top: int = 8) -> dict:
    ok = [c for c in cats if (c.get("marketCap") or 0) >= MIN_CATEGORY_CAP and c.get("change24h") is not None
          and abs(c["change24h"]) <= MAX_CATEGORY_MOVE]
    ok.sort(key=lambda c: c["change24h"], reverse=True)
    return {"top": ok[:top], "bottom": list(reversed(ok[-top:])) if len(ok) > top else [], "count": len(ok)}


def trade_concentration(quotes: list[dict], top: int = 10) -> dict | None:
    """거래대금 상위 top 종목이 전체 거래대금에서 차지하는 비중 (쏠림)"""
    values = sorted((q.get("tradeValue") or 0 for q in quotes), reverse=True)
    total = sum(values)
    return {"topN": top, "share": round(sum(values[:top]) / total, 4), "total": total} if total > 0 else None


# ============================================================ 데이터 수집 (서비스 의존)

def _ttl(market: Market) -> int:
    return 600 if market == Market.CRYPTO or is_market_open(market) else 21600


def _sector_closes(svc, etfs: tuple[SectorEtf, ...], bench_ticker: str, kr: bool) -> tuple[list, pd.Series, str]:
    """yfinance 한 번에 받기 → 빠진 KR ETF 는 FDR 로 개별 보충"""
    tickers = [f"{e.ticker}.KS" if kr else e.ticker for e in etfs] + [bench_ticker]
    source = "yfinance"
    try:
        frames = svc.yf.daily_closes(tickers, period="9mo")
    except Exception as e:
        logger.warning(f"섹터 ETF yfinance 조회 실패: {e}")
        frames = {}
    out = []
    for e, t in zip(etfs, tickers):
        df = frames.get(t)
        if (df is None or df.empty) and kr:
            try:
                df = svc.fdr.daily_candles(e.ticker, pd.Timestamp.now(tz="UTC") - pd.Timedelta(days=280), None)
                source = "yfinance+fdr"
            except Exception as ex:
                logger.warning(f"섹터 ETF FDR 조회 실패: {e.ticker}: {ex}")
                df = None
        if df is not None and not df.empty:
            out.append((e, df["close"]))
    bench = frames.get(bench_ticker)
    if bench is None or bench.empty:
        bench = svc.get_index_daily("KOSPI" if kr else "SPX", 250)
    return out, bench["close"], source


def load_trends(svc, market: Market) -> dict:
    def load() -> dict:
        warnings: list[str] = []
        out: dict = {"market": market.value, "sectors": [], "groups": None, "categories": None}
        if market in (Market.KR_STOCK, Market.US_STOCK):
            kr = market == Market.KR_STOCK
            closes, bench, source = _sector_closes(svc, KR_SECTOR_ETFS if kr else US_SECTOR_ETFS,
                                                   KR_BENCHMARK if kr else US_BENCHMARK, kr)
            out["sectors"] = sector_rotation(closes, bench)
            out["benchmark"] = "코스피" if kr else "S&P 500"
            out["sectorSource"] = f"섹터 ETF ({source})"
            if len(closes) < len(KR_SECTOR_ETFS if kr else US_SECTOR_ETFS):
                warnings.append("일부 섹터 ETF 시세를 가져오지 못했습니다.")
        if market == Market.KR_STOCK:
            try:
                out["groups"] = {"industry": rank_groups(svc.naver.groups("industry")),
                                 "theme": rank_groups(svc.naver.groups("theme"))}
            except Exception as e:
                warnings.append("오늘의 업종·테마 등락을 가져오지 못했습니다.")
                logger.warning(f"네이버 업종·테마 조회 실패: {e}")
            out["breadth"] = svc.kr_breadth()
        if market == Market.CRYPTO:
            try:
                out["categories"] = rank_categories(svc.macro.coin_categories())
            except Exception as e:
                warnings.append("코인 카테고리(CoinGecko)를 가져오지 못했습니다.")
                logger.warning(f"CoinGecko 카테고리 조회 실패: {e}")
            try:
                movers = svc.get_movers(Market.CRYPTO, 30)
                quotes = svc.upbit.quotes([s.code for s in svc.symbols.all(Market.CRYPTO)])
                out["concentration"] = trade_concentration([q.dump() for q in quotes])
                out["mostActive"] = movers["mostActive"][:10]
            except Exception as e:
                logger.warning(f"업비트 거래대금 집중도 계산 실패: {e}")
            out["breadth"] = svc.crypto_breadth()
            try:
                out["fearGreedHistory"] = svc.macro.fear_greed(30)
            except Exception as e:
                logger.warning(f"공포탐욕지수 이력 조회 실패: {e}")
            # CoinGecko 무료 한도로 직전 카테고리 조회 뒤 실패할 수 있어, 캐시된 시장 개요 값을 먼저 쓴다
            try:
                out["btcDominance"] = svc.get_overview().get("btcDominance") or svc.macro.btc_dominance()
            except Exception:
                out["btcDominance"] = None
        out["warnings"] = warnings
        out["asOf"] = now_ms()
        return out

    return get_or_load(f"mkt:trends:{market.value}", _ttl(market), load)


def load_group_stocks(svc, market: Market, kind: str, group_id: str) -> dict:
    """사분면·업종·테마 행을 눌렀을 때 구성 종목. KR: 네이버 업종/테마, US: yfinance 섹터 상위 기업"""
    def load() -> dict:
        if market == Market.KR_STOCK and kind in ("industry", "theme"):
            stocks = svc.naver.group_stocks(kind, int(group_id))
            return {"kind": kind, "id": group_id, "stocks": stocks, "source": "naver"}
        if market == Market.US_STOCK and kind == "sector":
            etf = next((e for e in US_SECTOR_ETFS if e.key == group_id), None)
            if etf is None or etf.yf_sector is None:
                return {"kind": kind, "id": group_id, "stocks": [], "source": "yfinance"}
            top = svc.yf.sector_top(etf.yf_sector)
            try:
                quotes = {q.code: q for q in svc.get_quotes([f"US_STOCK:{t['code']}" for t in top])} if top else {}
            except Exception as e:  # 시세가 없어도 구성 종목 목록은 보여 준다
                logger.warning(f"섹터 구성 종목 시세 조회 실패: {etf.key}: {e}")
                quotes = {}
            stocks = [{**t, "price": quotes[t["code"]].price if t["code"] in quotes else None,
                       "changeRate": quotes[t["code"]].change_rate if t["code"] in quotes else None} for t in top]
            return {"kind": kind, "id": group_id, "name": etf.name, "stocks": stocks, "source": "yfinance"}
        return {"kind": kind, "id": group_id, "stocks": [], "source": None}

    return get_or_load(f"mkt:trends:group:{market.value}:{kind}:{group_id}", _ttl(market), load)
