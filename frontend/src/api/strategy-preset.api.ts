import { baseApi } from "./base.api";
import { API_ENDPOINTS } from "@/utils/constants";
import type { SavePresetRequest, StrategyPreset } from "@/types/model.types";

/** 내 전략 CRUD (설정 검증은 서버가 Python 모델로 수행 — 실패 시 error.errors[{path,msg}]) */
export const strategyPresetApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getPresets: build.query<StrategyPreset[], void>({
      query: () => ({ url: API_ENDPOINTS.STRATEGIES.LIST }),
      providesTags: (res) => [{ type: "Preset", id: "LIST" }, ...(res ?? []).map((p) => ({ type: "Preset" as const, id: p.id }))],
    }),
    getPreset: build.query<StrategyPreset, number>({
      query: (id) => ({ url: API_ENDPOINTS.STRATEGIES.DETAIL(id) }),
      providesTags: (_r, _e, id) => [{ type: "Preset", id }],
    }),
    createPreset: build.mutation<StrategyPreset, SavePresetRequest>({
      query: (data) => ({ url: API_ENDPOINTS.STRATEGIES.LIST, method: "POST", data }),
      invalidatesTags: [{ type: "Preset", id: "LIST" }],
    }),
    updatePreset: build.mutation<StrategyPreset, SavePresetRequest & { id: number }>({
      query: ({ id, ...data }) => ({ url: API_ENDPOINTS.STRATEGIES.DETAIL(id), method: "PUT", data }),
      invalidatesTags: (_r, _e, { id }) => [{ type: "Preset", id: "LIST" }, { type: "Preset", id }],
    }),
    deletePreset: build.mutation<void, number>({
      query: (id) => ({ url: API_ENDPOINTS.STRATEGIES.DETAIL(id), method: "DELETE" }),
      invalidatesTags: [{ type: "Preset", id: "LIST" }],
    }),
    duplicatePreset: build.mutation<StrategyPreset, number>({
      query: (id) => ({ url: API_ENDPOINTS.STRATEGIES.DUPLICATE(id), method: "POST" }),
      invalidatesTags: [{ type: "Preset", id: "LIST" }],
    }),
  }),
});

export const {
  useGetPresetsQuery,
  useGetPresetQuery,
  useCreatePresetMutation,
  useUpdatePresetMutation,
  useDeletePresetMutation,
  useDuplicatePresetMutation,
} = strategyPresetApi;
