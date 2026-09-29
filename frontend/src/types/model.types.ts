// 분석 모델 카탈로그·전략 설정 타입 (원본: backend-python app/analysis/model/{catalog,config}.py)
import type { GroupKey } from "./strategy.types";

/** pct: 비율(0.05 → 5%) · ratio: 배수/비율 그대로 · number: 수치 · price: 가격 · text: 문자열 */
export type ValueUnit = "pct" | "ratio" | "number" | "price" | "text";

export interface ParamSpec {
  key: string;
  label: string;
  default: number;
  min: number;
  max: number;
  integer: boolean;
}

export interface BandSpec {
  name: string;
  label: string;
  unit: ValueUnit;
  xs: number[];
  ys: number[];
}

export interface FactorSpec {
  key: string;
  group: GroupKey;
  subGroup: string | null;
  label: string;
  description: string;
  formula: string;
  rules: string[];
  params: ParamSpec[];
  bands: BandSpec[];
  inputs: { key: string; label: string; unit: ValueUnit }[];
  /** 파라미터 대소 제약 [작아야 하는 키, 커야 하는 키] */
  ordered: [string, string][];
}

export interface Band {
  xs: number[];
  ys: number[];
}

export interface FactorConfig {
  enabled: boolean;
  weight: number;
  params: Record<string, number>;
  bands: Record<string, Band>;
}

export interface StrategyConfig {
  groupWeights: Record<"KR_STOCK" | "US_STOCK" | "CRYPTO", Record<GroupKey, number>>;
  subgroupWeights: Record<string, number>;
  factors: Record<string, FactorConfig>;
  signal: { strongBuy: number; buy: number; sell: number; strongSell: number };
  gate: { enabled: boolean; threshold: number };
  risk: {
    stopAtrStock: number;
    stopAtrCrypto: number;
    target1R: number;
    target2R: number;
    maxPositionStock: number;
    maxPositionCrypto: number;
  };
}

export interface AnalysisModel {
  modelVersion: string;
  minBars: number;
  markets: string[];
  groups: { key: GroupKey; label: string; description: string }[];
  subGroups: { key: string; label: string }[];
  factors: FactorSpec[];
  defaultConfig: StrategyConfig;
  defaultHash: string;
}
