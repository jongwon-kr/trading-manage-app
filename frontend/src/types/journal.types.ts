// src/types/journal.types.ts
import { PagedResponse } from './common.types'; // [추가]

// [확인] Java의 MarketType Enum과 일치
export enum MarketType {
// ... (기존과 동일)
}

// [확인] Java의 TradeType Enum과 일치
export enum TradeType {
// ... (기존과 동일)
}

// [추가] Java의 LocalDateTime 타입 (JSON 배열)
export type LocalDateTime = [number, number, number, number, number, number, number?];

/**
 * 매매일지 목록 조회를 위한 요약 DTO
 * (BE: JournalDto.JournalSummary)
 */
export interface JournalSummary {
  id: number;
  market: MarketType;
  symbol: string;
  entryPrice: number;
  realizedPnL: number | null;
  createdAt: LocalDateTime; // [수정] string -> LocalDateTime (배열)
  isClosed: boolean;
  tradeType: TradeType; 
  quantity: number;     
}

/**
 * [수정] JournalPaging 타입을 PagedResponse로 교체
 */
export type JournalPaging<T> = PagedResponse<T>;


/**
 * 매매일지 통계 DTO
// ... (기존과 동일)
 */
export interface JournalStatistics {
// ... (기존과 동일)
}

/**
 * 매매일지 API 요청/응답을 위한 네임스페이스
// ... (기존과 동일)
 */
export namespace JournalApiDto {
  
  /**
   * 매매 근거 DTO
// ... (기존과 동일)
   */
  export interface ReasoningDto {
// ... (기존과 동일)
  }

  /**
   * 매매일지 생성 요청 DTO
// ... (기존과 동일)
   */
  export interface CreateRequest {
    market: MarketType;
    symbol: string;
    tradeType: TradeType; 
    quantity: number;     
    entryPrice: number;
    stopLossPrice?: number;
    realizedPnL?: number; // [추가]
    reasoning: ReasoningDto;
  }

  /**
   * 매매일지 수정 요청 DTO
// ... (기존과 동일)
   */
  export interface UpdateRequest {
// ... (기존과 동일)
  }

  /**
   * 매매일지 상세 응답 DTO
   */
  export interface JournalResponse {
    id: number;
    authorEmail: string;
    market: MarketType;
    symbol: string;
    tradeType: TradeType; 
    quantity: number;     
    entryPrice: number;
    stopLossPrice: number | null;
    realizedPnL: number | null;
    reasoning: ReasoningDto | null;
    createdAt: LocalDateTime; // [수정] string -> LocalDateTime (배열)
    updatedAt: LocalDateTime; // [수정] string -> LocalDateTime (배열)
  }

  /**
   * [신규] 매매일지 검색 필터 타입
   */
  export interface JournalFilters {
    page?: number;
    size?: number;
    sortBy?: string;
    direction?: "ASC" | "DESC";
    market?: MarketType;
    symbol?: string;
    isClosed?: boolean;
    tradeType?: TradeType;
  }
}