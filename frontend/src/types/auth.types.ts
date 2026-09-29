export interface User {
  id: string;
  username: string;
  email: string;
  /** USER | ADMIN (관리자 메뉴 표시) */
  role?: "USER" | "ADMIN";
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest extends LoginRequest {
  username: string;
}

export interface AuthResponse {
  user: User;
  accessTokenExpiresAt: number;
  accessToken: string;
}

export interface AuthState {
  user: User | null;
  accessToken: string | null;
  accessTokenExpiresAt: number | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}
