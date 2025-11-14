import axiosInstance from "./axios";
import { API_ENDPOINTS } from "@/utils/constants";
import {
  TechnicalAnalysisRequestParams,
  MarketTrendAnalysisRequestParams,
  AnalysisRequestIdResponse,
  AnalysisResultResponse,
} from "@/types/analysis.types"; // 3번에서 수정한 타입

/**
 * AI 분석 API
 */
export const analysisAPI = {
  /**
   * 기술적 분석 요청 (POST + @RequestParam)
   */
  requestTechnical: async (
    params: TechnicalAnalysisRequestParams,
  ): Promise<AnalysisRequestIdResponse> => {
    const response = await axiosInstance.post<AnalysisRequestIdResponse>(
      API_ENDPOINTS.ANALYSIS.TECHNICAL,
      null, // [수정] RequestBody가 없으므로 null
      { params } // [수정] @RequestParam을 위해 params 객체 사용
    );
    return response.data;
  },

  /**
   * 시장 트렌드 분석 요청 (POST + @RequestParam)
   */
  requestMarketTrend: async (
    params: MarketTrendAnalysisRequestParams,
  ): Promise<AnalysisRequestIdResponse> => {
    const response = await axiosInstance.post<AnalysisRequestIdResponse>(
      API_ENDPOINTS.ANALYSIS.MARKET_TREND,
      null, // [수정] RequestBody가 없으므로 null
      { params } // [수정] @RequestParam을 위해 params 객체 사용
    );
    return response.data;
  },

  /**
   * AI 분석 결과 조회 (GET) - 폴링용
   * @param requestId 분석 요청 시 받은 ID
   * @returns { status, ... }
   */
  fetchResult: async (
    requestId: string,
  ): Promise<AnalysisResultResponse> => {
    const response = await axiosInstance.get<AnalysisResultResponse>(
      API_ENDPOINTS.ANALYSIS.RESULT(requestId),
    );
    return response.data;
  },
};