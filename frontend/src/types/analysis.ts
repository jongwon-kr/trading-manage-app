export interface MarketData {
  symbol: string
  name: string
  currentPrice: number
  change: number
  changePercent: number
  volume: number
  avgVolume: number
  marketCap: number
  gapPercent: number
  sector: string
}

export interface TechnicalIndicator {
  rsi: number
  macd: number
  sma20: number
  sma50: number
  bollinger: {
    upper: number
    middle: number
    lower: number
  }
}

export interface PreMarketAnalysis {
  marketOverview: {
    trend: 'bullish' | 'bearish' | 'neutral'
    volatility: 'high' | 'medium' | 'low'
    volume: 'high' | 'normal' | 'low'
  }
  topGainers: MarketData[]
  topLosers: MarketData[]
  mostActive: MarketData[]
  watchlist: MarketData[]
}
