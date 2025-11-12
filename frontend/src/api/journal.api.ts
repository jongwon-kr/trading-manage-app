import axiosInstance from './axios';
import { 
  JournalApiDto, 
  JournalStatistics,
  JournalSummary,
  JournalPaging // [수정]
} from '@/types/journal.types'; 
// [제거] Page 타입 (common.types.ts의 PagedResponse로 대체됨)
import { API_ENDPOINTS } from '@/utils/constants';

// 백엔드의 /api/journals 엔드포인트와 통신합니다.

export const journalAPI = {
  
  /**
   * [수정] 매매일지 검색 (기존 getJournals 통합)
   * GET /api/journals 또는 /api/journals/search
   */
  search: async (filters: JournalApiDto.JournalFilters): Promise<JournalPaging<JournalSummary>> => {
    
    // 쿼리 파라미터 생성
    const params = new URLSearchParams();
    
    // Pageable 파라미터
    params.append('page', (filters.page || 0).toString());
    params.append('size', (filters.size || 20).toString());
    params.append('sortBy', filters.sortBy || 'createdAt');
    params.append('direction', filters.direction || 'DESC');
    
    // 검색 필터 파라미터
    let endpoint = API_ENDPOINTS.JOURNALS.BASE; // 기본 엔드포인트
    
    const searchFilters: Partial<JournalApiDto.JournalFilters> = {};
    
    if (filters.market) searchFilters.market = filters.market;
    if (filters.symbol) searchFilters.symbol = filters.symbol;
    if (filters.tradeType) searchFilters.tradeType = filters.tradeType;
    if (filters.isClosed !== undefined) searchFilters.isClosed = filters.isClosed;
    
    // 검색 필터가 하나라도 있으면, /search 엔드포인트 사용
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


  /**
   * 매매일지 상세 조회
   * GET /api/journals/{journalId}
   */
  getJournalById: async (id: number): Promise<JournalApiDto.JournalResponse> => {
    const response = await axiosInstance.get<JournalApiDto.JournalResponse>(
      API_ENDPOINTS.JOURNALS.BY_ID(id)
    );
    return response.data;
  },

  /**
   * 매매일지 생성
   * POST /api/journals
   */
  createJournal: async (data: JournalApiDto.CreateRequest): Promise<JournalApiDto.JournalResponse> => {
    const response = await axiosInstance.post<JournalApiDto.JournalResponse>(
      API_ENDPOINTS.JOURNALS.BASE,
      data
    );
    return response.data;
  },

  /**
   * 매매일지 수정
   * PUT /api/journals/{journalId}
   */
  updateJournal: async (id: number, data: JournalApiDto.UpdateRequest): Promise<JournalApiDto.JournalResponse> => {
    const response = await axiosInstance.put<JournalApiDto.JournalResponse>(
      API_ENDPOINTS.JOURNALS.BY_ID(id),
      data
    );
    return response.data;
  },

  /**
   * 매매일지 삭제
   * DELETE /api/journals/{journalId}
   */
  deleteJournal: async (id: number): Promise<void> => {
    await axiosInstance.delete(API_ENDPOINTS.JOURNALS.BY_ID(id));
  },

  /**
   * 통계 정보 조회
   * GET /api/journals/statistics
   */
  getStatistics: async (): Promise<JournalStatistics> => {
    const response = await axiosInstance.get<JournalStatistics>(
      API_ENDPOINTS.JOURNALS.STATS
    );
    return response.data;
  },
};