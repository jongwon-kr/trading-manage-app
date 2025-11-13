import { PagedResponse } from "./common.types";
export enum MarketType {}

export enum TradeType {}

export type LocalDateTime = [
  number,
  number,
  number,
  number,
  number,
  number,
  number?
];

export interface JournalSummary {
  id: number;
  market: MarketType;
  symbol: string;
  entryPrice: number;
  realizedPnL: number | null;
  createdAt: LocalDateTime;
  isClosed: boolean;
  tradeType: TradeType;
  quantity: number;
}

export type JournalPaging<T> = PagedResponse<T>;

export interface JournalStatistics {}

export namespace JournalApiDto {
  export interface ReasoningDto {}

  export interface CreateRequest {
    market: MarketType;
    symbol: string;
    tradeType: TradeType;
    quantity: number;
    entryPrice: number;
    stopLossPrice?: number;
    realizedPnL?: number;
    reasoning: ReasoningDto;
  }

  export interface UpdateRequest {}

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
    createdAt: LocalDateTime;
    updatedAt: LocalDateTime;
  }

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
