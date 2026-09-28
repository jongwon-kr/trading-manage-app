import { createApi, type BaseQueryFn } from "@reduxjs/toolkit/query/react";
import type { AxiosRequestConfig } from "axios";
import axiosInstance from "./axios";

export interface ApiError {
  status?: number;
  message: string;
}

/**
 * 기존 axiosInstance 를 그대로 사용하는 RTK Query baseQuery.
 * → 토큰 주입·401 시 refresh 재시도(axios.ts 인터셉터)가 RTK Query 요청에도 적용된다.
 */
const axiosBaseQuery =
  (): BaseQueryFn<
    { url: string; method?: AxiosRequestConfig["method"]; params?: AxiosRequestConfig["params"]; data?: unknown },
    unknown,
    ApiError
  > =>
  async ({ url, method = "GET", params, data }) => {
    try {
      const res = await axiosInstance({ url, method, params, data });
      return { data: res.data };
    } catch (e) {
      const err = e as Error & { status?: number };
      return { error: { status: err.status, message: err.message } };
    }
  };

export const baseApi = createApi({
  reducerPath: "api",
  baseQuery: axiosBaseQuery(),
  tagTypes: ["Watchlist"],
  endpoints: () => ({}),
});
