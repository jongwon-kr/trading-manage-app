import { createSlice, PayloadAction, createAsyncThunk } from "@reduxjs/toolkit";
import { MarketData, PreMarketAnalysis } from "@/types/analysis.types";
import {
  JournalPaging,
  JournalStatistics,
  JournalSummary,
  JournalApiDto,
} from "@/types/journal.types";
import {
  PerformanceMetrics,
  PerformanceChart,
  MonthlyReturns,
  SectorAnalysis,
  StrategyPerformance,
  RiskMetrics,
} from "@/types/performance";
import { journalAPI } from "@/api/journal.api";
import { toast } from "sonner";
import { RootState } from "@/store";

interface TradingState {
  marketData: MarketData[];
  preMarketAnalysis: PreMarketAnalysis | null;
  watchlist: string[];
  selectedStock: string | null;
  isLoading: boolean;
  isJournalLoading: boolean;
  isStatsLoading: boolean;
  lastUpdate: string | null;

  journals: JournalPaging<JournalSummary>;
  journalStats: JournalStatistics | null;
  selectedJournal: string | null;
  journalFilters: JournalApiDto.JournalFilters;

  performanceMetrics: PerformanceMetrics | null;
  performanceChart: PerformanceChart[];
  monthlyReturns: MonthlyReturns[];
  sectorAnalysis: SectorAnalysis[];
  strategyPerformance: StrategyPerformance[];
  riskMetrics: RiskMetrics | null;
  benchmarkSymbol: string;
  performancePeriod: "1M" | "3M" | "6M" | "1Y" | "ALL";
}

const initialJournalPaging: JournalPaging<JournalSummary> = {
  content: [],
  pageNumber: 0,
  pageSize: 20,
  totalElements: 0,
  totalPages: 0,
  isLast: true,
};

const initialState: TradingState = {
  marketData: [],
  preMarketAnalysis: null,
  watchlist: [],
  selectedStock: null,
  isLoading: false,
  isJournalLoading: false,
  isStatsLoading: false,
  lastUpdate: null,

  journals: initialJournalPaging,
  journalStats: null,
  selectedJournal: null,
  journalFilters: {
    page: 0,
    size: 20,
    sortBy: "createdAt",
    direction: "DESC",
  },

  performanceMetrics: null,
  performanceChart: [],
  monthlyReturns: [],
  sectorAnalysis: [],
  strategyPerformance: [],
  riskMetrics: null,
  benchmarkSymbol: "SPY",
  performancePeriod: "1Y",
};

export const fetchJournals = createAsyncThunk(
  "trading/fetchJournals",
  async (filters: JournalApiDto.JournalFilters, { rejectWithValue }) => {
    try {
      const response = await journalAPI.search(filters);
      return response;
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

export const fetchJournalStats = createAsyncThunk(
  "trading/fetchJournalStats",
  async (_, { rejectWithValue }) => {
    try {
      const response = await journalAPI.getStatistics();
      return response;
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

export const createJournal = createAsyncThunk(
  "trading/createJournal",
  async (
    data: JournalApiDto.CreateRequest,
    { dispatch, getState, rejectWithValue }
  ) => {
    try {
      const newJournal = await journalAPI.createJournal(data);
      const state = getState() as RootState;
      dispatch(fetchJournals(state.trading.journalFilters));
      dispatch(fetchJournalStats());
      return newJournal;
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

export const deleteJournal = createAsyncThunk(
  "trading/deleteJournal",
  async (journalId: number, { dispatch, getState, rejectWithValue }) => {
    try {
      await journalAPI.deleteJournal(journalId);

      const state = getState() as RootState;
      dispatch(fetchJournals(state.trading.journalFilters));
      dispatch(fetchJournalStats());
      return journalId;
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

const tradingSlice = createSlice({
  name: "trading",
  initialState,
  reducers: {
    setMarketData: (state, action: PayloadAction<MarketData[]>) => {
      state.marketData = action.payload;
      state.lastUpdate = new Date().toISOString();
    },
    setPreMarketAnalysis: (state, action: PayloadAction<PreMarketAnalysis>) => {
      state.preMarketAnalysis = action.payload;
      state.lastUpdate = new Date().toISOString();
    },
    addToWatchlist: (state, action: PayloadAction<string>) => {
      if (!state.watchlist.includes(action.payload)) {
        state.watchlist.push(action.payload);
      }
    },
    removeFromWatchlist: (state, action: PayloadAction<string>) => {
      state.watchlist = state.watchlist.filter(
        (symbol) => symbol !== action.payload
      );
    },
    setSelectedStock: (state, action: PayloadAction<string | null>) => {
      state.selectedStock = action.payload;
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
    updateStockPrice: (
      state,
      action: PayloadAction<{
        symbol: string;
        price: number;
        change: number;
        changePercent: number;
      }>
    ) => {},

    setJournalFilters: (
      state,
      action: PayloadAction<Partial<JournalApiDto.JournalFilters>>
    ) => {
      state.journalFilters = { ...state.journalFilters, ...action.payload };
    },

    setSelectedJournal: (state, action: PayloadAction<string | null>) => {
      state.selectedJournal = action.payload;
    },
    setPerformanceMetrics: (
      state,
      action: PayloadAction<PerformanceMetrics>
    ) => {
      state.performanceMetrics = action.payload;
    },
    setPerformanceChart: (state, action: PayloadAction<PerformanceChart[]>) => {
      state.performanceChart = action.payload;
    },
    setMonthlyReturns: (state, action: PayloadAction<MonthlyReturns[]>) => {
      state.monthlyReturns = action.payload;
    },
    setSectorAnalysis: (state, action: PayloadAction<SectorAnalysis[]>) => {
      state.sectorAnalysis = action.payload;
    },
    setStrategyPerformance: (
      state,
      action: PayloadAction<StrategyPerformance[]>
    ) => {
      state.strategyPerformance = action.payload;
    },
    setRiskMetrics: (state, action: PayloadAction<RiskMetrics>) => {
      state.riskMetrics = action.payload;
    },
    setBenchmarkSymbol: (state, action: PayloadAction<string>) => {
      state.benchmarkSymbol = action.payload;
    },
    setPerformancePeriod: (
      state,
      action: PayloadAction<"1M" | "3M" | "6M" | "1Y" | "ALL">
    ) => {
      state.performancePeriod = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchJournals.pending, (state) => {
        state.isJournalLoading = true;
      })
      .addCase(
        fetchJournals.fulfilled,
        (state, action: PayloadAction<JournalPaging<JournalSummary>>) => {
          state.isJournalLoading = false;
          state.journals = action.payload;
        }
      )
      .addCase(fetchJournals.rejected, (state, action) => {
        state.isJournalLoading = false;
        toast.error("매매일지 조회 실패", {
          description: action.payload as string,
        });
      });

    builder
      .addCase(fetchJournalStats.pending, (state) => {
        state.isStatsLoading = true;
      })
      .addCase(
        fetchJournalStats.fulfilled,
        (state, action: PayloadAction<JournalStatistics>) => {
          state.isStatsLoading = false;
          state.journalStats = action.payload;
        }
      )
      .addCase(fetchJournalStats.rejected, (state, action) => {
        state.isStatsLoading = false;
        toast.error("통계 조회 실패", {
          description: action.payload as string,
        });
      });

    builder
      .addCase(createJournal.pending, (state) => {
        state.isJournalLoading = true;
      })
      .addCase(createJournal.fulfilled, (state) => {
        state.isJournalLoading = false;
        toast.success("매매일지 작성 성공!");
      })
      .addCase(createJournal.rejected, (state, action) => {
        state.isJournalLoading = false;
        toast.error("매매일지 작성 실패", {
          description: action.payload as string,
        });
      });

    builder
      .addCase(deleteJournal.pending, (state) => {
        state.isJournalLoading = true;
      })
      .addCase(deleteJournal.fulfilled, (state) => {
        state.isJournalLoading = false;
        toast.success("매매일지 삭제 성공!");
      })
      .addCase(deleteJournal.rejected, (state, action) => {
        state.isJournalLoading = false;
        toast.error("매매일지 삭제 실패", {
          description: action.payload as string,
        });
      });
  },
});

export const {
  setMarketData,
  setPreMarketAnalysis,
  addToWatchlist,
  removeFromWatchlist,
  setSelectedStock,
  setLoading,
  updateStockPrice,
  setSelectedJournal,
  setJournalFilters,
  setPerformanceMetrics,
  setPerformanceChart,
  setMonthlyReturns,
  setSectorAnalysis,
  setStrategyPerformance,
  setRiskMetrics,
  setBenchmarkSymbol,
  setPerformancePeriod,
} = tradingSlice.actions;

export default tradingSlice.reducer;
