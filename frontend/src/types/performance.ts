export interface PerformanceMetrics {
  totalReturn: number
  annualizedReturn: number
  sharpeRatio: number
  maxDrawdown: number
  volatility: number
  beta: number
  alpha: number
  winRate: number
  profitFactor: number
  avgWin: number
  avgLoss: number
  totalTrades: number
  winningTrades: number
  losingTrades: number
  avgHoldingPeriod: number
  bestTrade: number
  worstTrade: number
  currentStreak: number
  longestWinStreak: number
  longestLossStreak: number
}

export interface PerformanceChart {
  date: string
  portfolioValue: number
  benchmark: number
  drawdown: number
  returns: number
  cumulative: number
}

export interface MonthlyReturns {
  month: string
  year: number
  returns: number
  trades: number
}

export interface SectorAnalysis {
  sector: string
  allocation: number
  returns: number
  trades: number
  winRate: number
}

export interface StrategyPerformance {
  strategy: string
  trades: number
  winRate: number
  totalReturn: number
  avgReturn: number
  profitFactor: number
}

export interface RiskMetrics {
  var95: number
  var99: number
  expectedShortfall: number
  maxConsecutiveLosses: number
  largestLoss: number
  averageLoss: number
  downside_deviation: number
}
