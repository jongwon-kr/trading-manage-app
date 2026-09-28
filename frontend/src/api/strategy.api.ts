import { baseApi } from "./base.api";
import { API_ENDPOINTS } from "@/utils/constants";
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
  }),
});

export const { useRequestStrategyMutation, useRequestBacktestMutation, useGetAnalysisResultQuery } = strategyApi;
