import axiosInstance from "./axios";
import {
  JournalApiDto,
  JournalStatistics,
  JournalSummary,
  JournalPaging,
} from "@/types/journal.types";
import { API_ENDPOINTS } from "@/utils/constants";

export const journalAPI = {

  search: async (
    filters: JournalApiDto.JournalFilters
  ): Promise<JournalPaging<JournalSummary>> => {
    const params = new URLSearchParams();

    params.append("page", (filters.page || 0).toString());
    params.append("size", (filters.size || 20).toString());
    params.append("sortBy", filters.sortBy || "createdAt");
    params.append("direction", filters.direction || "DESC");
    let endpoint = API_ENDPOINTS.JOURNALS.BASE;
    const searchFilters: Partial<JournalApiDto.JournalFilters> = {};

    if (filters.market) searchFilters.market = filters.market;
    if (filters.symbol) searchFilters.symbol = filters.symbol;
    if (filters.tradeType) searchFilters.tradeType = filters.tradeType;
    if (filters.isClosed !== undefined)
      searchFilters.isClosed = filters.isClosed;

    if (Object.keys(searchFilters).length > 0) {
      endpoint = API_ENDPOINTS.JOURNALS.SEARCH;
      Object.entries(searchFilters).forEach(([key, value]) => {
        params.append(key, String(value));
      });
    }

    const response = await axiosInstance.get<JournalPaging<JournalSummary>>(
      `${endpoint}?${params.toString()}`
    );
    return response.data;
  },


  getJournalById: async (
    id: number
  ): Promise<JournalApiDto.JournalResponse> => {
    const response = await axiosInstance.get<JournalApiDto.JournalResponse>(
      API_ENDPOINTS.JOURNALS.BY_ID(id)
    );
    return response.data;
  },


  createJournal: async (
    data: JournalApiDto.CreateRequest
  ): Promise<JournalApiDto.JournalResponse> => {
    const response = await axiosInstance.post<JournalApiDto.JournalResponse>(
      API_ENDPOINTS.JOURNALS.BASE,
      data
    );
    return response.data;
  },

  updateJournal: async (
    id: number,
    data: JournalApiDto.UpdateRequest
  ): Promise<JournalApiDto.JournalResponse> => {
    const response = await axiosInstance.put<JournalApiDto.JournalResponse>(
      API_ENDPOINTS.JOURNALS.BY_ID(id),
      data
    );
    return response.data;
  },

  deleteJournal: async (id: number): Promise<void> => {
    await axiosInstance.delete(API_ENDPOINTS.JOURNALS.BY_ID(id));
  },

  getStatistics: async (): Promise<JournalStatistics> => {
    const response = await axiosInstance.get<JournalStatistics>(
      API_ENDPOINTS.JOURNALS.STATS
    );
    return response.data;
  },
};
