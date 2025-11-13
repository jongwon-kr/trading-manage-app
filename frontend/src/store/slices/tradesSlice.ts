import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import { tradesAPI } from "@/api/trades.api";
import {
  TradeState,
  TradeFilters,
  CreateTradeRequest,
  UpdateTradeRequest,
  Trade,
  TradeStatus,
  TradesResponse,
  TradingStats,
} from "@/types/trade.types";
import { DEFAULT_PAGE_SIZE } from "@/utils/constants";
import { RootState } from "@/store";

const MOCK_TRADES_KEY = "mock_trades";

const getMockTradesFromStorage = (): Trade[] => {
  try {
    const data = localStorage.getItem(MOCK_TRADES_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error("Error reading mock trades from localStorage", error);
    return [];
  }
};

const saveMockTradesToStorage = (trades: Trade[]) => {
  try {
    localStorage.setItem(MOCK_TRADES_KEY, JSON.stringify(trades));
  } catch (error) {
    console.error("Error saving mock trades to localStorage", error);
  }
};

const generateMockStats = (trades: Trade[]): TradingStats => {
  const closedTrades = trades.filter(
    (t) =>
      t.status === TradeStatus.COMPLETED &&
      t.profitLoss !== undefined &&
      t.profitLoss !== null
  );
  const winningTrades = closedTrades.filter((t) => t.profitLoss! > 0);
  const losingTrades = closedTrades.filter((t) => t.profitLoss! <= 0);

  const totalProfit = winningTrades.reduce((sum, t) => sum + t.profitLoss!, 0);
  const totalLoss = losingTrades.reduce((sum, t) => sum + t.profitLoss!, 0);

  const winRate =
    closedTrades.length > 0
      ? (winningTrades.length / closedTrades.length) * 100
      : 0;
  const averageProfit =
    winningTrades.length > 0 ? totalProfit / winningTrades.length : 0;
  const averageLoss =
    losingTrades.length > 0 ? totalLoss / losingTrades.length : 0;
  const profitFactor =
    totalLoss !== 0
      ? Math.abs(totalProfit / totalLoss)
      : totalProfit > 0
      ? 999
      : 0;

  return {
    totalTrades: trades.length,
    winningTrades: winningTrades.length,
    losingTrades: losingTrades.length,
    totalProfit: totalProfit,
    totalLoss: totalLoss,
    winRate: winRate,
    averageProfit: averageProfit,
    averageLoss: averageLoss,
    profitFactor: profitFactor,
    largestWin: Math.max(0, ...winningTrades.map((t) => t.profitLoss!)),
    largestLoss: Math.min(0, ...losingTrades.map((t) => t.profitLoss!)),
  };
};

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

export const fetchTrades = createAsyncThunk(
  "trades/fetchTrades",
  async (filters: TradeFilters | undefined, { rejectWithValue, getState }) => {
    const state = getState() as RootState;
    const username = state.auth.user?.username;

    if (username === "test") {
      try {
        await new Promise((res) => setTimeout(res, 200));
        const trades = getMockTradesFromStorage();

        const filteredTrades = trades
          .filter((trade) => {
            if (
              filters?.symbol &&
              !trade.symbol.toLowerCase().includes(filters.symbol.toLowerCase())
            )
              return false;
            if (filters?.type && trade.type !== filters.type) return false;
            if (filters?.status && trade.status !== filters.status)
              return false;
            return true;
          })
          .sort(
            (a, b) =>
              new Date(b.entryDate).getTime() - new Date(a.entryDate).getTime()
          );

        const response: TradesResponse = {
          content: filteredTrades,
          totalElements: filteredTrades.length,
          totalPages: 1,
          size: filteredTrades.length,
          number: 0,
        };
        return response;
      } catch (error) {
        return rejectWithValue((error as Error).message);
      }
    }

    try {
      const response = await tradesAPI.getAllTrades(filters);
      return response;
    } catch (error) {
      return rejectWithValue((error as Error).message);
    }
  }
);

export const fetchTradeById = createAsyncThunk(
  "trades/fetchTradeById",
  async (id: number, { rejectWithValue, getState }) => {
    const state = getState() as RootState;
    const username = state.auth.user?.username;

    if (username === "test") {
      try {
        await new Promise((res) => setTimeout(res, 200));
        const trades = getMockTradesFromStorage();
        const trade = trades.find((t) => t.id === id);
        if (!trade) {
          throw new Error("거래 내역을 찾을 수 없습니다.");
        }
        return trade;
      } catch (error) {
        return rejectWithValue((error as Error).message);
      }
    }

    try {
      const trade = await tradesAPI.getTradeById(id);
      return trade;
    } catch (error) {
      return rejectWithValue((error as Error).message);
    }
  }
);

export const createTrade = createAsyncThunk(
  "trades/createTrade",
  async (data: CreateTradeRequest, { rejectWithValue, getState }) => {
    const state = getState() as RootState;
    const username = state.auth.user?.username;

    if (username === "test") {
      try {
        await new Promise((res) => setTimeout(res, 200));
        const trades = getMockTradesFromStorage();
        const newId =
          trades.length > 0 ? Math.max(...trades.map((t) => t.id)) + 1 : 1;

        const newTrade: Trade = {
          id: newId,
          userId: 999,
          symbol: data.symbol,
          type: data.type,
          quantity: data.quantity,
          entryPrice: data.entryPrice,
          stopLoss: data.stopLoss,
          takeProfit: data.takeProfit,
          notes: data.notes,
          entryDate: data.entryDate || new Date().toISOString(),
          exitDate: data.exitDate,
          status: data.exitDate ? TradeStatus.COMPLETED : TradeStatus.PENDING,
          profitLoss:
            data.exitDate && data.exitPrice
              ? (data.exitPrice - data.entryPrice) * data.quantity
              : undefined,
          profitLossPercentage:
            data.exitDate && data.exitPrice
              ? ((data.exitPrice - data.entryPrice) / data.entryPrice) * 100
              : undefined,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        trades.push(newTrade);
        saveMockTradesToStorage(trades);
        return newTrade;
      } catch (error) {
        return rejectWithValue((error as Error).message);
      }
    }

    try {
      const trade = await tradesAPI.createTrade(data);
      return trade;
    } catch (error) {
      return rejectWithValue((error as Error).message);
    }
  }
);

export const updateTrade = createAsyncThunk(
  "trades/updateTrade",
  async (
    { id, data }: { id: number; data: UpdateTradeRequest },
    { rejectWithValue, getState }
  ) => {
    const state = getState() as RootState;
    const username = state.auth.user?.username;

    if (username === "test") {
      try {
        await new Promise((res) => setTimeout(res, 200));
        const trades = getMockTradesFromStorage();
        const index = trades.findIndex((t) => t.id === id);
        if (index === -1) {
          throw new Error("수정할 거래 내역을 찾을 수 없습니다.");
        }

        const updatedTrade: Trade = {
          ...trades[index],
          ...data,
          updatedAt: new Date().toISOString(),
        };

        updatedTrade.status = data.exitDate
          ? TradeStatus.COMPLETED
          : data.status || trades[index].status;
        if (
          updatedTrade.status === TradeStatus.COMPLETED &&
          updatedTrade.exitPrice
        ) {
          updatedTrade.profitLoss =
            (updatedTrade.exitPrice - updatedTrade.entryPrice) *
            updatedTrade.quantity;
          updatedTrade.profitLossPercentage =
            ((updatedTrade.exitPrice - updatedTrade.entryPrice) /
              updatedTrade.entryPrice) *
            100;
        }

        trades[index] = updatedTrade;
        saveMockTradesToStorage(trades);
        return updatedTrade;
      } catch (error) {
        return rejectWithValue((error as Error).message);
      }
    }

    try {
      const trade = await tradesAPI.updateTrade(id, data);
      return trade;
    } catch (error) {
      return rejectWithValue((error as Error).message);
    }
  }
);

export const deleteTrade = createAsyncThunk(
  "trades/deleteTrade",
  async (id: number, { rejectWithValue, getState }) => {
    const state = getState() as RootState;
    const username = state.auth.user?.username;

    if (username === "test") {
      try {
        await new Promise((res) => setTimeout(res, 200));
        const trades = getMockTradesFromStorage();
        const newTrades = trades.filter((t) => t.id !== id);
        if (trades.length === newTrades.length) {
          throw new Error("삭제할 거래 내역을 찾을 수 없습니다.");
        }
        saveMockTradesToStorage(newTrades);
        return id;
      } catch (error) {
        return rejectWithValue((error as Error).message);
      }
    }

    try {
      await tradesAPI.deleteTrade(id);
      return id;
    } catch (error) {
      return rejectWithValue((error as Error).message);
    }
  }
);

export const fetchStats = createAsyncThunk(
  "trades/fetchStats",
  async (_, { rejectWithValue, getState }) => {
    const state = getState() as RootState;
    const username = state.auth.user?.username;

    if (username === "test") {
      try {
        await new Promise((res) => setTimeout(res, 200));
        const trades = getMockTradesFromStorage();
        const stats = generateMockStats(trades);
        return stats;
      } catch (error) {
        return rejectWithValue((error as Error).message);
      }
    }

    try {
      const stats = await tradesAPI.getTradingStats();
      return stats;
    } catch (error) {
      return rejectWithValue((error as Error).message);
    }
  }
);

const tradesSlice = createSlice({
  name: "trades",
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

export const { setFilters, clearCurrentTrade, clearError } =
  tradesSlice.actions;
export default tradesSlice.reducer;
