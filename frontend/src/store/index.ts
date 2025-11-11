import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import tradesReducer from './slices/tradesSlice';

const store = configureStore({
  reducer: {
    auth: authReducer,
    trades: tradesReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
export default store;
