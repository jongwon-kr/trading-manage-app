import axiosInstance from './axios';
// [수정] AuthResponse 타입을 API 응답(Body)과 Thunk Payload(Header 포함)용으로 분리
import { 
  AuthResponse as ApiAuthResponse, // API Body 응답 (AT 없음)
  AuthResponse as ThunkAuthResponse, // Thunk Payload (AT 포함)
  LoginRequest, 
  RegisterRequest, 
  User 
} from '../types/auth.types';
import { API_ENDPOINTS } from '../utils/constants';

// [수정] auth.types.ts에서 AT 필드가 제거되었으므로, API 응답 타입을 ApiAuthResponse로 변경
type ApiLoginResponse = Omit<ThunkAuthResponse, 'accessToken'>;
type ApiRefreshResponse = Omit<ThunkAuthResponse, 'accessToken'>;

export const authAPI = {
  /**
   * [수정] Login user
   * Body로 user, expiresAt을 받고, Header로 'access' 토큰을 받음
   */
  login: async (credentials: LoginRequest): Promise<ThunkAuthResponse> => {
    const response = await axiosInstance.post<ApiLoginResponse>(
      API_ENDPOINTS.AUTH.LOGIN,
      credentials
    );
    
    // [수정] 헤더에서 'access' 토큰 추출
    const accessToken = response.headers['access'];
    if (!accessToken) {
      throw new Error("로그인 응답에서 'access' 헤더를 찾을 수 없습니다.");
    }
    
    // [수정] Body 데이터와 Header 토큰을 조합하여 Thunk에 반환
    return { 
      ...response.data, 
      accessToken 
    };
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
   * [수정] Refresh Access Token
   * Body로 user, expiresAt을 받고, Header로 'access' 토큰을 받음
   */
  refresh: async (): Promise<ThunkAuthResponse> => {
    const response = await axiosInstance.post<ApiRefreshResponse>(
      API_ENDPOINTS.AUTH.REFRESH
    );

    // [수정] 헤더에서 'access' 토큰 추출
    const accessToken = response.headers['access'];
    if (!accessToken) {
      throw new Error("토큰 갱신 응답에서 'access' 헤더를 찾을 수 없습니다.");
    }

    // [수정] Body 데이터와 Header 토큰을 조합하여 Thunk에 반환
    return { 
      ...response.data, 
      accessToken 
    };
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