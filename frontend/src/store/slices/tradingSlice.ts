import { createSlice, PayloadAction, createAsyncThunk } from '@reduxjs/toolkit'
import { MarketData, PreMarketAnalysis } from '@/types/analysis.types'
import { 
  JournalPaging,
  JournalStatistics,
  JournalSummary,
  JournalApiDto,
} from '@/types/journal.types'
import { 
  PerformanceMetrics, 
  PerformanceChart, 
  MonthlyReturns, 
  SectorAnalysis, 
  StrategyPerformance, 
  RiskMetrics 
} from '@/types/performance'
import { journalAPI } from '@/api/journal.api'
import { toast } from 'sonner'
import { RootState } from '@/store'

interface TradingState {
  marketData: MarketData[];
  preMarketAnalysis: PreMarketAnalysis | null;
  watchlist: string[];
  selectedStock: string | null;
  isLoading: boolean;
  isJournalLoading: boolean; 
  isStatsLoading: boolean; 
  lastUpdate: string | null;

  journals: JournalPaging<JournalSummary>; // [수정]
  journalStats: JournalStatistics | null;
  selectedJournal: string | null;
  journalFilters: JournalApiDto.JournalFilters; // [수정]

  performanceMetrics: PerformanceMetrics | null;
  performanceChart: PerformanceChart[];
  monthlyReturns: MonthlyReturns[];
  sectorAnalysis: SectorAnalysis[];
  strategyPerformance: StrategyPerformance[];
  riskMetrics: RiskMetrics | null;
  benchmarkSymbol: string;
  performancePeriod: "1M" | "3M" | "6M" | "1Y" | "ALL";
}

// [수정] PagedResponse<T>에 맞춘 초기값
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

  journals: initialJournalPaging, // [수정]
  journalStats: null,
  selectedJournal: null,
  journalFilters: { // [수정]
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

// --- 비동기 Thunks (Async Thunks) ---

/**
 * [수정] 매매일지 목록 조회
 */
export const fetchJournals = createAsyncThunk(
  'trading/fetchJournals',
  async (filters: JournalApiDto.JournalFilters, { rejectWithValue }) => {
    try {
      const response = await journalAPI.search(filters); // [수정]
      return response;
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

/**
 * 매매일지 통계 조회
 */
export const fetchJournalStats = createAsyncThunk(
  'trading/fetchJournalStats',
  async (_, { rejectWithValue }) => {
    try {
      const response = await journalAPI.getStatistics();
      return response;
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

/**
 * 매매일지 생성
 */
export const createJournal = createAsyncThunk(
  'trading/createJournal',
  async (data: JournalApiDto.CreateRequest, { dispatch, getState, rejectWithValue }) => {
    try {
      const newJournal = await journalAPI.createJournal(data); 
      
      // [수정] 성공 시, 현재 필터로 1페이지 및 통계 새로고침
      const state = getState() as RootState;
      dispatch(fetchJournals(state.trading.journalFilters)); 
      dispatch(fetchJournalStats());
      return newJournal; 
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

/**
 * 매매일지 삭제
 */
export const deleteJournal = createAsyncThunk(
  'trading/deleteJournal',
  async (journalId: number, { dispatch, getState, rejectWithValue }) => {
    try {
      await journalAPI.deleteJournal(journalId);
      
      // [수정] 성공 시, 현재 필터로 1페이지 및 통계 새로고침
      const state = getState() as RootState;
      dispatch(fetchJournals(state.trading.journalFilters)); 
      dispatch(fetchJournalStats());
      return journalId;
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);


// --- tradingSlice ---

const tradingSlice = createSlice({
  name: "trading",
  initialState,
  reducers: {
    // ... (기존 리듀서들: setMarketData, ... , updateStockPrice) ...
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
      // (기존 로직 생략)
    },
    
    // [수정] setJournalFilters 타입
    setJournalFilters: (
      state,
      action: PayloadAction<Partial<JournalApiDto.JournalFilters>>
    ) => {
      state.journalFilters = { ...state.journalFilters, ...action.payload };
    },

    // ... (기존 리듀서들: setPerformanceMetrics, ... , setPerformancePeriod) ...
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
    // --- 매매일지 목록 (fetchJournals) ---
    builder
      .addCase(fetchJournals.pending, (state) => {
        state.isJournalLoading = true;
      })
      .addCase(fetchJournals.fulfilled, (state, action: PayloadAction<JournalPaging<JournalSummary>>) => {
        state.isJournalLoading = false;
        state.journals = action.payload; // [수정] PagedResponse DTO를 그대로 저장
      })
      .addCase(fetchJournals.rejected, (state, action) => {
        state.isJournalLoading = false;
        toast.error("매매일지 조회 실패", { description: action.payload as string });
      });

    // --- 매매일지 통계 (fetchJournalStats) ---
    builder
      .addCase(fetchJournalStats.pending, (state) => {
        state.isStatsLoading = true;
      })
      .addCase(fetchJournalStats.fulfilled, (state, action: PayloadAction<JournalStatistics>) => {
        state.isStatsLoading = false;
        state.journalStats = action.payload;
      })
      .addCase(fetchJournalStats.rejected, (state, action) => {
        state.isStatsLoading = false;
        toast.error("통계 조회 실패", { description: action.payload as string });
      });
      
    // --- 매매일지 생성 (createJournal) ---
    builder
      .addCase(createJournal.pending, (state) => {
        state.isJournalLoading = true;
      })
      .addCase(createJournal.fulfilled, (state) => {
        state.isJournalLoading = false;
        toast.success("매매일지 작성 성공!");
        // [수정] 목록에 수동 추가 로직 제거 (Thunk가 fetchJournals를 다시 호출함)
      })
      .addCase(createJournal.rejected, (state, action) => {
        state.isJournalLoading = false;
        toast.error("매매일지 작성 실패", { description: action.payload as string });
      });

    // --- 매매일지 삭제 (deleteJournal) ---
    builder
      .addCase(deleteJournal.pending, (state) => {
        state.isJournalLoading = true; 
      })
      .addCase(deleteJournal.fulfilled, (state) => {
        state.isJournalLoading = false;
        toast.success("매매일지 삭제 성공!");
        // [수정] 목록에서 수동 제거 로직 제거 (Thunk가 fetchJournals를 다시 호출함)
      })
      .addCase(deleteJournal.rejected, (state, action) => {
        state.isJournalLoading = false;
        toast.error("매매일지 삭제 실패", { description: action.payload as string });
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