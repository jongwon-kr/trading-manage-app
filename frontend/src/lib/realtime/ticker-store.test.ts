import { describe, expect, it, vi } from "vitest";
import { TickerStore } from "./ticker-store";
import type { TransportHandlers } from "./sse-transport";
import type { Quote } from "@/types/market.types";

function setup() {
  const calls: string[][] = [];
  let closed = 0;
  let handlers!: TransportHandlers;
  const store = new TickerStore((h) => {
    handlers = h;
    return { open: (keys) => calls.push(keys), close: () => closed++ };
  });
  return { store, calls, closedCount: () => closed, handlers: () => handlers };
}

const quote = (key: string, price: number) => ({ key, price }) as Quote;

describe("TickerStore", () => {
  it("여러 컴포넌트가 같은 종목을 구독해도 연결은 한 번, 구독 집합이 바뀔 때만 재연결", () => {
    const { store, calls } = setup();
    store.acquire(["CRYPTO:KRW-BTC"]);
    store.acquire(["CRYPTO:KRW-BTC"]);
    store.flushSync();
    expect(calls).toEqual([["CRYPTO:KRW-BTC"]]);

    store.release(["CRYPTO:KRW-BTC"]); // 아직 1개 남음
    store.flushSync();
    expect(calls).toHaveLength(1);

    store.acquire(["CRYPTO:KRW-ETH"]);
    store.flushSync();
    expect(calls[1]).toEqual(["CRYPTO:KRW-BTC", "CRYPTO:KRW-ETH"]);
  });

  it("모든 구독이 해제되면 연결을 닫고 idle", () => {
    const { store, closedCount, handlers } = setup();
    store.acquire(["CRYPTO:KRW-BTC"]);
    store.flushSync();
    handlers().onStatus("open");
    expect(store.status).toBe("open");
    store.release(["CRYPTO:KRW-BTC"]);
    store.flushSync();
    expect(closedCount()).toBe(1);
    expect(store.status).toBe("idle");
  });

  it("짧은 시간 안의 구독 변경은 한 번의 재연결로 합친다 (debounce)", () => {
    vi.useFakeTimers();
    const { store, calls } = setup();
    store.acquire(["CRYPTO:KRW-BTC"]);
    store.release(["CRYPTO:KRW-BTC"]);
    store.acquire(["CRYPTO:KRW-ETH"]);
    vi.advanceTimersByTime(300);
    expect(calls).toEqual([["CRYPTO:KRW-ETH"]]);
    vi.useRealTimers();
  });

  it("tick 은 해당 종목 구독자에게만 전달되고 최신값이 저장된다", () => {
    const { store, handlers } = setup();
    const btc = vi.fn();
    const eth = vi.fn();
    store.subscribe("CRYPTO:KRW-BTC", btc);
    const unsubEth = store.subscribe("CRYPTO:KRW-ETH", eth);
    unsubEth();
    handlers().onQuote(quote("CRYPTO:KRW-BTC", 1));
    handlers().onQuote(quote("CRYPTO:KRW-ETH", 2));
    expect(btc).toHaveBeenCalledTimes(1);
    expect(eth).not.toHaveBeenCalled();
    expect(store.getLatest("CRYPTO:KRW-ETH")?.price).toBe(2);
  });

  it("재연결 알림을 구독자에게 전달", () => {
    const { store, handlers } = setup();
    const cb = vi.fn();
    store.onReconnect(cb);
    handlers().onReconnected();
    expect(cb).toHaveBeenCalledOnce();
  });
});
