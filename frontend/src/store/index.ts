import { configureStore, createListenerMiddleware, isAnyOf } from '@reduxjs/toolkit';
import { setupListeners } from '@reduxjs/toolkit/query';
import authReducer, { logoutUser } from './slices/authSlice';
import tradingReducer from './slices/tradingSlice';
import { injectStore } from '../api/axios';
import { baseApi } from '../api/base.api';

// 로그아웃 시 RTK Query 캐시를 비워 다음 사용자에게 이전 사용자의 데이터(관심종목 등)가 보이지 않게 한다
const listener = createListenerMiddleware();
listener.startListening({
  matcher: isAnyOf(logoutUser.fulfilled, logoutUser.rejected),
  effect: (_, api) => {
    api.dispatch(baseApi.util.resetApiState());
  },
});

const store = configureStore({
  reducer: {
    auth: authReducer,
    trading: tradingReducer,
    [baseApi.reducerPath]: baseApi.reducer,
  },
  middleware: (getDefault) => getDefault().prepend(listener.middleware).concat(baseApi.middleware),
});

export type AppStore = typeof store;
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

injectStore(store);
// refetchOnFocus / refetchOnReconnect 동작 활성화
setupListeners(store.dispatch);

export default store;
