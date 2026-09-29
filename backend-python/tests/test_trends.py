import json
from pathlib import Path

import numpy as np
import pandas as pd
import pytest

from app.market import briefing as briefing_module
from app.market.briefing import T, build_briefing, briefing_dates, get_briefing, josa
from app.market.models import Market
from app.market.providers.macro_provider import MacroProvider
from app.market.providers.naver_provider import NaverProvider
from app.market.sectors import SectorEtf
from app.market.trends import quadrant, rank_categories, rank_groups, sector_rotation, trade_concentration

FIX = Path(__file__).parent / "fixtures"


def load(name):
    return json.loads((FIX / name).read_text(encoding="utf-8"))


def series(daily_returns: list[float], start=100.0) -> pd.Series:
    idx = pd.date_range("2026-01-01", periods=len(daily_returns), freq="D", tz="UTC")
    return pd.Series(start * np.cumprod(1 + np.array(daily_returns)), index=idx)


N = 160
BENCH = series([0.001] * N)


def etf(key):
    return SectorEtf(key, key, key)


def test_quadrant_mapping():
    assert quadrant(101, 0.5) == "LEADING"
    assert quadrant(101, -0.5) == "WEAKENING"
    assert quadrant(99, -0.5) == "LAGGING"
    assert quadrant(99, 0.5) == "IMPROVING"
    assert quadrant(None, 1) is None


def test_sector_rotation_quadrants_and_leader_rank():
    # 초과수익이 일정하면 RS-Ratio 가 일정해 모멘텀이 0 근처 → 가속·감속·짧은 반전으로 만든다
    leading = series(list(np.linspace(0.0015, 0.005, N)))  # 시장보다 강하고 점점 더 강해짐
    lagging = series(list(np.linspace(-0.0005, -0.004, N)))  # 시장보다 약하고 점점 더 약해짐
    weakening = series([0.004] * (N - 5) + [-0.002] * 5)  # 강했다가 최근 꺾임
    improving = series([-0.002] * (N - 5) + [0.005] * 5)  # 약했다가 최근 반등
    rows = sector_rotation([(etf("lag"), lagging), (etf("lead"), leading), (etf("weak"), weakening),
                            (etf("imp"), improving)], BENCH)
    q = {r["key"]: r["quadrant"] for r in rows}
    assert q == {"lead": "LEADING", "lag": "LAGGING", "weak": "WEAKENING", "imp": "IMPROVING"}
    assert rows[0]["key"] == "lead" and rows[0]["rank"] == 1 and rows[-1]["key"] == "lag"
    lead = rows[0]
    assert lead["excess"]["1m"] == pytest.approx(lead["returns"]["1m"] - (1.001 ** 21 - 1), abs=1e-6)
    assert lead["aboveMa50"] is True and lead["quadrantLabel"] == "주도"
    assert 1 <= len(lead["tail"]) <= 6


def test_sector_rotation_short_history_has_no_quadrant():
    rows = sector_rotation([(etf("new"), series([0.01] * 30))], BENCH)
    assert rows[0]["quadrant"] is None and rows[0]["returns"]["1w"] is not None


def test_naver_groups_and_stocks_parsing(monkeypatch):
    p = NaverProvider()
    monkeypatch.setattr(p, "get_json", lambda url, **kw: load("naver_group_stocks.json") if "/278" in url
                        else load("naver_industry.json"))
    groups = p.groups("industry")
    assert groups[0]["name"] == "전자장비와기기" and groups[0]["changeRate"] == pytest.approx(0.0185)
    stocks = p.group_stocks("industry", 278)
    s = stocks[0]
    assert s["code"] == "950250" and s["exchange"] == "KOSDAQ" and s["price"] == 4355
    assert s["tradeValue"] == 34_442_000_000 and s["changeRate"] == pytest.approx(0.30)
    ranked = rank_groups(groups, top=3)
    assert all(g["total"] >= 5 for g in ranked["top"])  # 종목 1개짜리(담배) 제외
    assert ranked["top"][0]["advanceRatio"] == pytest.approx(35 / 105, abs=1e-4)


def test_coin_categories_parsing(monkeypatch):
    p = MacroProvider()
    monkeypatch.setattr(p, "get_json", lambda url, **kw: load("coingecko_categories.json"))
    cats = p.coin_categories()
    assert cats[0]["id"] == "smart-contract-platform" and abs(cats[0]["change24h"]) < 1  # % → 비율
    extra = [{"id": "tiny", "name": "tiny", "marketCap": 1e6, "change24h": 0.3},
             {"id": "odd", "name": "odd", "marketCap": 5e9, "change24h": 1.02}]
    ranked = rank_categories(cats + extra, top=3)
    assert all(c["id"] not in ("tiny", "odd") for c in ranked["top"])  # 소형·이상치 제외


def test_trade_concentration():
    quotes = [{"tradeValue": v} for v in [50, 30, 10, 5, 5]]
    assert trade_concentration(quotes, top=2) == {"topN": 2, "share": 0.8, "total": 100}
    assert trade_concentration([], top=2) is None


@pytest.mark.parametrize("word, pair, expected", [
    ("반도체", "은/는", "는"), ("조선", "은/는", "은"), ("국내 주식", "은/는", "은"),
    ("암호화폐", "이/가", "가"), ("은행·증권", "이/가", "이"),
])
def test_josa(word, pair, expected):
    assert josa(word, pair) == expected


OVERVIEW = {
    "indices": [
        {"key": "INDEX:KOSPI", "name": "코스피", "changeRate": -0.0103, "price": 6818.6},
        {"key": "INDEX:KOSDAQ", "name": "코스닥", "changeRate": 0.0021, "price": 900},
        {"key": "INDEX:VIX", "name": "VIX", "changeRate": 0.05, "price": 27.3},
        {"key": "INDEX:USDKRW", "name": "원/달러", "changeRate": 0.0061, "price": 1400},
        {"key": "CRYPTO:KRW-BTC", "name": "비트코인", "changeRate": 0.012, "price": 1.1e8},
    ],
    "fearGreed": {"value": 80},
}
REGIME = {"score": 61.5, "label": "약한 강세",
          "factors": [{"label": "지수 추세", "contribution": 4.5}, {"label": "시장 폭·심리", "contribution": -2.5}]}


def sector_row(name, q, ex3m, r1d):
    return {"name": name, "quadrant": q, "rsRatio": 101.2, "rsMomentum": 0.5, "excess": {"3m": ex3m},
            "returns": {"1d": r1d}}


def test_build_briefing_kr_is_deterministic():
    trends = {
        "benchmark": "코스피",
        "sectors": [sector_row("반도체", "LEADING", 0.183, 0.021), sector_row("조선", "LEADING", 0.12, -0.004),
                    sector_row("은행", "IMPROVING", -0.02, 0.01), sector_row("건설", "LAGGING", -0.15, -0.031)],
        "groups": {"industry": {"top": [{"name": "반도체와반도체장비", "changeRate": 0.024, "rise": 60, "total": 100}]}},
        "breadth": 0.35,
    }
    movers = {"mostActive": [{"code": "005930", "name": "삼성전자", "changeRate": 0.045}]}
    b = build_briefing(Market.KR_STOCK, "2026-09-29", OVERVIEW, REGIME, trends, movers)
    assert b["headline"] == "국내 주식은 약한 강세 국면(62점)입니다. 코스피 -1.03%, 코스닥 +0.21%."
    texts = [s["text"] for sec in b["sections"] for s in sec["sentences"]]
    assert "반도체·조선이 코스피보다 강하고 상대강도도 계속 오르는 주도 구간에 있습니다." in texts
    assert "최근 3개월 코스피 대비 초과수익은 반도체(+18.3%), 조선(+12.0%) 순으로 큽니다." in texts
    assert "은행은 상대강도가 좋아지기 시작했습니다 (개선)." in texts
    assert "건설은 시장 대비 소외되어 있습니다." in texts
    assert "오늘은 반도체(+2.10%)가 가장 강했고 건설(-3.10%)가 가장 약했습니다." in texts
    assert T["breadth_weak"].format(ratio="35.0%") in texts
    assert "거래대금 상위 종목 중 삼성전자(+4.50%)가 강하게 올랐습니다." in texts
    alerts = next(sec for sec in b["sections"] if sec["key"] == "alerts")["sentences"]
    assert [a["text"] for a in alerts] == [T["vix_high"].format(vix=27.3), T["fx_move"].format(rate="+0.61%")]
    lead = next(s for sec in b["sections"] for s in sec["sentences"] if "주도 구간" in s["text"])
    assert lead["evidence"] == {"반도체": "RS 101.2 / 모멘텀 +0.50", "조선": "RS 101.2 / 모멘텀 +0.50"}


def test_build_briefing_crypto_alerts_and_no_alert():
    b = build_briefing(Market.CRYPTO, "2026-09-29", OVERVIEW, {"score": 50, "label": "중립", "factors": []}, {}, None)
    alerts = next(sec for sec in b["sections"] if sec["key"] == "alerts")["sentences"]
    assert alerts[0]["text"] == T["fg_greed"].format(fg=80)
    calm = {"indices": [{"key": "INDEX:SPX", "name": "S&P 500", "changeRate": 0.001, "price": 7000},
                        {"key": "INDEX:VIX", "name": "VIX", "changeRate": 0, "price": 18}]}
    b = build_briefing(Market.US_STOCK, "2026-09-29", calm, None, None, None)
    assert b["headline"].startswith("미국 주식은 판단 보류 국면")
    assert b["sections"][-1]["sentences"][0]["text"] == T["no_alert"]


def test_briefing_snapshot_and_dates(fake_redis, monkeypatch, service):
    calls = []
    monkeypatch.setattr(service, "get_overview", lambda: OVERVIEW)
    monkeypatch.setattr(service, "get_movers", lambda m, n: {"mostActive": []})
    monkeypatch.setattr("app.market.trends.load_trends", lambda svc, m: calls.append(m) or {"breadth": 0.7})
    monkeypatch.setattr(briefing_module, "_regime_detail", lambda m: REGIME)
    today = briefing_module.market_date(Market.KR_STOCK)
    b = get_briefing(service, Market.KR_STOCK)
    assert b["date"] == today and calls == [Market.KR_STOCK]
    assert get_briefing(service, Market.KR_STOCK) == b  # 10분 캐시
    assert briefing_dates(Market.KR_STOCK) == [today]
    assert get_briefing(service, Market.KR_STOCK, "2000-01-01") is None
