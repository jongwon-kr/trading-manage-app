import { API_BASE_URL } from "@/utils/constants";
import type { Quote } from "@/types/market.types";
import { SseTransport, type RealtimeStatus, type TransportHandlers } from "./sse-transport";

type Listener = (q: Quote) => void;

interface Transport {
  open(keys: string[]): void;
  close(): void;
}

const SYNC_DEBOUNCE_MS = 250;

/**
 * 실시간 시세 구독 관리 (모듈 싱글턴).
 * - 여러 컴포넌트가 같은 종목을 구독해도 연결은 탭당 1개 (HTTP/1.1 동시 연결 수 제한 회피)
 * - 종목별 참조 횟수로 구독 집합을 계산하고, 바뀌면 짧게 모았다가(debounce) 재연결
 * - tick 은 Redux 를 거치지 않는다 (종목당 초당 1회 × N 종목 dispatch 는 불필요한 비용)
 */
export class TickerStore {
  private refCount = new Map<string, number>();
  private latest = new Map<string, Quote>();
  private listeners = new Map<string, Set<Listener>>();
  private statusListeners = new Set<() => void>();
  private reconnectListeners = new Set<() => void>();
  private activeKeys = "";
  private syncTimer: ReturnType<typeof setTimeout> | null = null;
  private transport: Transport;
  status: RealtimeStatus = "idle";

  constructor(createTransport?: (h: TransportHandlers) => Transport) {
    const handlers: TransportHandlers = {
      onQuote: (q) => this.emit(q),
      onStatus: (s) => this.setStatus(s),
      onReconnected: () => this.reconnectListeners.forEach((cb) => cb()),
    };
    this.transport = createTransport ? createTransport(handlers) : new SseTransport(API_BASE_URL, handlers);
  }

  acquire(keys: string[]): void {
    keys.forEach((k) => this.refCount.set(k, (this.refCount.get(k) ?? 0) + 1));
    this.scheduleSync();
  }

  release(keys: string[]): void {
    keys.forEach((k) => {
      const n = (this.refCount.get(k) ?? 0) - 1;
      if (n > 0) this.refCount.set(k, n);
      else this.refCount.delete(k);
    });
    this.scheduleSync();
  }

  subscribe(key: string, cb: Listener): () => void {
    let set = this.listeners.get(key);
    if (!set) this.listeners.set(key, (set = new Set()));
    set.add(cb);
    return () => {
      set!.delete(cb);
      if (set!.size === 0) this.listeners.delete(key);
    };
  }

  getLatest(key: string): Quote | undefined {
    return this.latest.get(key);
  }

  subscribeStatus(cb: () => void): () => void {
    this.statusListeners.add(cb);
    return () => this.statusListeners.delete(cb);
  }

  onReconnect(cb: () => void): () => void {
    this.reconnectListeners.add(cb);
    return () => this.reconnectListeners.delete(cb);
  }

  /** 테스트용: debounce 없이 즉시 반영 */
  flushSync(): void {
    if (this.syncTimer) clearTimeout(this.syncTimer);
    this.syncTimer = null;
    this.sync();
  }

  private scheduleSync(): void {
    if (this.syncTimer) clearTimeout(this.syncTimer);
    this.syncTimer = setTimeout(() => {
      this.syncTimer = null;
      this.sync();
    }, SYNC_DEBOUNCE_MS);
  }

  private sync(): void {
    const keys = [...this.refCount.keys()].sort();
    const joined = keys.join(",");
    if (joined === this.activeKeys) return;
    this.activeKeys = joined;
    if (keys.length === 0) {
      this.transport.close();
      this.setStatus("idle");
    } else {
      this.transport.open(keys);
    }
  }

  private emit(q: Quote): void {
    this.latest.set(q.key, q);
    this.listeners.get(q.key)?.forEach((cb) => cb(q));
  }

  private setStatus(s: RealtimeStatus): void {
    if (this.status === s) return;
    this.status = s;
    this.statusListeners.forEach((cb) => cb());
  }
}

export const tickerStore = new TickerStore();
