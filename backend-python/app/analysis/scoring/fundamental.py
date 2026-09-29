"""기본적 분석 팩터 (주식만). 무료 소스(네이버·yfinance)에서 얻을 수 있는 최신값 기준 단일 시점 점수.

KR 도 전 종목 횡단면(pykrx)이 KRX 로그인을 요구해져 업종 백분위 대신 절대 구간(밴드)을 쓴다.
과거 시점 재무가 없으므로 백테스트에는 쓰지 않는다 (look-ahead 방지).
밴드·가중치는 설정(cfg, 기본값 = 모델 v1)에서 읽는다.
"""
from app.analysis.model.catalog import factors_of
from app.analysis.model.config import StrategyConfig, default_config
from app.analysis.scoring.build import band_score, is_active, make_factor
from app.analysis.scoring.primitives import Factor
from app.market.models import Fundamentals


def _mean(values: list[float | None]) -> float | None:
    vals = [v for v in values if v is not None]
    return sum(vals) / len(vals) if vals else None


def fundamental_factors(f: Fundamentals | None, cfg: StrategyConfig | None = None) -> list[Factor]:
    cfg = cfg or default_config()
    keys = [s.key for s in factors_of("fundamental") if is_active(cfg, s.key)]
    if f is None:
        return [make_factor(cfg, k, None, {}, {}, "재무 데이터 없음") for k in keys]

    def bs(key, name, x):
        return band_score(cfg, key, name, x)

    # 밸류에이션: 적자(PER ≤ 0)는 고정 점수(기본 −0.8)
    if f.per is not None and f.per <= 0:
        pe_score = cfg.param("valuation", "negativePerScore")
    else:
        pe_score = bs("valuation", "per", f.per)
    pb_score = bs("valuation", "pbr", f.pbr) if f.pbr and f.pbr > 0 else None

    computed = {
        "valuation": (_mean([pe_score, pb_score]), {"per": f.per, "pbr": f.pbr},
                      {"per": f.per, "pbr": f.pbr if f.pbr and f.pbr > 0 else None}),
        "profitability": (_mean([bs("profitability", "roe", f.roe),
                                 bs("profitability", "operatingMargin", f.operating_margin)]),
                          {"roe": f.roe, "operatingMargin": f.operating_margin},
                          {"roe": f.roe, "operatingMargin": f.operating_margin}),
        "growth": (_mean([bs("growth", "epsGrowth", f.eps_growth), bs("growth", "revenueGrowth", f.revenue_growth)]),
                   {"epsGrowth": f.eps_growth, "revenueGrowth": f.revenue_growth},
                   {"epsGrowth": f.eps_growth, "revenueGrowth": f.revenue_growth}),
        "health": (bs("health", "debtToEquity", f.debt_to_equity), {"debtToEquity": f.debt_to_equity},
                   {"debtToEquity": f.debt_to_equity}),
        "dividend": (bs("dividend", "dividendYield", f.dividend_yield), {"dividendYield": f.dividend_yield},
                     {"dividendYield": f.dividend_yield}),
    }
    out = []
    for k in keys:
        score, raw, band_x = computed[k]
        out.append(make_factor(cfg, k, score, raw, band_x, "" if score is not None else "데이터 없음"))
    return out
