import { useMemo, useSyncExternalStore } from "react";
import { useGetOverviewQuery, useGetQuotesQuery } from "@/api/market.api";
import { tickerStore } from "@/lib/realtime/ticker-store";
import { quoteKey } from "@/lib/market";
import { useRealtimeSymbols } from "./useRealtime";
import type { MarketCode, Quote } from "@/types/market.types";

/**
 * 여러 종목의 현재가: 주식은 장중 주기 폴링(REST), 코인은 SSE 실시간 tick 을 덮어쓴다.
 * 반환: 종목 키(MARKET:CODE) → Quote
 */
export function useLivePrices(items: { market: MarketCode; code: string }[]): Map<string, Quote> {
  const keys = useMemo(() => items.map((i) => quoteKey(i.market, i.code)), [items]);
  const cryptoKeys = useMemo(() => keys.filter((k) => k.startsWith("CRYPTO:")), [keys]);
  const { data: overview } = useGetOverviewQuery();
  const anyStockOpen = overview
    ? overview.marketStatus.KR_STOCK === "OPEN" || overview.marketStatus.US_STOCK === "OPEN"
    : false;

  const { data: rest } = useGetQuotesQuery(keys.join(","), {
    skip: keys.length === 0,
    pollingInterval: anyStockOpen ? 20_000 : 0,
    skipPollingIfUnfocused: true,
  });

  useRealtimeSymbols(cryptoKeys);
  // 코인 tick 이 올 때마다 다시 계산 (구독 종목 중 하나라도 바뀌면 새 버전)
  const version = useSyncExternalStore(
    (cb) => {
      const unsubs = cryptoKeys.map((k) => tickerStore.subscribe(k, cb));
      return () => unsubs.forEach((u) => u());
    },
    () => cryptoKeys.map((k) => tickerStore.getLatest(k)?.ts ?? 0).join(",")
  );

  return useMemo(() => {
    const map = new Map<string, Quote>();
    rest?.forEach((q) => map.set(q.key, q));
    cryptoKeys.forEach((k) => {
      const tick = tickerStore.getLatest(k);
      if (tick) map.set(k, { ...tick, name: tick.name ?? map.get(k)?.name ?? null });
    });
    return map;
    // version: 실시간 tick 반영용 의존성
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rest, cryptoKeys, version]);
}
