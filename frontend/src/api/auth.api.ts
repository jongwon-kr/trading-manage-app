import axiosInstance from "./axios";
import {
  AuthResponse as ApiAuthResponse,
  AuthResponse as ThunkAuthResponse,
  LoginRequest,
  RegisterRequest,
  User,
} from "../types/auth.types";
import { API_ENDPOINTS } from "../utils/constants";

type ApiLoginResponse = Omit<ThunkAuthResponse, "accessToken">;
type ApiRefreshResponse = Omit<ThunkAuthResponse, "accessToken">;

export const authAPI = {
  login: async (credentials: LoginRequest): Promise<ThunkAuthResponse> => {
    const response = await axiosInstance.post<ApiLoginResponse>(
      API_ENDPOINTS.AUTH.LOGIN,
      credentials
    );

    const accessToken = response.headers["access"];
    if (!accessToken) {
      throw new Error("로그인 응답에서 'access' 헤더를 찾을 수 없습니다.");
    }

    return {
      ...response.data,
      accessToken,
    };
  },

  register: async (data: RegisterRequest): Promise<User> => {
    const response = await axiosInstance.post<User>(
      API_ENDPOINTS.USERS.REGISTER,
      data
    );
    return response.data;
  },

  refresh: async (): Promise<ThunkAuthResponse> => {
    const response = await axiosInstance.post<ApiRefreshResponse>(
      API_ENDPOINTS.AUTH.REFRESH
    );

    const accessToken = response.headers["access"];
    if (!accessToken) {
      throw new Error("토큰 갱신 응답에서 'access' 헤더를 찾을 수 없습니다.");
    }
    return {
      ...response.data,
      accessToken,
    };
  },

  checkUsername: async (
    username: string
  ): Promise<{ isAvailable: boolean }> => {
    const response = await axiosInstance.get<{ isAvailable: boolean }>(
      API_ENDPOINTS.USERS.CHECK_USERNAME,
      { params: { username } }
    );
    return response.data;
  },

  logout: async (): Promise<void> => {
    await axiosInstance.post(API_ENDPOINTS.AUTH.LOGOUT);
  },

  getCurrentUser: async (): Promise<User> => {
    const response = await axiosInstance.get<User>(API_ENDPOINTS.USERS.ME);
    return response.data;
  },
};
