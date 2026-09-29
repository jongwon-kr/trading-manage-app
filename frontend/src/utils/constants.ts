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
    CHECK_USERNAME: (username: string) =>
      `/users/check-username?username=${encodeURIComponent(username)}`,
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
  MARKET: {
    SEARCH: "/v1/market/symbols/search",
    SYMBOL: (market: string, code: string) =>
      `/v1/market/symbols/${market}/${encodeURIComponent(code)}`,
    CANDLES: "/v1/market/candles",
    QUOTE: "/v1/market/quote",
    QUOTES: "/v1/market/quotes",
    FUNDAMENTALS: "/v1/market/fundamentals",
    OVERVIEW: "/v1/market/overview",
    MOVERS: "/v1/market/movers",
    TRENDS: "/v1/market/trends",
    TREND_GROUP: (market: string, kind: string, id: string) => `/v1/market/trends/groups/${market}/${kind}/${id}`,
    BRIEFING: "/v1/market/briefing",
    BRIEFING_DATES: "/v1/market/briefing/dates",
  },
  WATCHLIST: {
    BASE: "/v1/watchlist",
    ITEMS: "/v1/watchlist/items",
    ITEM: (id: number) => `/v1/watchlist/items/${id}`,
  },
  ANALYSIS: {
    STRATEGY: "/v1/analysis/strategy",
    BACKTEST: "/v1/analysis/backtest",
    RESULT: (id: string) => `/v1/analysis/result/${id}`,
    MODEL: "/v1/analysis/model",
  },
  COMMUNITY: {
    CONTENTS: "/contents",
    CONTENT: (id: number) => `/contents/${id}`,
    LIKE: (id: number) => `/contents/${id}/like`,
    COMMENTS: (id: number) => `/contents/${id}/comments`,
    COMMENT: (id: number) => `/comments/${id}`,
    REPORT_CONTENT: (id: number) => `/contents/${id}/report`,
    REPORT_COMMENT: (id: number) => `/comments/${id}/report`,
    SHARE_JOURNAL: (id: number) => `/journals/${id}/share`,
    SHARE_STRATEGY: (id: number) => `/v1/strategies/${id}/share`,
    IMPORT_STRATEGY: (contentId: number) => `/v1/strategies/import/${contentId}`,
    PROFILE: (username: string) => `/users/${encodeURIComponent(username)}/profile`,
    FOLLOW: (username: string) => `/users/${encodeURIComponent(username)}/follow`,
    NOTIFICATIONS: "/notifications",
    UNREAD_COUNT: "/notifications/unread-count",
    READ: (id: number) => `/notifications/${id}/read`,
    READ_ALL: "/notifications/read-all",
    ADMIN_REPORTS: "/admin/reports",
    ADMIN_RESOLVE: (id: number) => `/admin/reports/${id}/resolve`,
    ADMIN_HIDE: (kind: "contents" | "comments", id: number, hide: boolean) => `/admin/${kind}/${id}/${hide ? "hide" : "unhide"}`,
  },
  STRATEGIES: {
    LIST: "/v1/strategies",
    DETAIL: (id: number) => `/v1/strategies/${id}`,
    DUPLICATE: (id: number) => `/v1/strategies/${id}/duplicate`,
  },
};

export const TOKEN_KEY = "auth_token";
export const USER_KEY = "user_data";

export const DEFAULT_PAGE_SIZE = 20;
