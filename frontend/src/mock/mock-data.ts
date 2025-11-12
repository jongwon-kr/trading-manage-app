import { MarketData, PreMarketAnalysis } from '@/types/analysis'

export const mockMarketData: MarketData[] = [
  {
    symbol: 'AAPL',
    name: 'Apple Inc.',
    currentPrice: 178.25,
    change: 3.45,
    changePercent: 1.97,
    volume: 89456789,
    avgVolume: 75234567,
    marketCap: 2890000000000,
    gapPercent: 0.8,
    sector: 'Technology'
  },
  {
    symbol: 'TSLA',
    name: 'Tesla Inc.',
    currentPrice: 245.67,
    change: -5.23,
    changePercent: -2.09,
    volume: 156789012,
    avgVolume: 98765432,
    marketCap: 785000000000,
    gapPercent: -1.2,
    sector: 'Consumer Cyclical'
  },
  {
    symbol: 'MSFT',
    name: 'Microsoft Corp.',
    currentPrice: 412.89,
    change: 8.76,
    changePercent: 2.17,
    volume: 45678901,
    avgVolume: 52345678,
    marketCap: 3120000000000,
    gapPercent: 1.5,
    sector: 'Technology'
  },
  {
    symbol: 'GOOGL',
    name: 'Alphabet Inc.',
    currentPrice: 142.33,
    change: -2.14,
    changePercent: -1.48,
    volume: 67890123,
    avgVolume: 58901234,
    marketCap: 1750000000000,
    gapPercent: -0.9,
    sector: 'Communication Services'
  },
  {
    symbol: 'NVDA',
    name: 'NVIDIA Corp.',
    currentPrice: 487.12,
    change: 12.45,
    changePercent: 2.62,
    volume: 234567890,
    avgVolume: 187654321,
    marketCap: 1200000000000,
    gapPercent: 2.8,
    sector: 'Technology'
  }
]

export const mockPreMarketAnalysis: PreMarketAnalysis = {
  marketOverview: {
    trend: 'bullish',
    volatility: 'medium',
    volume: 'high'
  },
  topGainers: mockMarketData.filter(d => d.changePercent > 0).slice(0, 3),
  topLosers: mockMarketData.filter(d => d.changePercent < 0).slice(0, 3),
  mostActive: mockMarketData.sort((a, b) => b.volume - a.volume).slice(0, 3),
  watchlist: mockMarketData.slice(0, 4)
}
