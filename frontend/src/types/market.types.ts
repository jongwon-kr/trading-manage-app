// 시세 API 타입 (backend-java /api/v1/market, 원본 스키마는 backend-python app/market/models.py)

export type MarketCode = "KR_STOCK" | "US_STOCK" | "CRYPTO";

export type Interval = "1m" | "5m" | "15m" | "30m" | "1h" | "4h" | "1d" | "1w" | "1M";

export interface SymbolInfo {
  market: MarketCode;
  exchange: string;
  code: string;
  name: string;
  nameEn: string | null;
  currency: string;
  sector: string | null;
  /** KR 0, US 2, CRYPTO null (가격대별로 결정) */
  pricePrecision: number | null;
  warning: string | null;
}

/** time: 봉 시작 epoch 초(UTC). 일봉 이상은 거래일 00:00 UTC. lightweight-charts 형식과 동일 */
export interface Candle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface CandleSeries {
  symbol: SymbolInfo;
  interval: Interval;
  candles: Candle[];
  source: string;
  delayed: boolean;
}

export type PriceChangeType = "RISE" | "EVEN" | "FALL";

export interface Quote {
  key: string;
  market: MarketCode;
  code: string;
  name: string | null;
  price: number;
  open: number | null;
  high: number | null;
  low: number | null;
  prevClose: number | null;
  change: PriceChangeType;
  /** 부호 포함 */
  changePrice: number;
  /** 소수 (-0.015 = -1.5%) */
  changeRate: number;
  volume: number | null;
  /** 당일 누적 거래량 (실시간 봉 거래량 누적용) */
  accTradeVolume: number | null;
  tradeValue: number | null;
  currency: string;
  /** epoch ms */
  ts: number;
  delayed: boolean;
  source: string;
}

export interface Fundamentals {
  market: MarketCode;
  code: string;
  per: number | null;
  pbr: number | null;
  eps: number | null;
  bps: number | null;
  roe: number | null;
  operatingMargin: number | null;
  debtToEquity: number | null;
  dividendYield: number | null;
  epsGrowth: number | null;
  revenueGrowth: number | null;
  marketCap: number | null;
  sector: string | null;
  asOf: string | null;
  source: string;
}

export interface Movers {
  gainers: Quote[];
  losers: Quote[];
  mostActive: Quote[];
}

export interface IndexQuote extends Quote {
  sparkline: number[];
}

export type MarketStatus = "OPEN" | "CLOSED";

export interface MarketOverview {
  indices: IndexQuote[];
  marketStatus: Record<MarketCode, MarketStatus>;
  fearGreed: { value: number; label: string; ts: number } | null;
  btcDominance: number | null;
  asOf: number;
  /** 시장별 국면 점수 (0~100) — 전략 모델의 시장 국면 그룹과 같은 계산 */
  regime?: Partial<Record<MarketCode, { score: number; label: string }>>;
}
