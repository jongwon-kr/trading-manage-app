"""점수 기반 전략 백테스트 (일봉, 롱 전용, 전액 진입).

- 점수: 라이브 분석과 같은 기술적·시장국면 팩터 시계열 (technical_factors / regime_factors)
  · 기본적 분석은 과거 시점 재무가 없어 제외 (look-ahead 방지), 시장 폭·심리도 당일 스냅샷뿐이라 제외
- 체결: t 종가 신호 → t+1 시가 체결
  · 진입: 보유 없음 & 점수 ≥ buyThreshold & 시장 국면 ≥ 위험회피 기준
  · 청산: 점수 ≤ sellThreshold (진입·청산 임계값 차이로 잦은 매매 방지)
  · 봉 안 손절/목표: 저가 ≤ 손절이면 min(시가, 손절), 아니면 고가 ≥ 목표이면 max(시가, 목표). 같은 봉에서 둘 다 닿으면 손절 우선(보수적)
  · 손절·목표는 진입 직전 봉 ATR 로 고정
- 비용: 매수·매도 수수료, 매도 세금(KR), 슬리피지 (bp)
- 전략 설정(params["config"]): 팩터·가중치·밴드·게이트는 라이브 분석과 같게 적용하고,
  손절 ATR 배수·목표 R 은 요청에 없으면 설정의 리스크 값(손절 배수, 2차 목표)을 쓴다.
"""
import math
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from typing import Callable

import numpy as np
import pandas as pd

from app.analysis import indicators as ind
from app.analysis.model.config import StrategyConfig, config_info, default_config, parse_config
from app.analysis.schemas import SCHEMA_VERSION, AnalysisRequest
from app.analysis.scoring.composite import score_series
from app.analysis.scoring.primitives import group_series
from app.analysis.scoring.regime import regime_factors
from app.analysis.scoring.technical import technical_factors
from app.analysis.scoring.weights import MODEL_VERSION
from app.core.errors import BadRequest, InsufficientData
from app.market.models import Market

MAX_EQUITY_POINTS = 500
MAX_TRADES = 200
WARMUP_BARS = 300
MIN_TEST_BARS = 60

# 시장별 기본 비용 (bp, 1bp = 0.01%). KR 매도세율은 시기별로 달라 파라미터로 바꿀 수 있다.
DEFAULT_COSTS = {
    Market.KR_STOCK: {"feeBps": 1.5, "taxBps": 20.0},
    Market.US_STOCK: {"feeBps": 0.0, "taxBps": 0.0},
    Market.CRYPTO: {"feeBps": 5.0, "taxBps": 0.0},
}


@dataclass
class BacktestParams:
    buy_threshold: float = 60
    sell_threshold: float = 45
    stop_atr: float = 2.0
    take_profit_r: float = 3.0
    fee_bps: float = 0.0
    tax_bps: float = 0.0
    slippage_bps: float = 5.0
    initial_capital: float = 10_000_000

    @classmethod
    def from_dict(cls, market: Market, p: dict, cfg: StrategyConfig | None = None) -> "BacktestParams":
        cfg = cfg or default_config()
        costs = DEFAULT_COSTS[market]
        out = cls(
            buy_threshold=float(p.get("buyThreshold", 60)),
            sell_threshold=float(p.get("sellThreshold", 45)),
            stop_atr=float(p.get("stopAtr", cfg.stop_atr(market.value))),
            take_profit_r=float(p.get("takeProfitR", cfg.risk.target2_r)),
            fee_bps=float(p.get("feeBps", costs["feeBps"])),
            tax_bps=float(p.get("taxBps", costs["taxBps"])),
            slippage_bps=float(p.get("slippageBps", 5.0)),
            initial_capital=float(p.get("initialCapital", 10_000 if market == Market.US_STOCK else 10_000_000)),
        )
        if not 0 <= out.sell_threshold < out.buy_threshold <= 100:
            raise BadRequest("임계값은 0 ≤ 청산 < 진입 ≤ 100 이어야 합니다.")
        if out.stop_atr <= 0 or out.take_profit_r <= 0 or out.initial_capital <= 0:
            raise BadRequest("손절 ATR 배수·목표 R·초기 자본은 양수여야 합니다.")
        return out

    def dump(self) -> dict:
        return {"buyThreshold": self.buy_threshold, "sellThreshold": self.sell_threshold, "stopAtr": self.stop_atr,
                "takeProfitR": self.take_profit_r, "feeBps": self.fee_bps, "taxBps": self.tax_bps,
                "slippageBps": self.slippage_bps, "initialCapital": self.initial_capital}


def simulate(df: pd.DataFrame, score: pd.Series, allow_entry: pd.Series, p: BacktestParams, start: int,
             fractional: bool) -> tuple[pd.Series, list[dict]]:
    """df 의 start 위치부터 시뮬레이션. 반환: (자산 곡선, 거래 목록)"""
    o, h, l, c = (df[k].to_numpy(float) for k in ("open", "high", "low", "close"))
    atr = ind.atr(df).to_numpy(float)
    sc = score.to_numpy(float)
    ok = allow_entry.to_numpy(bool)
    times = df.index
    slip, fee, tax = p.slippage_bps / 1e4, p.fee_bps / 1e4, p.tax_bps / 1e4

    cash, shares = p.initial_capital, 0.0
    pos: dict | None = None
    pending_entry = pending_exit = False
    trades: list[dict] = []
    equity = np.full(len(df), np.nan)

    def close_position(i: int, px: float, reason: str) -> None:
        nonlocal cash, shares, pos
        fill = px * (1 - slip)
        proceeds = shares * fill * (1 - fee - tax)
        cash += proceeds
        trades.append({"entryTime": pos["time"], "entryPrice": pos["price"], "exitTime": _iso(times[i]),
                       "exitPrice": round(fill, 8), "exitReason": reason,
                       "returnPct": proceeds / pos["cost"] - 1, "bars": i - pos["index"]})
        shares, pos = 0.0, None

    for i in range(start, len(df)):
        if pending_exit and pos is not None:
            close_position(i, o[i], "SIGNAL")
        if pending_entry and pos is None and not math.isnan(atr[i - 1]):
            fill = o[i] * (1 + slip)
            qty = cash / (fill * (1 + fee))
            qty = qty if fractional else math.floor(qty)
            if qty > 0:
                cost = qty * fill * (1 + fee)
                cash -= cost
                shares = qty
                r = p.stop_atr * atr[i - 1]
                pos = {"time": _iso(times[i]), "index": i, "price": round(fill, 8), "cost": cost,
                       "stop": fill - r, "target": fill + p.take_profit_r * r}
        pending_entry = pending_exit = False

        if pos is not None:
            if l[i] <= pos["stop"]:
                close_position(i, min(o[i], pos["stop"]), "STOP")
            elif h[i] >= pos["target"]:
                close_position(i, max(o[i], pos["target"]), "TARGET")

        # 종가 신호 → 다음 봉 시가 체결
        if not math.isnan(sc[i]):
            if pos is None and sc[i] >= p.buy_threshold and ok[i]:
                pending_entry = True
            elif pos is not None and sc[i] <= p.sell_threshold:
                pending_exit = True
        equity[i] = cash + shares * c[i]

    if pos is not None:
        close_position(len(df) - 1, c[-1], "END")
        equity[-1] = cash
    return pd.Series(equity, index=df.index).iloc[start:], trades


def metrics(equity: pd.Series, trades: list[dict], periods_per_year: int, in_position: float | None = None) -> dict:
    e = equity.dropna()
    total = e.iloc[-1] / e.iloc[0] - 1
    days = max((e.index[-1] - e.index[0]).days, 1)
    cagr = (e.iloc[-1] / e.iloc[0]) ** (365.25 / days) - 1 if e.iloc[-1] > 0 else -1.0
    mdd = float((e / e.cummax() - 1).min())
    r = e.pct_change().dropna()
    sharpe = float(r.mean() / r.std() * np.sqrt(periods_per_year)) if len(r) > 1 and r.std() > 0 else 0.0
    wins = [t["returnPct"] for t in trades if t["returnPct"] > 0]
    losses = [t["returnPct"] for t in trades if t["returnPct"] <= 0]
    gross_loss = -sum(losses)
    out = {
        "totalReturn": round(float(total), 6), "cagr": round(float(cagr), 6), "mdd": round(mdd, 6),
        "sharpe": round(sharpe, 3), "trades": len(trades),
        "winRate": round(len(wins) / len(trades), 4) if trades else None,
        "avgWin": round(float(np.mean(wins)), 6) if wins else None,
        "avgLoss": round(float(np.mean(losses)), 6) if losses else None,
        "profitFactor": round(float(sum(wins) / gross_loss), 3) if gross_loss > 0 else None,
        "avgHoldingBars": round(float(np.mean([t["bars"] for t in trades])), 1) if trades else None,
    }
    if in_position is not None:
        out["exposure"] = round(in_position, 4)
    return out


def run_backtest(market: Market, code: str, start: datetime | None, end: datetime | None, raw_params: dict,
                 progress: Callable[[float, str], None] | None = None) -> dict:
    from app.analysis.jobs import INDEX_NAMES, _index_close, _vix, regime_index_code  # 순환 import 방지
    from app.market.service import get_service

    report = progress or (lambda *_: None)
    cfg = parse_config(raw_params.get("config"))
    params = BacktestParams.from_dict(market, raw_params, cfg)
    svc = get_service()
    sym = svc.get_symbol(market, code)
    end = end or datetime.now(timezone.utc)
    start = start or end - timedelta(days=3 * 365)
    if start >= end:
        raise BadRequest("시작일은 종료일보다 이전이어야 합니다.")

    report(0.1, "시세 데이터 수집")
    fetch_from = start - timedelta(days=int(WARMUP_BARS * (1.0 if market == Market.CRYPTO else 1.5)))
    df, source, _ = svc.get_candles(market, sym.code, "1d", start=fetch_from, end=end, limit=2000)
    idx_code = regime_index_code(market, sym)
    index_close = _index_close(svc, idx_code)
    vix = _vix(svc, market)
    start_pos = int(df.index.searchsorted(pd.Timestamp(start).tz_convert("UTC") if pd.Timestamp(start).tzinfo
                                          else pd.Timestamp(start, tz="UTC")))
    if len(df) - start_pos < MIN_TEST_BARS:
        raise InsufficientData(f"백테스트 기간의 일봉이 {len(df) - start_pos}개뿐입니다 (최소 {MIN_TEST_BARS}개).")
    start_pos = max(start_pos, 1)

    report(0.4, "점수 계산")
    bench_close = None if (market == Market.CRYPTO and sym.code == "KRW-BTC") else index_close
    if market != Market.CRYPTO:
        bench_code = "KOSDAQ" if sym.exchange.startswith("KOSDAQ") else "KOSPI" if market == Market.KR_STOCK else (
            "IXIC" if sym.exchange == "NASDAQ" else "SPX")
        if bench_code != idx_code:
            bench_close = _index_close(svc, bench_code)
    regime = regime_factors(market.value, index_close.reindex(df.index).ffill(), INDEX_NAMES.get(idx_code, idx_code),
                            vix, breadth=None, fear_greed=None, cfg=cfg)
    groups = {"technical": technical_factors(df, bench_close, cfg), "regime": regime}
    score = score_series(market.value, groups, df.index, cfg)
    if cfg.gate.enabled:
        regime_score, _ = group_series(regime, df.index)
        allow = (regime_score >= cfg.gate.threshold) | regime_score.isna()
    else:
        allow = pd.Series(True, index=df.index)

    report(0.7, "시뮬레이션")
    equity, trades = simulate(df, score, allow, params, start_pos, fractional=market == Market.CRYPTO)
    periods = 365 if market == Market.CRYPTO else 252
    in_pos = _exposure(trades, len(equity))
    bench_equity = params.initial_capital * df["close"].iloc[start_pos:] / df["close"].iloc[start_pos]

    curve = pd.DataFrame({"equity": equity, "benchmark": bench_equity,
                          "drawdown": equity / equity.cummax() - 1, "score": score.iloc[start_pos:]})
    step = max(1, math.ceil(len(curve) / MAX_EQUITY_POINTS))
    sampled = curve.iloc[::step]
    if sampled.index[-1] != curve.index[-1]:
        sampled = pd.concat([sampled, curve.iloc[[-1]]])

    return {
        "schemaVersion": SCHEMA_VERSION, "modelVersion": MODEL_VERSION,
        "market": market.value, "symbol": sym.code, "name": sym.name, "currency": sym.currency,
        "from": _iso(df.index[start_pos]), "to": _iso(df.index[-1]), "bars": len(equity),
        "params": params.dump(),
        "metrics": metrics(equity, trades, periods, in_pos),
        "benchmarkMetrics": metrics(bench_equity, [], periods),
        "equityCurve": [{"time": int(t.timestamp()), "equity": round(float(r.equity), 2),
                         "benchmark": round(float(r.benchmark), 2), "drawdown": round(float(r.drawdown), 6),
                         "score": None if pd.isna(r.score) else round(float(r.score), 2)}
                        for t, r in sampled.iterrows()],
        "trades": trades[-MAX_TRADES:],
        "warnings": ["기본적 분석은 과거 시점 재무 데이터가 없어 백테스트에서 제외했습니다 (미래 정보 사용 방지).",
                     "시장 폭·심리 지표는 당일 스냅샷만 있어 제외했습니다."],
        "dataSources": {"candles": source, "index": INDEX_NAMES.get(idx_code, idx_code)},
        "config": config_info(cfg, raw_params.get("presetName")),
    }


def run_backtest_request(request: AnalysisRequest, params: dict, progress) -> dict:
    from app.analysis.jobs import infer_market

    if not request.symbol:
        raise BadRequest("종목(symbol)이 필요합니다.")
    market = infer_market(request.market, request.symbol)
    to_utc = lambda d: d.replace(tzinfo=timezone.utc) if d and d.tzinfo is None else d  # noqa: E731
    return run_backtest(market, request.symbol, to_utc(request.start_date), to_utc(request.end_date), params, progress)


def _exposure(trades: list[dict], bars: int) -> float:
    return min(sum(t["bars"] for t in trades) / bars, 1.0) if bars else 0.0


def _iso(t) -> str:
    return pd.Timestamp(t).strftime("%Y-%m-%d")
