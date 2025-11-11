// Trading journal related types

export enum TradeType {
  BUY = 'BUY',
  SELL = 'SELL',
}

export enum TradeStatus {
  PENDING = 'PENDING',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export interface Trade {
  id: number;
  userId: number;
  symbol: string;
  type: TradeType;
  quantity: number;
  entryPrice: number;
  exitPrice?: number;
  stopLoss?: number;
  takeProfit?: number;
  status: TradeStatus;
  notes?: string;
  entryDate: string;
  exitDate?: string;
  profitLoss?: number;
  profitLossPercentage?: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTradeRequest {
  symbol: string;
  type: TradeType;
  quantity: number;
  entryPrice: number;
  exitPrice?: number;
  stopLoss?: number;
  takeProfit?: number;
  notes?: string;
  entryDate: string;
  exitDate?: string;
}

export interface UpdateTradeRequest extends Partial<CreateTradeRequest> {
  status?: TradeStatus;
}

export interface TradeFilters {
  symbol?: string;
  type?: TradeType;
  status?: TradeStatus;
  startDate?: string;
  endDate?: string;
  page?: number;
  size?: number;
  sort?: string;
}

export interface TradesResponse {
  content: Trade[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
}

export interface TradeState {
  trades: Trade[];
  currentTrade: Trade | null;
  isLoading: boolean;
  error: string | null;
  filters: TradeFilters;
  totalElements: number;
  totalPages: number;
}

export interface TradingStats {
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  totalProfit: number;
  totalLoss: number;
  winRate: number;
  averageProfit: number;
  averageLoss: number;
  profitFactor: number;
  largestWin: number;
  largestLoss: number;
}
