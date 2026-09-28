import type { Quote } from "@/types/market.types";

export type RealtimeStatus = "idle" | "connecting" | "open" | "reconnecting";

export interface TransportHandlers {
  onQuote: (q: Quote) => void;
  onStatus: (s: RealtimeStatus) => void;
  /** 끊겼다가 다시 연결됨 → 그 사이 놓친 봉을 서버에서 다시 받아야 한다 */
  onReconnected: () => void;
}

const MIN_BACKOFF_MS = 1_000;
const MAX_BACKOFF_MS = 30_000;

/**
 * 코인 실시간 시세 SSE 연결 (GET /api/v1/market/stream?keys=...).
 * 공개 시세만 전송하는 엔드포인트라 인증 헤더가 필요 없다 (EventSource 는 헤더를 보낼 수 없음).
 * 서버 오류(4xx/5xx)로 EventSource 가 CLOSED 되면 브라우저가 재시도하지 않으므로 직접 지수 백오프로 재연결한다.
 */
export class SseTransport {
  private es: EventSource | null = null;
  private keys: string[] = [];
  private attempts = 0;
  private everOpened = false;
  private retryTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(private readonly baseUrl: string, private readonly handlers: TransportHandlers) {}

  open(keys: string[]): void {
    this.close();
    this.keys = keys;
    this.everOpened = false;
    this.connect();
  }

  close(): void {
    if (this.retryTimer) clearTimeout(this.retryTimer);
    this.retryTimer = null;
    this.es?.close();
    this.es = null;
    this.attempts = 0;
  }

  private connect(): void {
    const url = `${this.baseUrl}/v1/market/stream?keys=${encodeURIComponent(this.keys.join(","))}`;
    const es = new EventSource(url);
    this.es = es;
    this.handlers.onStatus(this.everOpened ? "reconnecting" : "connecting");

    es.onopen = () => {
      this.attempts = 0;
      this.handlers.onStatus("open");
      if (this.everOpened) this.handlers.onReconnected();
      this.everOpened = true;
    };
    const onData = (e: MessageEvent<string>) => {
      try {
        const data = JSON.parse(e.data) as Quote | Quote[];
        (Array.isArray(data) ? data : [data]).forEach(this.handlers.onQuote);
      } catch {
        // 잘못된 메시지는 무시
      }
    };
    es.addEventListener("snapshot", onData);
    es.addEventListener("tick", onData);
    es.onerror = () => {
      if (es !== this.es) return;
      this.handlers.onStatus("reconnecting");
      if (es.readyState === EventSource.CLOSED) {
        // 브라우저 자동 재연결이 멈춘 경우 → 직접 재시도
        const delay = Math.min(MIN_BACKOFF_MS * 2 ** this.attempts, MAX_BACKOFF_MS) * (0.8 + Math.random() * 0.4);
        this.attempts++;
        this.retryTimer = setTimeout(() => this.connect(), delay);
      }
    };
  }
}
