import axiosInstance from './axios';
import { AnalysisResult } from '@/types/analysis.types';
import { API_ENDPOINTS } from '@/utils/constants';

interface AnalysisRequestResponse {
  requestId: string;
  message: string;
}

export const analysisAPI = {
  /**
   * 차트 기술적 분석 요청
   * POST /api/analysis/technical
   */
  requestTechnicalAnalysis: async (
    symbol: string, 
    market: string = 'STOCK', 
    timeframe: string = '1d'
  ): Promise<AnalysisRequestResponse> => {
    const params = new URLSearchParams({ symbol, market, timeframe });
    // [수정] API_ENDPOINTS.ANALYSIS.TECHNICAL 사용
    const response = await axiosInstance.post<AnalysisRequestResponse>(
      `${API_ENDPOINTS.ANALYSIS.TECHNICAL}?${params.toString()}`
    );
    return response.data;
  },

  /**
   * 분석 결과 조회 (폴링 대상)
   * GET /api/analysis/result/{requestId}
   */
  getAnalysisResult: async (requestId: string): Promise<AnalysisResult> => {
    // [수정] API_ENDPOINTS.ANALYSIS.RESULT 사용
    const response = await axiosInstance.get<AnalysisResult>(
      API_ENDPOINTS.ANALYSIS.RESULT(requestId)
    );
    return response.data;
  },
  
  // (추가) 시장 트렌드 분석 요청
  requestMarketTrendAnalysis: async (
    market: string = 'STOCK'
  ): Promise<AnalysisRequestResponse> => {
     const params = new URLSearchParams({ market });
     // [수정] API_ENDPOINTS.ANALYSIS.MARKET_TREND 사용
     const response = await axiosInstance.post<AnalysisRequestResponse>(
      `${API_ENDPOINTS.ANALYSIS.MARKET_TREND}?${params.toString()}`
    );
    return response.data;
  }
};