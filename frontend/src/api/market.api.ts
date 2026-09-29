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
import type { Briefing, MarketTrends, TrendGroup } from "@/types/trends.types";

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
    getTrends: build.query<MarketTrends, MarketCode>({
      query: (market) => ({ url: API_ENDPOINTS.MARKET.TRENDS, params: { market } }),
    }),
    getTrendGroup: build.query<TrendGroup, { market: MarketCode; kind: TrendGroup["kind"]; id: string }>({
      query: ({ market, kind, id }) => ({ url: API_ENDPOINTS.MARKET.TREND_GROUP(market, kind, id) }),
    }),
    getBriefing: build.query<Briefing, { market: MarketCode; date?: string }>({
      query: ({ market, date }) => ({ url: API_ENDPOINTS.MARKET.BRIEFING, params: date ? { market, date } : { market } }),
    }),
    getBriefingDates: build.query<string[], MarketCode>({
      query: (market) => ({ url: API_ENDPOINTS.MARKET.BRIEFING_DATES, params: { market } }),
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
  useGetTrendsQuery,
  useGetTrendGroupQuery,
  useGetBriefingQuery,
  useGetBriefingDatesQuery,
} = marketApi;
