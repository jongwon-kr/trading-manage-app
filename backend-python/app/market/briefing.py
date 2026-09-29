"""규칙 기반 시장 브리핑 — 지수·국면·섹터 로테이션·업종/테마·코인 카테고리·경고 신호를 문장으로.

- LLM 을 쓰지 않는다: 같은 입력이면 항상 같은 문장 (build_briefing 은 순수 함수, 테스트로 고정).
- 문장마다 evidence(근거 수치)를 붙여 화면에서 확인할 수 있게 한다.
- 스냅샷: briefing:{market}:{YYYY-MM-DD} (30일), 날짜 목록은 zset briefing:dates:{market}.
"""
import logging
from datetime import datetime

from app.core.cache import get_json, get_or_load, set_json
from app.core.market_hours import market_timezone
from app.core.redis_client import get_redis
from app.market.models import Market
from app.market.normalize import now_ms

logger = logging.getLogger(__name__)

SNAPSHOT_TTL = 30 * 86400
LIVE_TTL = 600
MARKET_NAMES = {Market.KR_STOCK: "국내 주식", Market.US_STOCK: "미국 주식", Market.CRYPTO: "암호화폐"}
INDEX_KEYS = {
    Market.KR_STOCK: ["INDEX:KOSPI", "INDEX:KOSDAQ"],
    Market.US_STOCK: ["INDEX:SPX", "INDEX:IXIC"],
    Market.CRYPTO: ["CRYPTO:KRW-BTC", "CRYPTO:KRW-ETH"],
}

# 경고 기준
VIX_HIGH, VIX_LOW = 25, 13
FG_GREED, FG_FEAR = 75, 25
FX_MOVE = 0.005
BREADTH_WEAK, BREADTH_STRONG = 0.40, 0.60
CONCENTRATION_HIGH = 0.6

# 문구 템플릿 (테스트로 고정)
T = {
    "headline": "{market}{eun} {label} 국면({score:.0f}점)입니다. {indices}.",
    "indices": "{items}",
    "regime_drivers": "국면 점수를 가장 끌어올린 요인은 {pos}, 가장 끌어내린 요인은 {neg}입니다.",
    "regime_pos_only": "국면 점수를 가장 끌어올린 요인은 {pos}입니다.",
    "leaders": "{names}{ga} {bench}보다 강하고 상대강도도 계속 오르는 주도 구간에 있습니다.",
    "long_term": "최근 3개월 {bench} 대비 초과수익은 {items} 순으로 큽니다.",
    "improving": "{names}{eun} 상대강도가 좋아지기 시작했습니다 (개선).",
    "weakening": "{names}{eun} 아직 강하지만 상대 모멘텀이 꺾이고 있습니다 (약화).",
    "lagging": "{names}{eun} 시장 대비 소외되어 있습니다.",
    "today_sector": "오늘은 {best}({best_ret})가 가장 강했고 {worst}({worst_ret})가 가장 약했습니다.",  # % 뒤라 '가'
    "industries": "업종 상승 상위: {items}.",
    "themes": "테마 상승 상위: {items}.",
    "breadth_weak": "상승 종목 비율이 {ratio}로 지수에 비해 시장 내부 체력이 약합니다.",
    "breadth_strong": "상승 종목 비율이 {ratio}로 고르게 오르는 강한 흐름입니다.",
    "breadth_neutral": "상승 종목 비율은 {ratio}입니다.",
    "categories_top": "강한 코인 카테고리(24시간, 글로벌 시총 기준): {items}.",
    "categories_bottom": "약한 카테고리: {items}.",
    "concentration_high": "거래대금 상위 {n}개 종목이 업비트 전체 거래대금의 {share}를 차지해 쏠림이 큽니다.",
    "concentration": "거래대금 상위 {n}개 종목 비중은 {share}입니다.",
    "movers_active": "거래대금 상위 종목 중 {items}가 강하게 올랐습니다.",
    "movers_gainers": "상승률 상위: {items}.",
    "vix_high": "VIX 가 {vix:.1f}로 높아 변동성 경계 구간입니다.",
    "vix_low": "VIX 가 {vix:.1f}로 매우 낮아 낙관이 과열되지 않았는지 살펴볼 때입니다.",
    "fg_greed": "공포탐욕지수 {fg}(극단적 탐욕) — 추격 매수에 주의하세요.",
    "fg_fear": "공포탐욕지수 {fg}(극단적 공포) — 역발상 관점에서 분할 접근을 검토할 수 있습니다.",
    "fx_move": "원·달러 환율이 {rate} 움직여 외국인 수급 변화에 유의하세요.",
    "risk_off": "시장 국면 점수가 {score:.0f}점으로 낮아 전략 분석의 매수 신호가 관망으로 보류될 수 있습니다.",
    "no_alert": "특별한 경고 신호는 없습니다.",
}


def josa(word: str, pair: str) -> str:
    """받침 유무로 조사 선택: josa('반도체', '은/는') → '는'"""
    with_final, without = pair.split("/")
    ch = word.strip()[-1:] if word and word.strip() else ""
    if "가" <= ch <= "힣":
        return with_final if (ord(ch) - 0xAC00) % 28 else without
    return without if ch.isalpha() else with_final  # 영문·숫자는 대략 받침 없음/있음으로


def pct(v: float | None, digits: int = 2, signed: bool = True) -> str:
    if v is None:
        return "-"
    return f"{v * 100:+.{digits}f}%" if signed else f"{v * 100:.{digits}f}%"


def _names(items: list[str]) -> str:
    return "·".join(items)


def _s(text: str, **evidence) -> dict:
    return {"text": text, "evidence": {k: v for k, v in evidence.items() if v is not None}}


def build_briefing(market: Market, date: str, overview: dict, regime: dict | None, trends: dict | None,
                   movers: dict | None) -> dict:
    """regime: {score, label, factors:[{label, contribution}]} · trends: load_trends 결과 · movers: get_movers 결과"""
    trends = trends or {}
    indices = {i["key"]: i for i in overview.get("indices", [])}
    idx = [indices[k] for k in INDEX_KEYS[market] if k in indices]
    idx_text = ", ".join(f"{i['name']} {pct(i.get('changeRate'))}" for i in idx) or "지수 데이터 없음"
    mname = MARKET_NAMES[market]
    score = (regime or {}).get("score")
    label = (regime or {}).get("label") or "판단 보류"
    headline = T["headline"].format(market=mname, eun=josa(mname, "은/는"), label=label, score=score or 50,
                                    indices=idx_text)

    sections = []
    # 1) 지수·국면
    s1 = [_s(T["indices"].format(items=idx_text), **{i["name"]: pct(i.get("changeRate")) for i in idx})]
    factors = sorted((f for f in (regime or {}).get("factors", []) if f.get("contribution")),
                     key=lambda f: f["contribution"])
    pos = [f for f in reversed(factors) if f["contribution"] > 0.3]
    neg = [f for f in factors if f["contribution"] < -0.3]
    if pos and neg:
        s1.append(_s(T["regime_drivers"].format(pos=pos[0]["label"], neg=neg[0]["label"]),
                     **{pos[0]["label"]: f"{pos[0]['contribution']:+.1f}점", neg[0]["label"]: f"{neg[0]['contribution']:+.1f}점"}))
    elif pos:
        s1.append(_s(T["regime_pos_only"].format(pos=pos[0]["label"]), **{pos[0]["label"]: f"{pos[0]['contribution']:+.1f}점"}))
    sections.append({"key": "index", "title": "지수와 시장 국면", "sentences": s1})

    # 2) 섹터 로테이션 (주식)
    sectors = trends.get("sectors") or []
    if sectors:
        bench = trends.get("benchmark", "시장")
        s2 = []
        by_q = {q: [s for s in sectors if s.get("quadrant") == q] for q in ("LEADING", "IMPROVING", "WEAKENING", "LAGGING")}
        def rs(s):  # 사분면 근거: 상대강도 수준·변화
            return f"RS {s['rsRatio']:.1f} / 모멘텀 {s['rsMomentum']:+.2f}"

        leaders = by_q["LEADING"][:3]
        if leaders:
            names = _names([s["name"] for s in leaders])
            s2.append(_s(T["leaders"].format(names=names, ga=josa(names, "이/가"), bench=bench),
                         **{s["name"]: rs(s) for s in leaders}))
        strong = [s for s in sectors if (s["excess"].get("3m") or 0) > 0][:3]  # sectors 는 주도 점수 순
        strong.sort(key=lambda s: -s["excess"]["3m"])
        if strong:
            s2.append(_s(T["long_term"].format(bench=bench, items=", ".join(f"{s['name']}({pct(s['excess']['3m'], 1)})" for s in strong)),
                         **{s["name"]: pct(s["excess"]["3m"], 1) for s in strong}))
        if by_q["IMPROVING"]:
            names = _names([s["name"] for s in by_q["IMPROVING"][:2]])
            s2.append(_s(T["improving"].format(names=names, eun=josa(names, "은/는")),
                         **{s["name"]: rs(s) for s in by_q["IMPROVING"][:2]}))
        if by_q["WEAKENING"]:
            names = _names([s["name"] for s in by_q["WEAKENING"][:2]])
            s2.append(_s(T["weakening"].format(names=names, eun=josa(names, "은/는")),
                         **{s["name"]: rs(s) for s in by_q["WEAKENING"][:2]}))
        lag = [s for s in reversed(sectors) if s.get("quadrant") == "LAGGING"][:2]
        if lag:
            names = _names([s["name"] for s in lag])
            s2.append(_s(T["lagging"].format(names=names, eun=josa(names, "은/는")),
                         **{s["name"]: rs(s) for s in lag}))
        daily = [s for s in sectors if s["returns"].get("1d") is not None]
        if len(daily) >= 2:
            best = max(daily, key=lambda s: s["returns"]["1d"])
            worst = min(daily, key=lambda s: s["returns"]["1d"])
            s2.append(_s(T["today_sector"].format(best=best["name"], best_ret=pct(best["returns"]["1d"]),
                                                   worst=worst["name"], worst_ret=pct(worst["returns"]["1d"])),
                         **{best["name"]: pct(best["returns"]["1d"]), worst["name"]: pct(worst["returns"]["1d"])}))
        sections.append({"key": "sectors", "title": "주도 섹터", "sentences": s2})

    # 3) 오늘의 흐름
    s3 = []
    groups = trends.get("groups") or {}
    for kind, tmpl in (("industry", "industries"), ("theme", "themes")):
        top = [g for g in (groups.get(kind) or {}).get("top", []) if g["changeRate"] > 0][:3]
        if top:
            s3.append(_s(T[tmpl].format(items=", ".join(f"{g['name']}({pct(g['changeRate'])})" for g in top)),
                         **{g["name"]: f"{pct(g['changeRate'])}, 상승 {g['rise']}/{g['total']}" for g in top}))
    cats = trends.get("categories") or {}
    if cats.get("top"):
        s3.append(_s(T["categories_top"].format(items=", ".join(f"{c['name']}({pct(c['change24h'])})" for c in cats["top"][:3])),
                     **{c["name"]: pct(c["change24h"]) for c in cats["top"][:3]}))
    if cats.get("bottom"):
        s3.append(_s(T["categories_bottom"].format(items=", ".join(f"{c['name']}({pct(c['change24h'])})" for c in cats["bottom"][:3])),
                     **{c["name"]: pct(c["change24h"]) for c in cats["bottom"][:3]}))
    conc = trends.get("concentration")
    if conc:
        tmpl = "concentration_high" if conc["share"] >= CONCENTRATION_HIGH else "concentration"
        s3.append(_s(T[tmpl].format(n=conc["topN"], share=pct(conc["share"], 1, False)), 비중=pct(conc["share"], 1, False)))
    breadth = trends.get("breadth")
    if breadth is not None:
        tmpl = "breadth_weak" if breadth < BREADTH_WEAK else "breadth_strong" if breadth > BREADTH_STRONG else "breadth_neutral"
        s3.append(_s(T[tmpl].format(ratio=pct(breadth, 1, False)), 상승비율=pct(breadth, 1, False)))
    if movers:
        if market == Market.US_STOCK:
            g = movers.get("gainers", [])[:3]
            if g:
                s3.append(_s(T["movers_gainers"].format(items=", ".join(f"{q.get('name') or q['code']}({pct(q['changeRate'])})" for q in g)),
                             **{q["code"]: pct(q["changeRate"]) for q in g}))
        else:
            hot = sorted((q for q in movers.get("mostActive", []) if (q.get("changeRate") or 0) >= 0.03),
                         key=lambda q: -q["changeRate"])[:3]
            if hot:
                items = ", ".join(f"{q.get('name') or q['code']}({pct(q['changeRate'])})" for q in hot)
                s3.append(_s(T["movers_active"].format(items=items),
                             **{(q.get("name") or q["code"]): pct(q["changeRate"]) for q in hot}))
    if s3:
        sections.append({"key": "today", "title": "오늘의 흐름", "sentences": s3})

    # 4) 주의 신호
    s4 = []
    vix = (indices.get("INDEX:VIX") or {}).get("price")
    if market != Market.CRYPTO and vix is not None:
        if vix >= VIX_HIGH:
            s4.append(_s(T["vix_high"].format(vix=vix), VIX=round(vix, 2)))
        elif vix <= VIX_LOW:
            s4.append(_s(T["vix_low"].format(vix=vix), VIX=round(vix, 2)))
    fg = (overview.get("fearGreed") or {}).get("value")
    if market == Market.CRYPTO and fg is not None:
        if fg >= FG_GREED:
            s4.append(_s(T["fg_greed"].format(fg=fg), 공포탐욕지수=fg))
        elif fg <= FG_FEAR:
            s4.append(_s(T["fg_fear"].format(fg=fg), 공포탐욕지수=fg))
    fx = (indices.get("INDEX:USDKRW") or {}).get("changeRate")
    if market == Market.KR_STOCK and fx is not None and abs(fx) >= FX_MOVE:
        s4.append(_s(T["fx_move"].format(rate=pct(fx)), 원달러=pct(fx)))
    if score is not None and score < 25:
        s4.append(_s(T["risk_off"].format(score=score), 국면점수=round(score, 1)))
    if not s4:
        s4.append(_s(T["no_alert"]))
    sections.append({"key": "alerts", "title": "주의 신호", "sentences": s4})

    return {"market": market.value, "date": date, "headline": headline,
            "regime": {"score": score, "label": label, "factors": (regime or {}).get("factors", [])},
            "sections": sections, "generatedAt": now_ms()}


# ============================================================ 수집·스냅샷

def market_date(market: Market, now: datetime | None = None) -> str:
    return (now or datetime.now(market_timezone(market))).astimezone(market_timezone(market)).strftime("%Y-%m-%d")


def _regime_detail(market: Market) -> dict | None:
    from app.analysis.jobs import _tone, run_market_trend  # 순환 import 방지

    def load():
        r = run_market_trend(market)
        factors = [f for g in r["groups"] for f in g["factors"]]  # explain 포함 (화면의 계산 근거 패널용)
        return {"score": r["score"], "label": _tone(((r["score"] or 50) - 50) / 50), "factors": factors}
    try:
        return get_or_load(f"mkt:regime:detail:{market.value}", 600, load)
    except Exception as e:
        logger.warning(f"브리핑용 시장 국면 조회 실패: {market.value}: {e}")
        return None


def generate_briefing(svc, market: Market) -> dict:
    from app.market.trends import load_trends

    def load() -> dict:
        overview = svc.get_overview()
        trends = movers = None
        try:
            trends = load_trends(svc, market)
        except Exception as e:
            logger.warning(f"브리핑용 동향 조회 실패: {market.value}: {e}")
        try:
            movers = svc.get_movers(market, 15)
        except Exception as e:
            logger.warning(f"브리핑용 상위 종목 조회 실패: {market.value}: {e}")
        date = market_date(market)
        b = build_briefing(market, date, overview, _regime_detail(market), trends, movers)
        set_json(f"briefing:{market.value}:{date}", b, SNAPSHOT_TTL)  # 그날 마지막 생성본이 남는다
        try:
            r = get_redis()
            r.zadd(f"briefing:dates:{market.value}", {date: int(date.replace("-", ""))})
            r.zremrangebyrank(f"briefing:dates:{market.value}", 0, -31)  # 최근 30개만
        except Exception as e:
            logger.warning(f"브리핑 날짜 목록 기록 실패: {e}")
        return b

    return get_or_load(f"briefing:live:{market.value}", LIVE_TTL, load)


def get_briefing(svc, market: Market, date: str | None = None) -> dict | None:
    """date 가 없거나 오늘이면 새로 만들고(10분 캐시), 지난 날짜면 스냅샷 (없으면 None)"""
    if not date or date == market_date(market):
        return generate_briefing(svc, market)
    return get_json(f"briefing:{market.value}:{date}")


def briefing_dates(market: Market) -> list[str]:
    try:
        return [d.decode() if isinstance(d, bytes) else d
                for d in get_redis().zrevrange(f"briefing:dates:{market.value}", 0, 13)]
    except Exception:
        return []
