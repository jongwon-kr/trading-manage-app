/**
 * [유지] User 인터페이스
 */
export interface User {
  id: string;
  username: string;
  email: string;
}

/**
 * [유지] 로그인/회원가입 요청 시 사용되는 타입
 */
export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest extends LoginRequest {
  username: string;
}

/**
 * [수정] Redux Thunk Payload 타입
 * (auth.api.ts에서 헤더의 AT와 Body의 정보를 조합하여 이 객체를 만듭니다)
 */
export interface AuthResponse {
  user: User;
  accessTokenExpiresAt: number;
  accessToken: string; // [추가] Redux 스토어에 저장할 AT
}

/**
 * [수정] Redux Auth 스토어 상태 타입
 */
export interface AuthState {
  user: User | null;
  accessToken: string | null; // [추가] AT를 스토어(메모리)에 저장
  accessTokenExpiresAt: number | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}