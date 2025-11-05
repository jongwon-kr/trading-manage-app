import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import { MarketData, PreMarketAnalysis } from '@/types/analysis'
import { Trade, TradingJournalStats } from '@/types/trading' // ✅ 추가

interface TradingState {
  marketData: MarketData[]
  preMarketAnalysis: PreMarketAnalysis | null
  watchlist: string[]
  selectedStock: string | null
  isLoading: boolean
  lastUpdate: string | null
  
  // ✅ 매매 일지 관련 상태 추가
  trades: Trade[]
  journalStats: TradingJournalStats | null
  selectedTrade: string | null
  journalFilters: {
    status: 'all' | 'open' | 'closed'
    type: 'all' | 'long' | 'short'
    strategy: string
    dateRange: {
      from: string | null
      to: string | null
    }
  }
}

const initialState: TradingState = {
  marketData: [],
  preMarketAnalysis: null,
  watchlist: [],
  selectedStock: null,
  isLoading: false,
  lastUpdate: null,
  
  // ✅ 매매 일지 초기값
  trades: [],
  journalStats: null,
  selectedTrade: null,
  journalFilters: {
    status: 'all',
    type: 'all',
    strategy: '',
    dateRange: {
      from: null,
      to: null
    }
  }
}

const tradingSlice = createSlice({
  name: 'trading',
  initialState,
  reducers: {
    // 기존 reducers...
    setMarketData: (state, action: PayloadAction<MarketData[]>) => {
      state.marketData = action.payload
      state.lastUpdate = new Date().toISOString()
    },
    setPreMarketAnalysis: (state, action: PayloadAction<PreMarketAnalysis>) => {
      state.preMarketAnalysis = action.payload
      state.lastUpdate = new Date().toISOString()
    },
    addToWatchlist: (state, action: PayloadAction<string>) => {
      if (!state.watchlist.includes(action.payload)) {
        state.watchlist.push(action.payload)
      }
    },
    removeFromWatchlist: (state, action: PayloadAction<string>) => {
      state.watchlist = state.watchlist.filter(symbol => symbol !== action.payload)
    },
    setSelectedStock: (state, action: PayloadAction<string | null>) => {
      state.selectedStock = action.payload
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload
    },
    updateStockPrice: (state, action: PayloadAction<{ symbol: string; price: number; change: number; changePercent: number }>) => {
      const stock = state.marketData.find(s => s.symbol === action.payload.symbol)
      if (stock) {
        stock.currentPrice = action.payload.price
        stock.change = action.payload.change
        stock.changePercent = action.payload.changePercent
      }
      state.lastUpdate = new Date().toISOString()
    },

    // ✅ 매매 일지 관련 reducers 추가
    setTrades: (state, action: PayloadAction<Trade[]>) => {
      state.trades = action.payload
    },
    addTrade: (state, action: PayloadAction<Trade>) => {
      state.trades.push(action.payload)
    },
    updateTrade: (state, action: PayloadAction<Trade>) => {
      const index = state.trades.findIndex(t => t.id === action.payload.id)
      if (index !== -1) {
        state.trades[index] = action.payload
      }
    },
    deleteTrade: (state, action: PayloadAction<string>) => {
      state.trades = state.trades.filter(t => t.id !== action.payload)
    },
    setSelectedTrade: (state, action: PayloadAction<string | null>) => {
      state.selectedTrade = action.payload
    },
    setJournalStats: (state, action: PayloadAction<TradingJournalStats>) => {
      state.journalStats = action.payload
    },
    setJournalFilters: (state, action: PayloadAction<Partial<typeof initialState.journalFilters>>) => {
      state.journalFilters = { ...state.journalFilters, ...action.payload }
    },
    closeTrade: (state, action: PayloadAction<{ tradeId: string; exitPrice: number; exitDate: string; postAnalysis: string }>) => {
      const trade = state.trades.find(t => t.id === action.payload.tradeId)
      if (trade) {
        trade.status = 'closed'
        trade.exitPrice = action.payload.exitPrice
        trade.exitDate = action.payload.exitDate
        trade.postAnalysis = action.payload.postAnalysis
        trade.realizedPnL = (action.payload.exitPrice - trade.entryPrice) * trade.quantity * (trade.type === 'long' ? 1 : -1)
        trade.returnPercentage = ((action.payload.exitPrice - trade.entryPrice) / trade.entryPrice) * 100 * (trade.type === 'long' ? 1 : -1)
        trade.updatedAt = new Date().toISOString()
      }
    }
  }
})

export const {
  setMarketData,
  setPreMarketAnalysis,
  addToWatchlist,
  removeFromWatchlist,
  setSelectedStock,
  setLoading,
  updateStockPrice,
  // ✅ 매매 일지 액션들
  setTrades,
  addTrade,
  updateTrade,
  deleteTrade,
  setSelectedTrade,
  setJournalStats,
  setJournalFilters,
  closeTrade
} = tradingSlice.actions

export default tradingSlice.reducer
