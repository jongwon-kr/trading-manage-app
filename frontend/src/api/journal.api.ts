import axiosInstance from "./axios";
import {
  JournalApiDto,
} from "@/types/journal.types";
import { API_ENDPOINTS } from "@/utils/constants";

export const journalAPI = {
  /**
   * 매매일지 검색 (페이징 및 필터)
   */
  search: async (
    filters: JournalApiDto.JournalFilters
  ): Promise<JournalApiDto.PagedJournalResponse> => {
    const params = new URLSearchParams();

    // Paging
    params.append("page", (filters.page || 0).toString());
    params.append("size", (filters.size || 20).toString());
    params.append("sortBy", filters.sortBy || "createdAt"); 
    params.append("direction", filters.direction || "DESC");
    
    // Filters
    if (filters.market) params.append("market", filters.market);
    if (filters.symbol) params.append("symbol", filters.symbol);
    if (filters.tradeType) params.append("tradeType", filters.tradeType);
    if (filters.isClosed !== undefined) params.append("isClosed", String(filters.isClosed));
    if (filters.startDate) params.append("startDate", filters.startDate);
    if (filters.endDate) params.append("endDate", filters.endDate);

    const response = await axiosInstance.get<JournalApiDto.PagedJournalResponse>(
      `${API_ENDPOINTS.JOURNALS.SEARCH}?${params.toString()}`
    );
    return response.data;
  },

  /**
   * 매매일지 상세 조회
   */
  getJournalById: async (
    id: number
  ): Promise<JournalApiDto.JournalResponse> => {
    const response = await axiosInstance.get<JournalApiDto.JournalResponse>(
      API_ENDPOINTS.JOURNALS.BY_ID(id)
    );
    return response.data;
  },

  /**
   * 새 매매일지 생성
   */
  createJournal: async (
    data: JournalApiDto.CreateRequest
  ): Promise<JournalApiDto.JournalResponse> => {
    const response = await axiosInstance.post<JournalApiDto.JournalResponse>(
      API_ENDPOINTS.JOURNALS.BASE,
      data
    );
    return response.data;
  },

  /**
   * 매매일지 수정
   */
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

  /**
   * 매매일지 삭제
   */
  deleteJournal: async (id: number): Promise<void> => {
    await axiosInstance.delete(API_ENDPOINTS.JOURNALS.BY_ID(id));
  },

  /**
   * 통계 조회
   */
  getStatistics: async (): Promise<JournalApiDto.StatisticsResponse> => {
    const response = await axiosInstance.get<JournalApiDto.StatisticsResponse>(
      API_ENDPOINTS.JOURNALS.STATS
    );
    return response.data;
  },
};