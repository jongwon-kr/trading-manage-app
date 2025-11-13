import axiosInstance from "./axios";
import {
  Trade,
  CreateTradeRequest,
  UpdateTradeRequest,
  TradesResponse,
  TradeFilters,
  TradingStats,
} from "../types/trade.types";
import { API_ENDPOINTS } from "../utils/constants";

export const tradesAPI = {
  getAllTrades: async (filters?: TradeFilters): Promise<TradesResponse> => {
    const params = new URLSearchParams();

    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params.append(key, String(value));
        }
      });
    }

    const response = await axiosInstance.get<TradesResponse>(
      `${API_ENDPOINTS.TRADES.BASE}?${params.toString()}`
    );
    return response.data;
  },

  getTradeById: async (id: number): Promise<Trade> => {
    const response = await axiosInstance.get<Trade>(
      API_ENDPOINTS.TRADES.BY_ID(id)
    );
    return response.data;
  },

  createTrade: async (data: CreateTradeRequest): Promise<Trade> => {
    const response = await axiosInstance.post<Trade>(
      API_ENDPOINTS.TRADES.BASE,
      data
    );
    return response.data;
  },

  updateTrade: async (id: number, data: UpdateTradeRequest): Promise<Trade> => {
    const response = await axiosInstance.put<Trade>(
      API_ENDPOINTS.TRADES.BY_ID(id),
      data
    );
    return response.data;
  },

  deleteTrade: async (id: number): Promise<void> => {
    await axiosInstance.delete(API_ENDPOINTS.TRADES.BY_ID(id));
  },

  getTradingStats: async (): Promise<TradingStats> => {
    const response = await axiosInstance.get<TradingStats>(
      API_ENDPOINTS.TRADES.STATS
    );
    return response.data;
  },
};
