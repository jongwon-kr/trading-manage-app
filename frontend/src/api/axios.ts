import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { API_BASE_URL, API_ENDPOINTS, USER_KEY } from '../utils/constants'; 
import { authAPI } from './auth.api';
import store from '../store'; // [추가] Redux 스토어 임포트
import { refreshSession, logoutUser } from '../store/slices/authSlice'; // [추가]

// Create axios instance
const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

/**
 * [추가] Request interceptor
 * Redux 스토어에서 AccessToken을 가져와 'Authorization' 헤더에 삽입
 */
axiosInstance.interceptors.request.use(
  (config) => {
    // Redux 스토어에서 AccessToken 조회
    const accessToken = store.getState().auth.accessToken;

    if (accessToken && config.headers) {
      // /refresh 요청 자체에는 AT를 보내지 않음 (RT 쿠키 사용)
      if (config.url !== API_ENDPOINTS.AUTH.REFRESH) {
        config.headers.Authorization = `Bearer ${accessToken}`;
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);


// [수정] 재시도 로직을 위한 변수 (Race Condition 방지)
let isRefreshing = false;
let failedQueue: Array<{ resolve: (value: any) => void; reject: (reason: any) => void }> = [];

const processQueue = (error: Error | null, token: string | null = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};


// [수정] Response interceptor - 401 에러 및 자동 갱신 처리
axiosInstance.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    // 401 에러이고, originalRequest가 존재할 때
    if (error.response?.status === 401 && originalRequest) {

      // 1. RefreshToken 요청 자체가 실패한 경우 (무한 루프 방지)
      if (originalRequest.url === API_ENDPOINTS.AUTH.REFRESH) {
         console.error("Refresh token failed, logging out.");
         // [수정] Redux 스토어를 통해 로그아웃 처리
         store.dispatch(logoutUser());
         
         processQueue(error, null);
         isRefreshing = false;
         
         return Promise.reject(error);
      }

      // 2. AccessToken 만료로 인한 401 (자동 갱신 시도)
      // _retry 플래그는 재시도 요청이 다시 401을 받을 때 무한 루프를 방지합니다.
      if (originalRequest._retry) {
        console.error("Retry failed, logging out.");
        store.dispatch(logoutUser());
        return Promise.reject(error);
      }
      
      // 2-1. 현재 다른 요청이 토큰을 갱신 중인 경우
      if (isRefreshing) {
        // 갱신이 완료될 때까지 현재 요청을 '대기열'에 추가
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
        .then(() => {
          // 갱신된 토큰으로 원래 요청 재시도 (헤더는 request interceptor가 처리)
          return axiosInstance(originalRequest);
        })
        .catch(err => {
          return Promise.reject(err);
        });
      }

      // 2-2. 첫 401 요청인 경우, 토큰 갱신 시작
      originalRequest._retry = true;
      isRefreshing = true;

      try {
        // [수정] authSlice의 refreshSession Thunk를 dispatch
        const resultAction = await store.dispatch(refreshSession());

        if (refreshSession.fulfilled.match(resultAction)) {
          // 갱신 성공: 대기열에 있던 모든 요청 재시도
          processQueue(null, resultAction.payload.accessToken);
          
          // 원래 요청 재시도
          return axiosInstance(originalRequest);
        } else {
          // Thunk가 rejected된 경우 (e.g., RT 만료)
          throw new Error("Failed to refresh session (rejected thunk)");
        }
        
      } catch (refreshError: any) {
        // 2-3. 토큰 갱신 자체를 실패한 경우 (RT 만료)
        console.error("Refresh error caught in interceptor:", refreshError);
        processQueue(refreshError, null); // 실패 신호 전파
        store.dispatch(logoutUser()); // 로그아웃 처리
        
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }
    
    // 401 이외의 다른 에러
    const errorMessage = 
      (error.response?.data as { message?: string })?.message ||
      error.message ||
      '서버 오류가 발생했습니다.';
    
    return Promise.reject(new Error(errorMessage));
  }
);

export default axiosInstance;