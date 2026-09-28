import type { Interval, MarketCode } from "@/types/market.types";

// URL slug(/market/kr/005930) ↔ API 시장 코드
const SLUG_TO_MARKET: Record<string, MarketCode> = {
  kr: "KR_STOCK",
  us: "US_STOCK",
  crypto: "CRYPTO",
};

const MARKET_TO_SLUG: Record<MarketCode, string> = {
  KR_STOCK: "kr",
  US_STOCK: "us",
  CRYPTO: "crypto",
};

export const MARKETS: MarketCode[] = ["KR_STOCK", "US_STOCK", "CRYPTO"];

export const MARKET_LABELS: Record<MarketCode, string> = {
  KR_STOCK: "국내주식",
  US_STOCK: "미국주식",
  CRYPTO: "암호화폐",
};

export function parseMarketParam(slug: string | undefined): MarketCode | null {
  return (slug && SLUG_TO_MARKET[slug.toLowerCase()]) || null;
}

export function marketSlug(market: MarketCode): string {
  return MARKET_TO_SLUG[market];
}

export function symbolPath(market: MarketCode, code: string): string {
  return `/market/${MARKET_TO_SLUG[market]}/${encodeURIComponent(code)}`;
}

// backend-python SUPPORTED_INTERVALS 와 동일하게 유지
export const SUPPORTED_INTERVALS: Record<MarketCode, Interval[]> = {
  KR_STOCK: ["5m", "15m", "30m", "1h", "1d", "1w", "1M"],
  US_STOCK: ["1m", "5m", "15m", "30m", "1h", "4h", "1d", "1w", "1M"],
  CRYPTO: ["1m", "5m", "15m", "30m", "1h", "4h", "1d", "1w", "1M"],
};

export const INTERVAL_LABELS: Record<Interval, string> = {
  "1m": "1분",
  "5m": "5분",
  "15m": "15분",
  "30m": "30분",
  "1h": "1시간",
  "4h": "4시간",
  "1d": "일",
  "1w": "주",
  "1M": "월",
};

export const INTERVAL_SECONDS: Record<Interval, number> = {
  "1m": 60,
  "5m": 300,
  "15m": 900,
  "30m": 1800,
  "1h": 3600,
  "4h": 14400,
  "1d": 86400,
  "1w": 604800,
  "1M": 2592000,
};

export function isIntraday(interval: Interval): boolean {
  return !["1d", "1w", "1M"].includes(interval);
}

/** 차트 시간 표시 기준 시간대 */
export function marketTimeZone(market: MarketCode): string {
  return market === "US_STOCK" ? "America/New_York" : "Asia/Seoul";
}

export function quoteKey(market: MarketCode, code: string): string {
  return `${market}:${code}`;
}

/**
 * 매매일지 종목 → 종목 상세 경로. 일지는 시장을 STOCK/CRYPTO 로만 구분하므로 코드 형식으로 추정한다.
 * (6자리 숫자 → 국내주식, 그 외 STOCK → 미국주식, CRYPTO → Upbit KRW 마켓). FOREX/FUTURES 는 null.
 */
export function journalSymbolPath(journalMarket: string, symbol: string): string | null {
  const s = symbol.trim().toUpperCase();
  if (journalMarket === "STOCK") return symbolPath(/^\d{6}$/.test(s) ? "KR_STOCK" : "US_STOCK", s);
  if (journalMarket === "CRYPTO") return symbolPath("CRYPTO", s.startsWith("KRW-") ? s : `KRW-${s}`);
  return null;
}
