import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
// --- 경로 수정 ---
import { authAPI } from '@/api/auth.api';
import {
  AuthState,
  LoginRequest,
  RegisterRequest,
  User,
  AuthResponse,
} from '@/types/auth.types';
import { TOKEN_KEY, USER_KEY } from '@/utils/constants';
// --- 경로 수정 ---

const initialState: AuthState = {
  user: null, // user 속성 초기화
  token: null, // token 속성 초기화
  isAuthenticated: false, // isAuthenticated 속성 초기화
  isLoading: false, // isLoading 속성 초기화
  error: null,
};

export const loginUser = createAsyncThunk(
  'auth/login',
  async (credentials: LoginRequest, { rejectWithValue }) => {
    if (credentials.username === 'test' && credentials.password === 'test') {
      try {
        const mockToken = 'mock-jwt-token-for-test-user';
        const mockUser: User = {
          id: 999,
          username: 'test',
          email: 'test@example.com',
        };
        const mockResponse: AuthResponse = {
          token: mockToken,
          user: mockUser,
        };

        localStorage.setItem(TOKEN_KEY, mockResponse.token);
        localStorage.setItem(USER_KEY, JSON.stringify(mockResponse.user));

        return mockResponse;
      } catch (error) {
        return rejectWithValue((error as Error).message);
      }
    }
    try {
      const response = await authAPI.login(credentials);
      localStorage.setItem(TOKEN_KEY, response.token);
      localStorage.setItem(USER_KEY, JSON.stringify(response.user));
      return response;
    } catch (error) {
      return rejectWithValue('아이디 또는 비밀번호가 잘못되었습니다.');
    }
  },
);

export const registerUser = createAsyncThunk(
  'auth/register',
  async (data: RegisterRequest, { rejectWithValue }) => {
    try {
      const response = await authAPI.register(data);
      localStorage.setItem(TOKEN_KEY, response.token);
      localStorage.setItem(USER_KEY, JSON.stringify(response.user));
      return response;
    } catch (error) {
      return rejectWithValue((error as Error).message);
    }
  }
);

export const logoutUser = createAsyncThunk(
  'auth/logout',
  async (_, { rejectWithValue }) => {
    try {
      // API 호출 (실제 로그아웃)
      // await authAPI.logout(); 
      // 목업 및 테스트 환경을 위해 로컬 스토리지 정리만 우선
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
    } catch (error) {
       // 실제 API 호출 시 에러 처리
       localStorage.removeItem(TOKEN_KEY); // 에러가 나더라도 로컬은 정리
       localStorage.removeItem(USER_KEY);
      return rejectWithValue((error as Error).message);
    }
  }
);

export const getCurrentUser = createAsyncThunk(
  'auth/getCurrentUser',
  async (_, { rejectWithValue }) => {
    try {
      const user = await authAPI.getCurrentUser();
      return user;
    } catch (error) {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
      return rejectWithValue((error as Error).message);
    }
  }
);

// Slice
const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    setUser: (state, action: PayloadAction<User>) => {
      state.user = action.payload;
      state.isAuthenticated = true;
    },
    // --- 추가: 상태를 직접 초기화하는 리듀서 ---
    initializeAuth: (state) => {
      try {
        const token = localStorage.getItem(TOKEN_KEY);
        const userData = localStorage.getItem(USER_KEY);
        if (token && userData) {
          state.token = token;
          state.user = JSON.parse(userData);
          state.isAuthenticated = true;
        } else {
          state.token = null;
          state.user = null;
          state.isAuthenticated = false;
        }
      } catch (error) {
          state.token = null;
          state.user = null;
          state.isAuthenticated = false;
      }
      state.isLoading = false;
    }
  },
  extraReducers: (builder) => {
    // Login
    builder
      .addCase(loginUser.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.isLoading = false;
        state.user = action.payload.user;
        state.token = action.payload.token;
        state.isAuthenticated = true;
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
        state.isAuthenticated = false;
      });

    // Register
    builder
      .addCase(registerUser.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(registerUser.fulfilled, (state, action) => {
        state.isLoading = false;
        state.user = action.payload.user;
        state.token = action.payload.token;
        state.isAuthenticated = true;
      })
      .addCase(registerUser.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
        state.isAuthenticated = false;
      });

    // Logout
    builder
      .addCase(logoutUser.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(logoutUser.fulfilled, (state) => {
        state.isLoading = false;
        state.user = null;
        state.token = null;
        state.isAuthenticated = false;
        state.error = null;
      })
      .addCase(logoutUser.rejected, (state) => {
        state.isLoading = false;
        state.user = null;
        state.token = null;
        state.isAuthenticated = false;
      });

    // Get current user
    builder
      .addCase(getCurrentUser.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(getCurrentUser.fulfilled, (state, action) => {
        state.isLoading = false;
        state.user = action.payload;
        state.isAuthenticated = true;
      })
      .addCase(getCurrentUser.rejected, (state) => {
        state.isLoading = false;
        state.user = null;
        state.token = null;
        state.isAuthenticated = false;
      });
  },
});

export const { clearError, setUser, initializeAuth } = authSlice.actions;
export default authSlice.reducer;