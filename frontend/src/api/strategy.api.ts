import { baseApi } from "./base.api";
import { API_ENDPOINTS } from "@/utils/constants";
import type { AnalysisModel } from "@/types/model.types";
import type { AnalysisEnvelope, BacktestRequest, RequestIdResponse, StrategyRequest } from "@/types/strategy.types";

export const strategyApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    requestStrategy: build.mutation<RequestIdResponse, StrategyRequest>({
      query: (data) => ({ url: API_ENDPOINTS.ANALYSIS.STRATEGY, method: "POST", data }),
    }),
    requestBacktest: build.mutation<RequestIdResponse, BacktestRequest>({
      query: (data) => ({ url: API_ENDPOINTS.ANALYSIS.BACKTEST, method: "POST", data }),
    }),
    /** 분석 결과 폴링 (PROCESSING/RUNNING → SUCCESS/FAILED) */
    getAnalysisResult: build.query<AnalysisEnvelope, string>({
      query: (requestId) => ({ url: API_ENDPOINTS.ANALYSIS.RESULT(requestId) }),
      keepUnusedDataFor: 600,
    }),
    /** 분석 모델 카탈로그(팩터 설명·밴드 기본값) + 기본 전략 설정. 배포 전까지 바뀌지 않는다 */
    getAnalysisModel: build.query<AnalysisModel, void>({
      query: () => ({ url: API_ENDPOINTS.ANALYSIS.MODEL }),
      keepUnusedDataFor: 3600,
    }),
  }),
});

export const {
  useRequestStrategyMutation,
  useRequestBacktestMutation,
  useGetAnalysisResultQuery,
  useGetAnalysisModelQuery,
} = strategyApi;
