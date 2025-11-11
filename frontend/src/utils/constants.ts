// Application constants

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api';

export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: '/auth/login',
    REGISTER: '/auth/register',
    LOGOUT: '/auth/logout',
    REFRESH: '/auth/refresh',
    ME: '/auth/me',
  },
  TRADES: {
    BASE: '/trades',
    BY_ID: (id: number) => `/trades/${id}`,
    STATS: '/trades/stats',
  },
  ANALYSIS: {
    BASE: '/analysis',
    TECHNICAL: '/analysis/technical',
  },
};

export const TOKEN_KEY = 'auth_token';
export const USER_KEY = 'user_data';

export const DEFAULT_PAGE_SIZE = 20;
