"""ATR 기반 매매 계획 (롱 전용 — 국내 개인·Upbit 현물은 공매도 불가).

  진입 구간  [max(C − 0.5·ATR, MA20), C]  → 진입가 = 중간값
  손절가     진입가 − k·ATR   (k 기본: 주식 2.0, 코인 2.5)
  목표가     1차 진입가 + 1.5R, 2차 + 3R   (R = 진입가 − 손절가, 배수는 설정으로 변경 가능)
  구조적 R:R (60일 고점 − 진입가) / R  → 1 미만이면 '저항 근접' 경고
  추적 손절  22일 고점 − 3·ATR (샹들리에)
  비중       min(위험비율 × 진입가 / R, 상한)
ATR 은 14일 고정 (백테스트 손절 폭과 같게 유지).
"""
import math

import pandas as pd

from app.analysis import indicators as ind
from app.analysis.model.config import StrategyConfig, default_config
from app.analysis.scoring.weights import DEFAULT_RISK_PCT
from app.core.ticks import round_price


def risk_plan(market: str, df: pd.DataFrame, account_equity: float | None = None,
              risk_pct: float | None = None, cfg: StrategyConfig | None = None) -> dict:
    cfg = cfg or default_config()
    risk_pct = risk_pct or DEFAULT_RISK_PCT
    c = float(df["close"].iloc[-1])
    atr = float(ind.atr(df).iloc[-1])
    ma20 = ind.sma(df["close"], 20).iloc[-1]
    high60 = float(df["high"].tail(60).max())
    high22 = float(df["high"].tail(22).max())
    k = cfg.stop_atr(market)
    max_pos = cfg.max_position(market)
    t1, t2 = cfg.risk.target1_r, cfg.risk.target2_r

    entry_high = c
    entry_low = max(c - 0.5 * atr, float(ma20)) if not pd.isna(ma20) else c - 0.5 * atr
    entry_low = min(entry_low, entry_high)
    entry = (entry_low + entry_high) / 2
    stop = entry - k * atr
    r = entry - stop
    warnings = []
    structural_rr = (high60 - entry) / r if r > 0 else None
    if structural_rr is not None and structural_rr < 1:
        warnings.append("60일 고점(저항)이 1R 이내 — 목표 도달 여지가 작음")

    position_pct = min(risk_pct * entry / r, max_pos) if r > 0 else 0.0
    quantity = None
    if account_equity and r > 0:
        qty = account_equity * risk_pct / r
        qty = min(qty, account_equity * max_pos / entry)
        quantity = math.floor(qty * 1e8) / 1e8 if market == "CRYPTO" else math.floor(qty)

    rp = lambda p, mode="nearest": round_price(market, p, mode)  # noqa: E731
    return {
        "atr": round(atr, 6), "atrPct": round(atr / c, 6),
        "entryLow": rp(entry_low), "entryHigh": rp(entry_high), "entry": rp(entry),
        "stopLoss": rp(stop, "down"),
        "takeProfit1": rp(entry + t1 * r), "takeProfit2": rp(entry + t2 * r),
        "riskPerUnit": round(r, 6), "riskReward": t2, "stopAtrMultiple": k,
        "structuralRiskReward": round(structural_rr, 3) if structural_rr is not None else None,
        "trailingStop": rp(high22 - 3 * atr, "down"),
        "riskPct": risk_pct, "positionSizePct": round(position_pct, 4), "quantity": quantity,
        "warnings": warnings,
    }
