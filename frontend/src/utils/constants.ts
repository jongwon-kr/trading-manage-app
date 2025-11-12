// Application constants

export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:8080/api";

export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: "/auth/sign-in",
    LOGOUT: "/auth/logout",
    REFRESH: "/auth/refresh",
  },
  USERS: {
    REGISTER: "/users/sign-up",
    CHECK_USERNAME: '/users/check-username',
    ME: "/users/me",
  },
  JOURNALS: {
    BASE: "/journals",
    BY_ID: (id: number) => `/journals/${id}`,
    STATS: "/journals/statistics",
    OPEN: "/journals/open",
    CLOSED: "/journals/closed",
    SEARCH: "/journals/search",
  },
  ANALYSIS: {
    BASE: "/analysis",
    TECHNICAL: "/analysis/technical",
    MARKET_TREND: "/analysis/market-trend",
    RESULT: (requestId: string) => `/analysis/result/${requestId}`,
  },
};

export const TOKEN_KEY = "auth_token";
export const USER_KEY = "user_data";

export const DEFAULT_PAGE_SIZE = 20;
