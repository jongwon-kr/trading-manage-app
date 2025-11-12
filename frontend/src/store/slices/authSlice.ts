import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { authAPI } from '@/api/auth.api';
import {
  AuthState,
  LoginRequest,
  RegisterRequest,
  User,
  AuthResponse,
} from '@/types/auth.types';
import { TOKEN_KEY, USER_KEY } from '@/utils/constants';

const initialState: AuthState = {
  user: null, 
  token: null, 
  isAuthenticated: false, 
  isLoading: true, // 앱 시작 시 항상 true (인증 확인 중)
  error: null,
};

/**
 * [신규] 앱 로드 시 세션 복원 (RefreshToken 사용)
 */
export const refreshSession = createAsyncThunk(
  'auth/refreshSession',
  async (_, { rejectWithValue }) => {
    try {
      const refreshResponse = await authAPI.refresh();
      const { accessToken } = refreshResponse;
      localStorage.setItem(TOKEN_KEY, accessToken);
      const user = await authAPI.getCurrentUser();
      localStorage.setItem(USER_KEY, JSON.stringify(user));
      return { accessToken, user };
    } catch (error) {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
      return rejectWithValue('세션이 만료되었습니다. 다시 로그인해주세요.');
    }
  }
);


export const loginUser = createAsyncThunk(
  'auth/login',
  async (credentials: LoginRequest, { dispatch, rejectWithValue }) => {
    // ... (test@example.com 목업 로직은 동일)
    if (credentials.email === 'test@example.com' && credentials.password === 'test') {
      try {
        const mockToken = 'mock-jwt-token-for-test-user';
        const mockUser: User = {
          id: 999,
          username: 'test',
          email: 'test@example.com',
        };
        const mockResponse: AuthResponse = {
          accessToken: mockToken, 
          user: mockUser,
        };
        localStorage.setItem(TOKEN_KEY, mockResponse.accessToken); 
        localStorage.setItem(USER_KEY, JSON.stringify(mockResponse.user));
        return mockResponse;
      } catch (error) {
        return rejectWithValue((error as Error).message);
      }
    }
    
    // 실제 API 로직
    try {
      const response = await authAPI.login(credentials);
      localStorage.setItem(TOKEN_KEY, response.accessToken);
      
      const user = await authAPI.getCurrentUser();
      localStorage.setItem(USER_KEY, JSON.stringify(user));

      return { accessToken: response.accessToken, user: user } as AuthResponse; 
    } catch (error) {
      return rejectWithValue('이메일 또는 비밀번호가 잘못되었습니다.');
    }
  },
);

export const registerUser = createAsyncThunk(
  'auth/register',
  async (data: RegisterRequest, { rejectWithValue }) => {
    try {
      const user = await authAPI.register(data);
      return user; 
    } catch (error) {
      return rejectWithValue((error as Error).message);
    }
  }
);

export const logoutUser = createAsyncThunk(
  'auth/logout',
  async (_, { rejectWithValue }) => {
    try {
      await authAPI.logout(); 
    } catch (error) {
       console.error("Logout API failed: ", error);
    } finally {
       localStorage.removeItem(TOKEN_KEY);
       localStorage.removeItem(USER_KEY);
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
  },
  extraReducers: (builder) => {
    
    builder
      .addCase(refreshSession.pending, (state) => {
        state.isLoading = true;
        state.isAuthenticated = false;
      })
      .addCase(refreshSession.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isAuthenticated = true;
        state.token = action.payload.accessToken;
        state.user = action.payload.user;
      })
      .addCase(refreshSession.rejected, (state) => {
        state.isLoading = false;
        state.isAuthenticated = false;
        state.token = null;
        state.user = null;
      });

    // Login Reducers
    builder
      .addCase(loginUser.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.isLoading = false;
        state.user = action.payload.user;
        state.token = action.payload.accessToken; 
        state.isAuthenticated = true;
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
        state.isAuthenticated = false;
      });

    // Register Reducers
    builder
      .addCase(registerUser.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(registerUser.fulfilled, (state) => {
        state.isLoading = false;
      })
      .addCase(registerUser.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
        state.isAuthenticated = false;
      });

    // Logout Reducers
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
  },
});

export const { clearError } = authSlice.actions;
export default authSlice.reducer;