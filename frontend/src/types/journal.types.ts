export enum MarketType {
  STOCK = 'STOCK',
  CRYPTO = 'CRYPTO',
  FOREX = 'FOREX',
  FUTURES = 'FUTURES',
}

// 매매 이유 (JSON)
export interface ReasoningDto {
  markdown: string;
  images?: string[];
}

/**
 * 매매일지 생성 요청 (POST /api/journals)
 */
export namespace JournalApiDto {
  export interface CreateRequest {
    market: MarketType;
    symbol: string;
    entryPrice: number;
    stopLossPrice?: number;
    reasoning?: ReasoningDto;
  }

  /**
   * 매매일지 수정 요청 (PUT /api/journals/{id})
   */
  export interface UpdateRequest {
    entryPrice?: number;
    stopLossPrice?: number;
    realizedPnL?: number;
    reasoning?: ReasoningDto;
  }
}

/**
 * 매매일지 상세 정보 (GET /api/journals/{id})
 */
export interface JournalApiDto {
  id: number;
  authorEmail: string;
  market: MarketType;
  symbol: string;
  entryPrice: number;
  stopLossPrice?: number;
  realizedPnL?: number;
  reasoning?: ReasoningDto;
  createdAt: string;
  updatedAt: string;
}

/**
 * 매매일지 요약 정보 (GET /api/journals)
 */
export interface JournalSummary {
  id: number;
  market: MarketType;
  symbol: string;
  entryPrice: number;
  realizedPnL?: number;
  createdAt: string;
  isClosed: boolean;
}

/**
 * 통계 정보 (GET /api/journals/statistics)
 */
export interface JournalStatistics {
  totalPnL: number;
  totalTrades: number;
  closedTrades: number;
  openTrades: number;
  winRate: number; // 0-100
}