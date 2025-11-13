import { PagedResponse } from "./common.types";

// 백엔드 enum과 일치
export enum MarketType {
  STOCK = "STOCK",
  CRYPTO = "CRYPTO",
  FOREX = "FOREX",
  FUTURES = "FUTURES",
}

export enum TradeType {
  LONG = "LONG",
  SHORT = "SHORT",
}

export type LocalDateTime = string | number[];

export interface ReasoningDto {
  markdown: string;
  images?: string[];
}

/**
 * 매매일지 API DTO
 */
export namespace JournalApiDto {
  /**
   * 생성 요청 DTO
   */
  export interface CreateRequest {
    market: MarketType;
    symbol: string;
    tradeType: TradeType;
    quantity: number;
    entryPrice: number;
    stopLossPrice?: number;
    exitPrice?: number;
    realizedPnL?: number;
    reasoning: ReasoningDto;
    entryDate: string;
    exitDate?: string;
  }

  /**
   * 수정 요청 DTO
   */
  export interface UpdateRequest {
    market?: MarketType;
    symbol?: string;
    tradeType?: TradeType;
    quantity?: number;
    entryPrice?: number;
    stopLossPrice?: number;
    exitPrice?: number;
    realizedPnL?: number;
    reasoning?: ReasoningDto;
    entryDate?: string;
    exitDate?: string;
  }

  /**
   * 상세 응답 DTO (1건 조회)
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
    exitPrice: number | null;
    realizedPnL: number | null;
    reasoning: ReasoningDto | null;
    entryDate: LocalDateTime;
    exitDate: LocalDateTime | null;
    createdAt: LocalDateTime;
    updatedAt: LocalDateTime;
    isClosed: boolean;
  }

  /**
   * 요약 응답 DTO (목록 조회)
   */
  export interface JournalSummaryResponse {
    id: number;
    market: MarketType;
    symbol: string;
    tradeType: TradeType;
    quantity: number;
    entryPrice: number;
    exitPrice: number | null;
    realizedPnL: number | null;
    entryDate: LocalDateTime;
    exitDate: LocalDateTime | null;
    isClosed: boolean;
  }

  /**
   * 통계 응답 DTO
   */
  export interface StatisticsResponse {
    totalTrades: number;
    openTrades: number;
    closedTrades: number;
    winRate: number;
    totalPnL: number;
    avgProfit: number;
    avgLoss: number;
    profitFactor: number;
  }

  /**
   * 목록 페이징 응답
   */
  export type PagedJournalResponse = PagedResponse<JournalSummaryResponse>;

  /**
   * 검색 필터
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
    startDate?: string; // ISO 8601 string
    endDate?: string; // ISO 8601 string
  }
}