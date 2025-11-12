import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { authAPI } from '@/api/auth.api';
import {
  AuthState,
  LoginRequest,
  RegisterRequest,
  User,
  AuthResponse,
} from '@/types/auth.types';
import { USER_KEY } from '@/utils/constants';

const initialState: AuthState = {
  user: null, 
  accessToken: null, // [추가]
  accessTokenExpiresAt: null, 
  isAuthenticated: false, 
  isLoading: true, 
  error: null,
};

/**
 * [수정] 앱 로드 시 세션 복원 (RefreshToken 쿠키 사용)
 */
export const refreshSession = createAsyncThunk(
  'auth/refreshSession',
  async (_, { rejectWithValue }) => {
    try {
      // 1. [수정] /api/auth/refresh 호출
      // (auth.api.ts에서 헤더('access')를 읽어 AT를 포함한 AuthResponse 반환)
      const response = await authAPI.refresh(); // { user, accessTokenExpiresAt, accessToken }
      
      // 2. [유지] 응답 받은 User 정보를 localStorage에 저장
      localStorage.setItem(USER_KEY, JSON.stringify(response.user));

      // 3. Reducer에 user, 만료 시간, AT 전달
      return response; // { user, accessTokenExpiresAt, accessToken }
    } catch (error: any) {
      // Refresh 실패 = 세션 만료
      localStorage.removeItem(USER_KEY);
      return rejectWithValue(error.message || '세션이 만료되었습니다.');
    }
  }
);


export const loginUser = createAsyncThunk(
  'auth/login',
  async (credentials: LoginRequest, { dispatch, rejectWithValue }) => {
    try {
      // 1. [수정] 로그인 시 { user, accessTokenExpiresAt, accessToken } 응답 받음
      // (auth.api.ts에서 헤더('access')를 읽어 AT를 포함)
      const response = await authAPI.login(credentials); 
      
      // 2. [유지] User 정보만 localStorage에 저장
      localStorage.setItem(USER_KEY, JSON.stringify(response.user));

      // 3. Reducer에 user, 만료 시간, AT 전달
      return response; // { user, accessTokenExpiresAt, accessToken }
    } catch (error: any) {
      return rejectWithValue(error.message || '이메일 또는 비밀번호가 잘못되었습니다.');
    }
  },
);

export const registerUser = createAsyncThunk(
  'auth/register',
  async (data: RegisterRequest, { rejectWithValue }) => {
    try {
      const user = await authAPI.register(data);
      return user; 
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

export const logoutUser = createAsyncThunk(
  'auth/logout',
  async (_, { rejectWithValue }) => {
    try {
      await authAPI.logout(); // 백엔드가 RT 쿠키를 삭제함
    } catch (error: any) {
       console.error("Logout API failed: ", error);
    } finally {
       localStorage.removeItem(USER_KEY);
       return; 
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
    
    // [수정] refreshSession Reducers
    builder
      .addCase(refreshSession.pending, (state) => {
        state.isLoading = true;
        state.isAuthenticated = false;
        state.accessToken = null; // [추가]
      })
      .addCase(refreshSession.fulfilled, (state, action: PayloadAction<AuthResponse>) => {
        state.isLoading = false;
        state.isAuthenticated = true;
        state.accessTokenExpiresAt = action.payload.accessTokenExpiresAt;
        state.user = action.payload.user;
        state.accessToken = action.payload.accessToken; // [추가]
      })
      .addCase(refreshSession.rejected, (state) => {
        state.isLoading = false;
        state.isAuthenticated = false;
        state.accessTokenExpiresAt = null;
        state.user = null;
        state.accessToken = null; // [추가]
      });

    // [수정] Login Reducers
    builder
      .addCase(loginUser.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(loginUser.fulfilled, (state, action: PayloadAction<AuthResponse>) => {
        state.isLoading = false;
        state.user = action.payload.user;
        state.accessTokenExpiresAt = action.payload.accessTokenExpiresAt; 
        state.accessToken = action.payload.accessToken; // [추가]
        state.isAuthenticated = true;
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
        state.isAuthenticated = false;
        state.accessToken = null; // [추가]
      });

    // [유지] Register Reducers
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

    // [수정] Logout Reducers
    builder
      .addCase(logoutUser.pending, (state) => {
        state.isLoading = false; 
        state.user = null;
        state.accessToken = null; // [추가]
        state.accessTokenExpiresAt = null;
        state.isAuthenticated = false;
        state.error = null;
      })
      .addCase(logoutUser.fulfilled, (state) => {
        state.isLoading = false;
        state.user = null;
        state.accessToken = null; // [추가]
        state.accessTokenExpiresAt = null; 
        state.isAuthenticated = false;
        state.error = null;
      })
      .addCase(logoutUser.rejected, (state) => {
        state.isLoading = false;
        state.user = null;
        state.accessToken = null; // [추가]
        state.accessTokenExpiresAt = null; 
        state.isAuthenticated = false;
      });
  },
});

export const { clearError } = authSlice.actions;
export default authSlice.reducer;