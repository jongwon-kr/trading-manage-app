import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { tradesAPI } from '../../api/trades.api';
import {
  TradeState,
  TradeFilters,
  CreateTradeRequest,
  UpdateTradeRequest,
} from '../../types/trade.types';
import { DEFAULT_PAGE_SIZE } from '../../utils/constants';

// Initial state
const initialState: TradeState = {
  trades: [],
  currentTrade: null,
  isLoading: false,
  error: null,
  filters: {
    page: 0,
    size: DEFAULT_PAGE_SIZE,
  },
  totalElements: 0,
  totalPages: 0,
};

// Async thunks
export const fetchTrades = createAsyncThunk(
  'trades/fetchTrades',
  async (filters: TradeFilters | undefined, { rejectWithValue }) => {
    try {
      const response = await tradesAPI.getAllTrades(filters);
      return response;
    } catch (error) {
      return rejectWithValue((error as Error).message);
    }
  }
);

export const fetchTradeById = createAsyncThunk(
  'trades/fetchTradeById',
  async (id: number, { rejectWithValue }) => {
    try {
      const trade = await tradesAPI.getTradeById(id);
      return trade;
    } catch (error) {
      return rejectWithValue((error as Error).message);
    }
  }
);

export const createTrade = createAsyncThunk(
  'trades/createTrade',
  async (data: CreateTradeRequest, { rejectWithValue }) => {
    try {
      const trade = await tradesAPI.createTrade(data);
      return trade;
    } catch (error) {
      return rejectWithValue((error as Error).message);
    }
  }
);

export const updateTrade = createAsyncThunk(
  'trades/updateTrade',
  async ({ id, data }: { id: number; data: UpdateTradeRequest }, { rejectWithValue }) => {
    try {
      const trade = await tradesAPI.updateTrade(id, data);
      return trade;
    } catch (error) {
      return rejectWithValue((error as Error).message);
    }
  }
);

export const deleteTrade = createAsyncThunk(
  'trades/deleteTrade',
  async (id: number, { rejectWithValue }) => {
    try {
      await tradesAPI.deleteTrade(id);
      return id;
    } catch (error) {
      return rejectWithValue((error as Error).message);
    }
  }
);

export const fetchStats = createAsyncThunk(
  'trades/fetchStats',
  async (_, { rejectWithValue }) => {
    try {
      const stats = await tradesAPI.getTradingStats();
      return stats;
    } catch (error) {
      return rejectWithValue((error as Error).message);
    }
  }
);

// Slice
const tradesSlice = createSlice({
  name: 'trades',
  initialState,
  reducers: {
    setFilters: (state, action: PayloadAction<TradeFilters>) => {
      state.filters = { ...state.filters, ...action.payload };
    },
    clearCurrentTrade: (state) => {
      state.currentTrade = null;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    // Fetch trades
    builder
      .addCase(fetchTrades.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchTrades.fulfilled, (state, action) => {
        state.isLoading = false;
        state.trades = action.payload.content;
        state.totalElements = action.payload.totalElements;
        state.totalPages = action.payload.totalPages;
      })
      .addCase(fetchTrades.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Fetch trade by ID
    builder
      .addCase(fetchTradeById.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchTradeById.fulfilled, (state, action) => {
        state.isLoading = false;
        state.currentTrade = action.payload;
      })
      .addCase(fetchTradeById.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Create trade
    builder
      .addCase(createTrade.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(createTrade.fulfilled, (state, action) => {
        state.isLoading = false;
        state.trades.unshift(action.payload);
      })
      .addCase(createTrade.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Update trade
    builder
      .addCase(updateTrade.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(updateTrade.fulfilled, (state, action) => {
        state.isLoading = false;
        const index = state.trades.findIndex((t) => t.id === action.payload.id);
        if (index !== -1) {
          state.trades[index] = action.payload;
        }
        if (state.currentTrade?.id === action.payload.id) {
          state.currentTrade = action.payload;
        }
      })
      .addCase(updateTrade.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Delete trade
    builder
      .addCase(deleteTrade.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(deleteTrade.fulfilled, (state, action) => {
        state.isLoading = false;
        state.trades = state.trades.filter((t) => t.id !== action.payload);
        if (state.currentTrade?.id === action.payload) {
          state.currentTrade = null;
        }
      })
      .addCase(deleteTrade.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });
  },
});

export const { setFilters, clearCurrentTrade, clearError } = tradesSlice.actions;
export default tradesSlice.reducer;
