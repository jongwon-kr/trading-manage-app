import axiosInstance from './axios';
import { AuthResponse, LoginRequest, RegisterRequest, User } from '../types/auth.types';
import { API_ENDPOINTS } from '../utils/constants';

export const authAPI = {
  /**
   * Login user
   */
  login: async (credentials: LoginRequest): Promise<AuthResponse> => {
    const response = await axiosInstance.post<AuthResponse>(
      API_ENDPOINTS.AUTH.LOGIN,
      credentials
    );
    return response.data; // { accessToken: "..." }
  },

  /**
   * Register new user
   */
  register: async (data: RegisterRequest): Promise<User> => {
    const response = await axiosInstance.post<User>(
      API_ENDPOINTS.USERS.REGISTER, 
      data
    );
    return response.data; // { id, username, email }
  },

  /**
   * Refresh Access Token
   * HttpOnly 쿠키(RefreshToken)를 사용하여 새 AccessToken을 요청합니다.
   */
  refresh: async (): Promise<AuthResponse> => {
    const response = await axiosInstance.post<AuthResponse>(
      API_ENDPOINTS.AUTH.REFRESH
    );
    return response.data; // { accessToken: "..." }
  },

  /**
   * Check username availability
   */
  checkUsername: async (username: string): Promise<{ isAvailable: boolean }> => {
    const response = await axiosInstance.get<{ isAvailable: boolean }>(
      API_ENDPOINTS.USERS.CHECK_USERNAME,
      { params: { username } }
    );
    return response.data;
  },

  /**
   * Logout user
   */
  logout: async (): Promise<void> => {
    await axiosInstance.post(API_ENDPOINTS.AUTH.LOGOUT);
  },

  /**
   * Get current user info
   */
  getCurrentUser: async (): Promise<User> => {
    const response = await axiosInstance.get<User>(
      API_ENDPOINTS.USERS.ME 
    );
    return response.data;
  },
};