import type { MarketCode } from "@/types/market.types";

const formatters = new Map<string, Intl.NumberFormat>();

function nf(key: string, options: Intl.NumberFormatOptions): Intl.NumberFormat {
  let f = formatters.get(key);
  if (!f) {
    f = new Intl.NumberFormat("ko-KR", options);
    formatters.set(key, f);
  }
  return f;
}

/** 암호화폐는 가격대에 따라 소수 자릿수가 달라진다 (Upbit KRW 호가 단위 기준) */
export function cryptoPrecision(price: number): number {
  const p = Math.abs(price);
  if (p >= 1000) return 0;
  if (p >= 100) return 1;
  if (p >= 10) return 2;
  if (p >= 1) return 3;
  if (p >= 0.1) return 4;
  return 6;
}

export function pricePrecision(market: MarketCode, price: number, precision?: number | null): number {
  if (precision != null) return precision;
  if (market === "KR_STOCK") return 0;
  if (market === "US_STOCK") return 2;
  return cryptoPrecision(price);
}

export function formatPrice(
  value: number | null | undefined,
  market: MarketCode,
  precision?: number | null
): string {
  if (value == null || Number.isNaN(value)) return "-";
  const digits = pricePrecision(market, value, precision);
  return nf(`p${digits}`, { minimumFractionDigits: digits, maximumFractionDigits: digits }).format(value);
}

/** 통화 기호 포함 (USD 는 $, KRW 는 원) */
export function formatMoney(value: number | null | undefined, market: MarketCode, precision?: number | null): string {
  if (value == null || Number.isNaN(value)) return "-";
  const text = formatPrice(value, market, precision);
  return market === "US_STOCK" ? `$${text}` : `${text}원`;
}

/** rate 는 소수 (0.015 → +1.50%) */
export function formatPercent(rate: number | null | undefined, digits = 2, signed = true): string {
  if (rate == null || Number.isNaN(rate)) return "-";
  const text = nf(`r${digits}`, { minimumFractionDigits: digits, maximumFractionDigits: digits }).format(
    Math.abs(rate) * 100
  );
  if (!signed || rate === 0) return `${rate < 0 ? "-" : ""}${text}%`;
  return `${rate > 0 ? "+" : "-"}${text}%`;
}

export function formatSigned(value: number | null | undefined, market: MarketCode, precision?: number | null): string {
  if (value == null || Number.isNaN(value)) return "-";
  const text = formatPrice(Math.abs(value), market, precision);
  return value > 0 ? `+${text}` : value < 0 ? `-${text}` : text;
}

/** 큰 수를 만/억/조 단위로 (거래량·거래대금·시가총액) */
export function formatCompact(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return "-";
  return nf("compact", { notation: "compact", maximumFractionDigits: 2 }).format(value);
}

export function formatNumber(value: number | null | undefined, digits = 2): string {
  if (value == null || Number.isNaN(value)) return "-";
  return nf(`n${digits}`, { maximumFractionDigits: digits }).format(value);
}

/** 등락 방향 → Tailwind 텍스트 색 (한국식: 상승 빨강 / 하락 파랑) */
export function changeColorClass(value: number | null | undefined): string {
  if (!value) return "text-muted-foreground";
  return value > 0 ? "text-price-up" : "text-price-down";
}
