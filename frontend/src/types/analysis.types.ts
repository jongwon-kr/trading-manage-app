// Java의 AnalysisType Enum과 동일
export enum AnalysisType {
  TECHNICAL = "TECHNICAL",
  MARKET_TREND = "MARKET_TREND",
  NEWS = "NEWS",
  BACKTEST = "BACKTEST",
}

// --- Java (POST) 요청 관련 ---
// (Java: AnalysisController @RequestParam)
export interface TechnicalAnalysisRequestParams {
  symbol: string;
  market?: string;
  timeframe?: string;
}

export interface MarketTrendAnalysisRequestParams {
  market: string;
}

// (Java: POST 응답 - Map<String, String>)
export interface AnalysisRequestIdResponse {
  requestId: string;
  message: string;
}


// --- Python이 Redis에 저장하는 실제 결과 데이터 ---
// (Python: models/schemas.py/TechnicalIndicators)
export interface TechnicalIndicators {
  rsi?: number;
  macd?: {
    macd: number;
    signal: number;
    histogram: number;
  };
  moving_averages?: Record<string, number>;
  bollinger_bands?: Record<string, number>;
  volume_analysis?: Record<string, any>;
}

/**
 * Python이 Redis에 저장하는 분석 결과 (Java가 'result'로 반환)
 * (Python: models/schemas.py/AnalysisResult)
 */
export interface AnalysisResultData {
  request_id: string; // [수정] Python은 snake_case를 사용
  analysis_type: AnalysisType;
  symbol?: string;
  market?: string;
  status: "SUCCESS" | "FAILED"; // Python 결과 내부의 상태
  indicators?: TechnicalIndicators;
  summary: string;
  recommendation: string;
  confidence: number;
  analyzed_at: string; // ISO 8601 string
  error_message?: string;
}

// --- Java (GET) 응답 관련 ---

/**
 * Java (GET /result/{id})의 "처리 중" 응답
 * (Java: Map<String, Object>)
 */
export interface AnalysisProcessingResponse {
  status: "PROCESSING";
  message: string;
}

/**
 * Java (GET /result/{id})의 "성공" 응답
 * (Java: Map<String, Object> -> Python의 AnalysisResultData 원본)
 */
// (AnalysisResultData가 직접 반환됨)

/**
 * Java API (GET /api/v1/analysis/{requestId})의 폴링 응답 타입
 * (처리 중이거나, 성공/실패한 Python 결과 원본)
 */
export type AnalysisResultResponse =
  | AnalysisProcessingResponse
  | AnalysisResultData;