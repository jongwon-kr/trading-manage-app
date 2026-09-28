// 분석 결과 타입 (Redis analysis:{requestId}, schemaVersion 2 — 원본: backend-python app/analysis/jobs.py)
import type { MarketCode } from "./market.types";

export type AnalysisStatus = "PROCESSING" | "RUNNING" | "SUCCESS" | "FAILED";
export type Signal = "BUY" | "HOLD" | "SELL";
export type Strength = "STRONG_BUY" | "BUY" | "HOLD" | "SELL" | "STRONG_SELL";
export type GroupKey = "technical" | "fundamental" | "regime";

/** 모든 분석 결과 공통 필드. PROCESSING 은 Java(결과 없음), 나머지는 Python worker 가 기록 */
export interface AnalysisEnvelope {
  status: AnalysisStatus;
  schemaVersion?: number;
  requestId?: string;
  analysisType?: string;
  analyzedAt?: string;
  message?: string;
  errorMessage?: string;
  /** 백테스트 진행률 (0~1) */
  progress?: number;
}

export interface FactorResult {
  key: string;
  label: string;
  subGroup: string | null;
  /** -1(약세) ~ +1(강세), 데이터 없으면 null */
  score: number | null;
  /** 종합 점수 내 실효 가중치 */
  weight: number | null;
  /** 종합 점수(0~100)에 더해진 점수. 50 + Σ기여도 = score */
  contribution: number;
  raw: Record<string, number | string | null>;
  note: string;
}

export interface GroupResult {
  key: GroupKey;
  label: string;
  score: number | null;
  baseWeight: number;
  effectiveWeight: number | null;
  coverage: number | null;
  contribution: number;
  factors: FactorResult[];
}

export interface RiskPlan {
  atr: number;
  atrPct: number;
  entryLow: number;
  entryHigh: number;
  entry: number;
  stopLoss: number;
  takeProfit1: number;
  takeProfit2: number;
  riskPerUnit: number;
  riskReward: number;
  structuralRiskReward: number | null;
  trailingStop: number;
  riskPct: number;
  positionSizePct: number;
  quantity: number | null;
}

export interface StrategyResult extends AnalysisEnvelope {
  modelVersion: string;
  market: MarketCode;
  symbol: string;
  name: string;
  interval: string;
  asOf: string;
  lastPrice?: number;
  currency?: string;
  /** 0~100 */
  score: number;
  signal: Signal;
  strength: Strength;
  /** 0~1 */
  confidence: number;
  groups: GroupResult[];
  risk: RiskPlan | null;
  warnings: string[];
  dataSources: Record<string, string>;
  summary: string;
}

export interface StrategyRequest {
  market: MarketCode;
  symbol: string;
  interval?: string;
  accountEquity?: number;
  riskPct?: number;
}

export interface RequestIdResponse {
  requestId: string;
  message: string;
}
