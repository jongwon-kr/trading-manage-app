import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import tradesReducer from './slices/tradesSlice';
import pageReducer from './slices/pageSlice';
import tradingReducer from './slices/tradingSlice';

const store = configureStore({
  reducer: {
    auth: authReducer,
    trades: tradesReducer,
    page: pageReducer,
    trading: tradingReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
export default store;