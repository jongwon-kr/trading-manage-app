import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import { MarketData, PreMarketAnalysis } from '@/types/analysis'

interface TradingState {
  marketData: MarketData[]
  preMarketAnalysis: PreMarketAnalysis | null
  watchlist: string[]
  selectedStock: string | null
  isLoading: boolean
  lastUpdate: string | null
}

const initialState: TradingState = {
  marketData: [],
  preMarketAnalysis: null,
  watchlist: [],
  selectedStock: null,
  isLoading: false,
  lastUpdate: null
}

const tradingSlice = createSlice({
  name: 'trading',
  initialState,
  reducers: {
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
  updateStockPrice
} = tradingSlice.actions

export default tradingSlice.reducer
