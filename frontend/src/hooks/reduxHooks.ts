import { TypedUseSelectorHook, useDispatch, useSelector } from 'react-redux';
// --- 경로 수정 ---
import type { RootState, AppDispatch } from '../store';
// --- 경로 수정 ---

// Use these instead of plain `useDispatch` and `useSelector`
export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;