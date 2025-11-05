import { configureStore } from '@reduxjs/toolkit'
import pageReducer from './slices/pageSlice'
import tradingReducer from './slices/tradingSlice'

export const store = configureStore({
  reducer: {
    page: pageReducer,
    trading: tradingReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['persist/PERSIST'],
      },
    }),
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch
