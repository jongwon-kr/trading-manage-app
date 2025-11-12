export enum AnalysisType {
  TECHNICAL = "TECHNICAL",
  MARKET_TREND = "MARKET_TREND",
  NEWS = "NEWS",
  BACKTEST = "BACKTEST",
}

export interface TechnicalIndicators {
  rsi?: number;
  macd?: {
    macd?: number;
    signal?: number;
    histogram?: number;
  };
  movingAverages?: {
    ma5?: number;
    ma20?: number;
    ma60?: number;
    current_price?: number;
  };
  bollingerBands?: {
    upper?: number;
    middle?: number;
    lower?: number;
    current_price?: number;
  };
  volumeAnalysis?: {
    current_volume?: number;
    average_volume?: number;
    volume_ratio?: number;
    is_high_volume?: boolean;
  };
}

export interface AnalysisResult {
  requestId: string;
  analysisType: AnalysisType;
  symbol?: string;
  status: "SUCCESS" | "FAILED" | "PROCESSING";
  indicators?: TechnicalIndicators;
  summary: string;
  recommendation: "BUY" | "SELL" | "HOLD";
  confidence: number; // 0.0 - 1.0
  analyzedAt: string; // ISO datetime string
  errorMessage?: string;
}