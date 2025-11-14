import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import {
  AuthState,
  LoginRequest,
  RegisterRequest,
  User,
  AuthResponse,
} from "@/types/auth.types";
import { USER_KEY } from "@/utils/constants";

const initialState: AuthState = {
  user: null,
  accessToken: null,
  accessTokenExpiresAt: null,
  isAuthenticated: false,
  isLoading: true,
  error: null,
};

export const refreshSession = createAsyncThunk(
  "auth/refreshSession",
  async (_, { rejectWithValue }) => {
    try {
      // [수정] thunk 내부에서 동적으로 import
      const { authAPI } = await import("@/api/auth.api");
      const response = await authAPI.refresh();
      localStorage.setItem(USER_KEY, JSON.stringify(response.user));
      return response;
    } catch (error: any) {
      localStorage.removeItem(USER_KEY);
      return rejectWithValue(error.message || "세션이 만료되었습니다.");
    }
  }
);

export const loginUser = createAsyncThunk(
  "auth/login",
  async (credentials: LoginRequest, { dispatch, rejectWithValue }) => {
    try {
      // [수정] thunk 내부에서 동적으로 import
      const { authAPI } = await import("@/api/auth.api");
      const response = await authAPI.login(credentials);
      localStorage.setItem(USER_KEY, JSON.stringify(response.user));

      return response;
    } catch (error: any) {
      return rejectWithValue(
        error.message || "이메일 또는 비밀번호가 잘못되었습니다."
      );
    }
  }
);

export const registerUser = createAsyncThunk(
  "auth/register",
  async (data: RegisterRequest, { rejectWithValue }) => {
    try {
      // [수정] thunk 내부에서 동적으로 import
      const { authAPI } = await import("@/api/auth.api");
      const user = await authAPI.register(data);
      return user;
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

export const logoutUser = createAsyncThunk(
  "auth/logout",
  async (_, { rejectWithValue }) => {
    try {
      // [수정] thunk 내부에서 동적으로 import
      const { authAPI } = await import("@/api/auth.api");
      await authAPI.logout();
    } catch (error: any) {
      console.error("Logout API failed: ", error);
    } finally {
      localStorage.removeItem(USER_KEY);
      return;
    }
  }
);

const authSlice = createSlice({
  name: "auth",
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
      })
      .addCase(
        refreshSession.fulfilled,
        (state, action: PayloadAction<AuthResponse>) => {
          state.isLoading = false;
          state.isAuthenticated = true;
          state.accessTokenExpiresAt = action.payload.accessTokenExpiresAt;
          state.user = action.payload.user;
          state.accessToken = action.payload.accessToken;
        }
      )
      .addCase(refreshSession.rejected, (state) => {
        state.isLoading = false;
        state.isAuthenticated = false;
        state.accessTokenExpiresAt = null;
        state.user = null;
        state.accessToken = null;
      });

    builder
      .addCase(loginUser.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(
        loginUser.fulfilled,
        (state, action: PayloadAction<AuthResponse>) => {
          state.isLoading = false;
          state.user = action.payload.user;
          state.accessTokenExpiresAt = action.payload.accessTokenExpiresAt;
          state.accessToken = action.payload.accessToken;
          state.isAuthenticated = true;
        }
      )
      .addCase(loginUser.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
        state.isAuthenticated = false;
        state.accessToken = null;
      });

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

    builder
      .addCase(logoutUser.pending, (state) => {
        state.isLoading = false;
        state.user = null;
        state.accessToken = null;
        state.accessTokenExpiresAt = null;
        state.isAuthenticated = false;
        state.error = null;
      })
      .addCase(logoutUser.fulfilled, (state) => {
        state.isLoading = false;
        state.user = null;
        state.accessToken = null;
        state.accessTokenExpiresAt = null;
        state.isAuthenticated = false;
        state.error = null;
      })
      .addCase(logoutUser.rejected, (state) => {
        state.isLoading = false;
        state.user = null;
        state.accessToken = null;
        state.accessTokenExpiresAt = null;
        state.isAuthenticated = false;
      });
  },
});

export const { clearError } = authSlice.actions;
export default authSlice.reducer;