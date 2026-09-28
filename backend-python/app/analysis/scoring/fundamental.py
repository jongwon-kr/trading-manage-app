"""기본적 분석 팩터 (주식만). 무료 소스(네이버·yfinance)에서 얻을 수 있는 최신값 기준 단일 시점 점수.

KR 도 전 종목 횡단면(pykrx)이 KRX 로그인을 요구해져 업종 백분위 대신 절대 구간을 쓴다.
과거 시점 재무가 없으므로 백테스트에는 쓰지 않는다 (look-ahead 방지).
"""
from app.analysis.scoring.primitives import Factor, interp
from app.analysis.scoring.weights import FUNDAMENTAL_FACTORS
from app.market.models import Fundamentals


def _mean(values: list[float | None]) -> float | None:
    vals = [v for v in values if v is not None]
    return sum(vals) / len(vals) if vals else None


def fundamental_factors(f: Fundamentals | None) -> list[Factor]:
    if f is None:
        return [Factor(key=k, label=label, weight=w, score=None, note="재무 데이터 없음")
                for k, (w, label) in FUNDAMENTAL_FACTORS.items()]

    # 밸류에이션: 적자(PER ≤ 0)는 강한 감점
    if f.per is not None and f.per <= 0:
        pe_score = -0.8
    else:
        pe_score = interp(f.per, [8, 15, 25, 40, 60], [1, 0.5, 0, -0.5, -1])
    pb_score = interp(f.pbr, [1, 3, 6, 10], [0.6, 0.2, -0.3, -0.8]) if f.pbr and f.pbr > 0 else None
    valuation = _mean([pe_score, pb_score])

    profitability = _mean([
        interp(f.roe, [-0.05, 0, 0.08, 0.15, 0.25], [-1, -0.5, 0, 0.6, 1]),
        interp(f.operating_margin, [0, 0.05, 0.15, 0.30], [-0.6, 0, 0.5, 1]),
    ])
    growth_band = ([-0.3, 0, 0.1, 0.3], [-1, -0.2, 0.4, 1])
    growth = _mean([interp(f.eps_growth, *growth_band), interp(f.revenue_growth, *growth_band)])
    health = interp(f.debt_to_equity, [0.3, 1, 2, 3], [0.6, 0.2, -0.4, -1])
    dividend = (interp(f.dividend_yield * 100, [0, 1, 3, 6, 10], [-0.1, 0, 0.5, 0.8, 0.2])
                if f.dividend_yield is not None else None)

    scores = {
        "valuation": (valuation, {"per": f.per, "pbr": f.pbr}),
        "profitability": (profitability, {"roe": f.roe, "operatingMargin": f.operating_margin}),
        "growth": (growth, {"epsGrowth": f.eps_growth, "revenueGrowth": f.revenue_growth}),
        "health": (health, {"debtToEquity": f.debt_to_equity}),
        "dividend": (dividend, {"dividendYield": f.dividend_yield}),
    }
    return [Factor(key=k, label=label, weight=w, score=scores[k][0], raw=scores[k][1],
                   note="" if scores[k][0] is not None else "데이터 없음")
            for k, (w, label) in FUNDAMENTAL_FACTORS.items()]
