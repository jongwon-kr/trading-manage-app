import { 
  PerformanceMetrics, 
  PerformanceChart, 
  MonthlyReturns, 
  SectorAnalysis, 
  StrategyPerformance,
  RiskMetrics 
} from '@/types/performance'

export const mockPerformanceMetrics: PerformanceMetrics = {
  totalReturn: 15.7,
  annualizedReturn: 18.2,
  sharpeRatio: 1.34,
  maxDrawdown: -8.5,
  volatility: 13.6,
  beta: 0.85,
  alpha: 2.3,
  winRate: 68.3,
  profitFactor: 2.1,
  avgWin: 4.2,
  avgLoss: -2.1,
  totalTrades: 42,
  winningTrades: 29,
  losingTrades: 13,
  avgHoldingPeriod: 5.2,
  bestTrade: 12.8,
  worstTrade: -6.3,
  currentStreak: 3,
  longestWinStreak: 8,
  longestLossStreak: 3
}

export const mockPerformanceChart: PerformanceChart[] = [
  { date: '2024-01', portfolioValue: 100000, benchmark: 100000, drawdown: 0, returns: 0, cumulative: 0 },
  { date: '2024-02', portfolioValue: 102500, benchmark: 101200, drawdown: 0, returns: 2.5, cumulative: 2.5 },
  { date: '2024-03', portfolioValue: 105800, benchmark: 103500, drawdown: 0, returns: 3.2, cumulative: 5.8 },
  { date: '2024-04', portfolioValue: 103200, benchmark: 102800, drawdown: -2.5, returns: -2.5, cumulative: 3.2 },
  { date: '2024-05', portfolioValue: 107900, benchmark: 105200, drawdown: 0, returns: 4.6, cumulative: 7.9 },
  { date: '2024-06', portfolioValue: 111300, benchmark: 106800, drawdown: 0, returns: 3.1, cumulative: 11.3 },
  { date: '2024-07', portfolioValue: 109800, benchmark: 105500, drawdown: -1.3, returns: -1.3, cumulative: 9.8 },
  { date: '2024-08', portfolioValue: 114200, benchmark: 108200, drawdown: 0, returns: 4.0, cumulative: 14.2 },
  { date: '2024-09', portfolioValue: 112500, benchmark: 107000, drawdown: -1.5, returns: -1.5, cumulative: 12.5 },
  { date: '2024-10', portfolioValue: 116800, benchmark: 109500, drawdown: 0, returns: 3.8, cumulative: 16.8 },
  { date: '2024-11', portfolioValue: 115700, benchmark: 108800, drawdown: -0.9, returns: -0.9, cumulative: 15.7 }
]

export const mockMonthlyReturns: MonthlyReturns[] = [
  { month: '2024-01', year: 2024, returns: 0, trades: 0 },
  { month: '2024-02', year: 2024, returns: 2.5, trades: 3 },
  { month: '2024-03', year: 2024, returns: 3.2, trades: 4 },
  { month: '2024-04', year: 2024, returns: -2.5, trades: 5 },
  { month: '2024-05', year: 2024, returns: 4.6, trades: 3 },
  { month: '2024-06', year: 2024, returns: 3.1, trades: 4 },
  { month: '2024-07', year: 2024, returns: -1.3, trades: 2 },
  { month: '2024-08', year: 2024, returns: 4.0, trades: 5 },
  { month: '2024-09', year: 2024, returns: -1.5, trades: 3 },
  { month: '2024-10', year: 2024, returns: 3.8, trades: 4 },
  { month: '2024-11', year: 2024, returns: -0.9, trades: 2 }
]

export const mockSectorAnalysis: SectorAnalysis[] = [
  { sector: 'Technology', allocation: 45, returns: 18.5, trades: 18, winRate: 72.2 },
  { sector: 'Healthcare', allocation: 20, returns: 12.3, trades: 8, winRate: 62.5 },
  { sector: 'Financial Services', allocation: 15, returns: 8.7, trades: 6, winRate: 66.7 },
  { sector: 'Consumer Cyclical', allocation: 12, returns: 15.2, trades: 7, winRate: 71.4 },
  { sector: 'Energy', allocation: 8, returns: 22.1, trades: 3, winRate: 100.0 }
]

export const mockStrategyPerformance: StrategyPerformance[] = [
  { 
    strategy: 'Momentum Breakout', 
    trades: 12, 
    winRate: 75.0, 
    totalReturn: 8.5, 
    avgReturn: 0.71, 
    profitFactor: 2.8 
  },
  { 
    strategy: 'Support Bounce', 
    trades: 8, 
    winRate: 62.5, 
    totalReturn: 3.2, 
    avgReturn: 0.40, 
    profitFactor: 1.6 
  },
  { 
    strategy: 'Reversal Play', 
    trades: 7, 
    winRate: 71.4, 
    totalReturn: 2.8, 
    avgReturn: 0.40, 
    profitFactor: 2.1 
  },
  { 
    strategy: 'AI Theme Play', 
    trades: 5, 
    winRate: 80.0, 
    totalReturn: 4.2, 
    avgReturn: 0.84, 
    profitFactor: 3.2 
  },
  { 
    strategy: 'Earnings Play', 
    trades: 10, 
    winRate: 60.0, 
    totalReturn: 1.5, 
    avgReturn: 0.15, 
    profitFactor: 1.3 
  }
]

export const mockRiskMetrics: RiskMetrics = {
  var95: -3.2,
  var99: -5.8,
  expectedShortfall: -4.1,
  maxConsecutiveLosses: 3,
  largestLoss: -6.3,
  averageLoss: -2.1,
  downside_deviation: 4.8
}
