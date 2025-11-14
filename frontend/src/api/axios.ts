import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";
import { API_BASE_URL, API_ENDPOINTS, USER_KEY } from "../utils/constants";
import { AppStore } from "../store";
import { refreshSession, logoutUser } from "../store/slices/authSlice";

let store: AppStore;

export const injectStore = (_store: AppStore) => {
  store = _store;
};

const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true,
});

axiosInstance.interceptors.request.use(
  (config) => {
    if (store) {
      const accessToken = store.getState().auth.accessToken;

      if (accessToken && config.headers) {
        if (config.url !== API_ENDPOINTS.AUTH.REFRESH) {
          config.headers.Authorization = `Bearer ${accessToken}`;
        }
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value: any) => void;
  reject: (reason: any) => void;
}> = [];

const processQueue = (error: Error | null, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

axiosInstance.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
    };

    if (!store) {
      return Promise.reject(error);
    }

    if (error.response?.status === 401 && originalRequest) {
      if (originalRequest.url === API_ENDPOINTS.AUTH.REFRESH) {
        store.dispatch(logoutUser());
        processQueue(error, null);
        isRefreshing = false;
        return Promise.reject(error);
      }

      if (originalRequest._retry) {
        store.dispatch(logoutUser());
        return Promise.reject(error);
      }

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then(() => {
            return axiosInstance(originalRequest);
          })
          .catch((err) => {
            return Promise.reject(err);
          });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const resultAction = await store.dispatch(refreshSession());

        if (refreshSession.fulfilled.match(resultAction)) {
          processQueue(null, resultAction.payload.accessToken);
          return axiosInstance(originalRequest);
        } else {
          throw new Error("Failed to refresh session (rejected thunk)");
        }
      } catch (refreshError: any) {
        processQueue(refreshError, null);
        store.dispatch(logoutUser());

        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    const errorMessage =
      (error.response?.data as { message?: string })?.message ||
      error.message ||
      "서버 오류가 발생했습니다.";

    return Promise.reject(new Error(errorMessage));
  }
);

export default axiosInstance;