import axiosInstance from "./axios";
import {
  JournalApiDto,
  JournalStatistics,
  JournalSummary,
} from "@/types/journal.types";
import { Page } from "@/types/common.types";

// 임시 API 경로 (추후 constants.ts로 이동)
const API_JOURNALS = "/journals";

export const journalAPI = {
  /**
   * 내 매매일지 목록 조회 (페이징)
   * GET /api/journals
   */
  getJournals: async (pageable: {
    page: number;
    size: number;
  }): Promise<Page<JournalSummary>> => {
    const params = new URLSearchParams({
      page: pageable.page.toString(),
      size: pageable.size.toString(),
      sortBy: "createdAt",
      direction: "DESC",
    });

    const response = await axiosInstance.get<Page<JournalSummary>>(
      `${API_JOURNALS}?${params.toString()}`
    );
    return response.data;
  },

  /**
   * 매매일지 상세 조회
   * GET /api/journals/{journalId}
   */
  getJournalById: async (id: number): Promise<JournalApiDto> => {
    const response = await axiosInstance.get<JournalApiDto>(
      `${API_JOURNALS}/${id}`
    );
    return response.data;
  },

  /**
   * 매매일지 생성
   * POST /api/journals
   */
  createJournal: async (
    data: JournalApiDto.CreateRequest
  ): Promise<JournalApiDto> => {
    const response = await axiosInstance.post<JournalApiDto>(
      API_JOURNALS,
      data
    );
    return response.data;
  },

  /**
   * 매매일지 수정
   * PUT /api/journals/{journalId}
   */
  updateJournal: async (
    id: number,
    data: JournalApiDto.UpdateRequest
  ): Promise<JournalApiDto> => {
    const response = await axiosInstance.put<JournalApiDto>(
      `${API_JOURNALS}/${id}`,
      data
    );
    return response.data;
  },

  /**
   * 매매일지 삭제
   * DELETE /api/journals/{journalId}
   */
  deleteJournal: async (id: number): Promise<void> => {
    await axiosInstance.delete(`${API_JOURNALS}/${id}`);
  },

  /**
   * 통계 정보 조회
   * GET /api/journals/statistics
   */
  getStatistics: async (): Promise<JournalStatistics> => {
    const response = await axiosInstance.get<JournalStatistics>(
      `${API_JOURNALS}/statistics`
    );
    return response.data;
  },
};
