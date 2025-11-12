import axiosInstance from './axios';
import { AnalysisResult } from '@/types/analysis.types';

const API_ANALYSIS = '/analysis';

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
    const response = await axiosInstance.post<AnalysisRequestResponse>(
      `${API_ANALYSIS}/technical?${params.toString()}`
    );
    return response.data;
  },

  /**
   * 분석 결과 조회 (폴링 대상)
   * GET /api/analysis/result/{requestId}
   */
  getAnalysisResult: async (requestId: string): Promise<AnalysisResult> => {
    const response = await axiosInstance.get<AnalysisResult>(
      `${API_ANALYSIS}/result/${requestId}`
    );
    return response.data;
  },
  
  // (추가) 시장 트렌드 분석 요청
  requestMarketTrendAnalysis: async (
    market: string = 'STOCK'
  ): Promise<AnalysisRequestResponse> => {
     const params = new URLSearchParams({ market });
     const response = await axiosInstance.post<AnalysisRequestResponse>(
      `${API_ANALYSIS}/market-trend?${params.toString()}`
    );
    return response.data;
  }
};