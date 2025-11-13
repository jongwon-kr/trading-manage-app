import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import pageReducer from './slices/pageSlice';
import tradingReducer from './slices/tradingSlice';
import { injectStore } from '../api/axios';

const store = configureStore({
  reducer: {
    auth: authReducer,
    page: pageReducer,
    trading: tradingReducer,
  },
});

export type AppStore = typeof store;
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

injectStore(store);

export default store;