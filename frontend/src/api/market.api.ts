import { baseApi } from "./base.api";
import { API_ENDPOINTS } from "@/utils/constants";
import type {
  CandleSeries,
  Fundamentals,
  Interval,
  MarketCode,
  MarketOverview,
  Movers,
  Quote,
  SymbolInfo,
} from "@/types/market.types";

export interface CandlesArgs {
  market: MarketCode;
  symbol: string;
  interval: Interval;
  limit?: number;
}

export const marketApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    searchSymbols: build.query<SymbolInfo[], { q: string; market?: MarketCode; limit?: number }>({
      query: (params) => ({ url: API_ENDPOINTS.MARKET.SEARCH, params }),
      keepUnusedDataFor: 300,
    }),
    getSymbol: build.query<SymbolInfo, { market: MarketCode; code: string }>({
      query: ({ market, code }) => ({ url: API_ENDPOINTS.MARKET.SYMBOL(market, code) }),
      keepUnusedDataFor: 3600,
    }),
    getCandles: build.query<CandleSeries, CandlesArgs>({
      query: ({ limit = 500, ...params }) => ({ url: API_ENDPOINTS.MARKET.CANDLES, params: { ...params, limit } }),
    }),
    getQuote: build.query<Quote, { market: MarketCode; symbol: string }>({
      query: (params) => ({ url: API_ENDPOINTS.MARKET.QUOTE, params }),
    }),
    /** keys: "KR_STOCK:005930,CRYPTO:KRW-BTC" (배열 대신 콤마 문자열 — axios 기본 직렬화는 keys[]=… 형태) */
    getQuotes: build.query<Quote[], string>({
      query: (keys) => ({ url: API_ENDPOINTS.MARKET.QUOTES, params: { keys } }),
    }),
    getFundamentals: build.query<Fundamentals, { market: MarketCode; symbol: string }>({
      query: (params) => ({ url: API_ENDPOINTS.MARKET.FUNDAMENTALS, params }),
      keepUnusedDataFor: 3600,
    }),
    getOverview: build.query<MarketOverview, void>({
      query: () => ({ url: API_ENDPOINTS.MARKET.OVERVIEW }),
    }),
    getMovers: build.query<Movers, { market: MarketCode; limit?: number }>({
      query: (params) => ({ url: API_ENDPOINTS.MARKET.MOVERS, params }),
    }),
  }),
});

export const {
  useSearchSymbolsQuery,
  useGetSymbolQuery,
  useGetCandlesQuery,
  useGetQuoteQuery,
  useGetQuotesQuery,
  useGetFundamentalsQuery,
  useGetOverviewQuery,
  useGetMoversQuery,
} = marketApi;
