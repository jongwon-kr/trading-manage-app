import axiosInstance from './axios';
import { AnalysisResult } from '@/types/analysis.types';
import { API_ENDPOINTS } from '@/utils/constants';

interface AnalysisRequestResponse {
  requestId: string;
  message: string;
}

export const analysisAPI = {

  requestTechnicalAnalysis: async (
    symbol: string, 
    market: string = 'STOCK', 
    timeframe: string = '1d'
  ): Promise<AnalysisRequestResponse> => {
    const params = new URLSearchParams({ symbol, market, timeframe });
    const response = await axiosInstance.post<AnalysisRequestResponse>(
      `${API_ENDPOINTS.ANALYSIS.TECHNICAL}?${params.toString()}`
    );
    return response.data;
  },

  getAnalysisResult: async (requestId: string): Promise<AnalysisResult> => {
    const response = await axiosInstance.get<AnalysisResult>(
      API_ENDPOINTS.ANALYSIS.RESULT(requestId)
    );
    return response.data;
  },
  
  requestMarketTrendAnalysis: async (
    market: string = 'STOCK'
  ): Promise<AnalysisRequestResponse> => {
     const params = new URLSearchParams({ market });
     const response = await axiosInstance.post<AnalysisRequestResponse>(
      `${API_ENDPOINTS.ANALYSIS.MARKET_TREND}?${params.toString()}`
    );
    return response.data;
  }
};