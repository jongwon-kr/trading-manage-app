import { useCallback, useEffect, useSyncExternalStore } from "react";
import { tickerStore } from "@/lib/realtime/ticker-store";
import type { Quote } from "@/types/market.types";

const noop = () => () => {};

/** 컴포넌트가 마운트되어 있는 동안 해당 종목들의 실시간 시세를 구독한다 (키: CRYPTO:KRW-BTC) */
export function useRealtimeSymbols(keys: string[]): void {
  const joined = keys.join(",");
  useEffect(() => {
    if (!joined) return;
    const list = joined.split(",");
    tickerStore.acquire(list);
    return () => tickerStore.release(list);
  }, [joined]);
}

/** 해당 종목의 최신 실시간 시세 (없으면 undefined) */
export function useTick(key: string | undefined): Quote | undefined {
  const subscribe = useCallback((cb: () => void) => (key ? tickerStore.subscribe(key, cb) : noop()), [key]);
  return useSyncExternalStore(subscribe, () => (key ? tickerStore.getLatest(key) : undefined));
}

export function useRealtimeStatus() {
  return useSyncExternalStore(
    (cb) => tickerStore.subscribeStatus(cb),
    () => tickerStore.status
  );
}

/** 끊겼다 다시 연결되면 호출 (놓친 봉 다시 받기 등) */
export function useOnRealtimeReconnect(cb: () => void): void {
  useEffect(() => tickerStore.onReconnect(cb), [cb]);
}

/** React 렌더를 거치지 않는 tick 구독 (차트 실시간 봉 갱신용) */
export const subscribeTicks = (key: string, cb: (q: Quote) => void) => tickerStore.subscribe(key, cb);
