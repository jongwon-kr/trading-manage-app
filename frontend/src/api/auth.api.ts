import axiosInstance from "./axios";
import { API_ENDPOINTS } from "@/utils/constants";
import {
  AuthResponse,
  LoginRequest,
  RegisterRequest,
  User,
} from "@/types/auth.types";
// [수정] 순환 참조를 유발하는 store 및 slice 임포트 제거
// import { store } from "@/store";
// import { logoutUser } from "@/store/slices/authSlice";

/**
 * 백엔드는 AccessToken 을 본문이 아닌 'access' 응답 헤더로 준다 (AuthController, CORS exposedHeaders).
 * 본문(user, accessTokenExpiresAt)에 헤더의 토큰을 합쳐 AuthResponse 로 만든다.
 */
const withAccessToken = (
  body: AuthResponse,
  headers: Record<string, unknown>
): AuthResponse => ({
  ...body,
  accessToken: String(headers["access"] ?? ""),
});

export const authAPI = {
  /**
   * 로그인
   */
  login: async (credentials: LoginRequest): Promise<AuthResponse> => {
    const response = await axiosInstance.post<AuthResponse>(
      API_ENDPOINTS.AUTH.LOGIN,
      credentials
    );
    return withAccessToken(response.data, response.headers);
  },

  /**
   * 회원가입
   */
  register: async (data: RegisterRequest): Promise<User> => {
    const response = await axiosInstance.post<User>(
      API_ENDPOINTS.USERS.REGISTER,
      data
    );
    return response.data;
  },

  /**
   * 로그아웃
   */
  logout: async (): Promise<void> => {
    try {
      await axiosInstance.post(API_ENDPOINTS.AUTH.LOGOUT);
    } catch (error) {
      console.error("Logout API call failed:", error);
      // API 호출이 실패하더라도, thunk가 후속 처리를 하므로 여기서 에러를 다시 던지지 않습니다.
    }
    // [수정] thunk가 처리해야 할 로직(localStorage, dispatch)을 API 파일에서 제거
    // finally {
    //   localStorage.removeItem(USER_KEY);
    //   store.dispatch(logoutUser());
    // }
  },

  /**
   * 세션 갱신
   */
  refresh: async (): Promise<AuthResponse> => {
    const response = await axiosInstance.post<AuthResponse>(
      API_ENDPOINTS.AUTH.REFRESH
    );
    return withAccessToken(response.data, response.headers);
  },

  /**
   * 아이디(이메일) 중복 확인
   */
  checkUsername: async (
    username: string
  ): Promise<{ isAvailable: boolean }> => {
    const response = await axiosInstance.get<{ isAvailable: boolean }>(
      API_ENDPOINTS.USERS.CHECK_USERNAME(username)
    );
    return response.data;
  },
};