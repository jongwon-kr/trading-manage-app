import { createSlice, PayloadAction, createAsyncThunk } from "@reduxjs/toolkit";
import { MarketData, PreMarketAnalysis } from "@/types/analysis.types";
import {
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
  isDetailLoading: boolean; // 상세 로딩
  lastUpdate: string | null;

  journals: JournalApiDto.PagedJournalResponse; // 타입 수정
  journalStats: JournalApiDto.StatisticsResponse | null; // 타입 수정
  selectedJournalDetail: JournalApiDto.JournalResponse | null; // 상세 데이터
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

const initialJournalPaging: JournalApiDto.PagedJournalResponse = {
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
  isDetailLoading: false, // 초기값
  lastUpdate: null,

  journals: initialJournalPaging,
  journalStats: null,
  selectedJournalDetail: null, // 초기값
  journalFilters: {
    page: 0,
    size: 20,
    // [수정] 정렬 기준을 'entryDate'에서 'createdAt'으로 변경 (백엔드 오류 수정)
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

// [신규] 상세 조회 Thunk
export const fetchJournalById = createAsyncThunk(
  "trading/fetchJournalById",
  async (journalId: number, { rejectWithValue }) => {
    try {
      const response = await journalAPI.getJournalById(journalId);
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
      dispatch(fetchJournals(state.trading.journalFilters)); // 목록 새로고침
      dispatch(fetchJournalStats()); // 통계 새로고침
      return newJournal;
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

// [신규] 수정 Thunk
export const updateJournal = createAsyncThunk(
  "trading/updateJournal",
  async (
    { id, data }: { id: number; data: JournalApiDto.UpdateRequest },
    { dispatch, getState, rejectWithValue }
  ) => {
    try {
      const updatedJournal = await journalAPI.updateJournal(id, data);
      const state = getState() as RootState;
      dispatch(fetchJournals(state.trading.journalFilters)); // 목록 새로고침
      dispatch(fetchJournalStats()); // 통계 새로고침
      return updatedJournal;
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
      dispatch(fetchJournals(state.trading.journalFilters)); // 목록 새로고침
      dispatch(fetchJournalStats()); // 통계 새로고침
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
    ) => {
        // 실시간 업데이트 로직 (필요시 구현)
    },

    setJournalFilters: (
      state,
      action: PayloadAction<Partial<JournalApiDto.JournalFilters>>
    ) => {
      state.journalFilters = { ...state.journalFilters, ...action.payload };
    },
    
    // [수정] selectedJournalDetail을 사용하도록 변경
    clearSelectedJournal: (state) => {
        state.selectedJournalDetail = null;
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
    // fetchJournals
    builder
      .addCase(fetchJournals.pending, (state) => {
        state.isJournalLoading = true;
      })
      .addCase(
        fetchJournals.fulfilled,
        (state, action: PayloadAction<JournalApiDto.PagedJournalResponse>) => {
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

    // fetchJournalStats
    builder
      .addCase(fetchJournalStats.pending, (state) => {
        state.isStatsLoading = true;
      })
      .addCase(
        fetchJournalStats.fulfilled,
        (state, action: PayloadAction<JournalApiDto.StatisticsResponse>) => {
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

    // [신규] fetchJournalById
    builder
      .addCase(fetchJournalById.pending, (state) => {
        state.isDetailLoading = true;
        state.selectedJournalDetail = null;
      })
      .addCase(
        fetchJournalById.fulfilled,
        (state, action: PayloadAction<JournalApiDto.JournalResponse>) => {
          state.isDetailLoading = false;
          state.selectedJournalDetail = action.payload;
        }
      )
      .addCase(fetchJournalById.rejected, (state, action) => {
        state.isDetailLoading = false;
        toast.error("상세 내역 조회 실패", {
          description: action.payload as string,
        });
      });

    // createJournal
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

    // [신규] updateJournal
    builder
      .addCase(updateJournal.pending, (state) => {
        state.isJournalLoading = true;
      })
      .addCase(updateJournal.fulfilled, (state) => {
        state.isJournalLoading = false;
        toast.success("매매일지 수정 성공!");
      })
      .addCase(updateJournal.rejected, (state, action) => {
        state.isJournalLoading = false;
        toast.error("매매일지 수정 실패", {
          description: action.payload as string,
        });
      });

    // deleteJournal
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
  setJournalFilters,
  clearSelectedJournal,
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