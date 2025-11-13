export interface Trade {
  id: string;
  symbol: string;
  name: string;
  type: "long" | "short";
  status: "open" | "closed" | "pending";
  entryDate: string;
  exitDate?: string;
  entryPrice: number;
  stopLoss: number;
  exitPrice?: number;
  quantity: number;
  strategy: string;
  sector: string;

  preAnalysis: string;
  postAnalysis?: string;
  emotions: string;
  confidence: number;

  currentPrice?: number;
  unrealizedPnL?: number;
  realizedPnL?: number;
  returnPercentage?: number;

  tags: string[];
  screenshots?: string[];
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TradingJournalStats {
  totalTrades: number;
  openTrades: number;
  closedTrades: number;
  winRate: number;
  avgWin: number;
  avgLoss: number;
  profitFactor: number;
  totalReturn: number;
  bestTrade: number;
  worstTrade: number;
  currentStreak: number;
  longestWinStreak: number;
  longestLossStreak: number;
}
