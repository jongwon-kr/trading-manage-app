import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { API_BASE_URL, TOKEN_KEY } from '../utils/constants';

// Create axios instance
const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

// Request interceptor - Add JWT token
axiosInstance.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error: AxiosError) => {
    return Promise.reject(error);
  }
);

// Response interceptor - Handle errors
axiosInstance.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      // Unauthorized - clear token and redirect to login
      // [수정] 401 오류 시 무조건 /login으로 리디렉션하지 않고,
      // authSlice에서 refresh 시도 후 최종 실패했을 때만 리디렉션하도록 합니다.
      // (단, refresh 요청 자체가 401이면 로그인으로 보내는 것이 맞습니다.)
      
      const originalRequest = error.config;
      
      // refresh 요청 실패 시(무한 루프 방지)
      if (originalRequest?.url === API_ENDPOINTS.AUTH.REFRESH) {
         localStorage.removeItem(TOKEN_KEY);
         localStorage.removeItem(USER_KEY);
         window.location.href = '/login';
         return Promise.reject(error);
      }

      // TODO: AccessToken 만료 시 RefreshToken으로 갱신하는 로직 (나중 단계)
      // 지금은 authSlice의 refreshSession Thunk가 실패하면
      // ProtectedRoute가 알아서 /login으로 보냅니다.
    }
    
    const errorMessage = 
      (error.response?.data as { message?: string })?.message ||
      error.message ||
      '서버 오류가 발생했습니다.'; // [수정] 기본 오류 메시지
    
    return Promise.reject(new Error(errorMessage));
  }
);

// [추가] constants 임포트
import { API_ENDPOINTS, USER_KEY } from '../utils/constants';

export default axiosInstance;