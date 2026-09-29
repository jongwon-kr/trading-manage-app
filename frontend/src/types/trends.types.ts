// 시장 동향·브리핑 타입 (원본: backend-python app/market/trends.py, briefing.py)
import type { MarketCode, Quote } from "./market.types";
import type { FactorResult } from "./strategy.types";

export type PeriodKey = "1d" | "1w" | "1m" | "3m";
export type Quadrant = "LEADING" | "WEAKENING" | "LAGGING" | "IMPROVING";

export interface SectorTrend {
  key: string;
  name: string;
  ticker: string;
  close: number | null;
  returns: Record<PeriodKey, number | null>;
  /** 벤치마크 대비 초과수익 */
  excess: Record<PeriodKey, number | null>;
  aboveMa50: boolean | null;
  /** 100 위 = 시장보다 강함 */
  rsRatio: number | null;
  /** 0 위 = 상대강도가 좋아지는 중 */
  rsMomentum: number | null;
  quadrant: Quadrant | null;
  quadrantLabel: string | null;
  /** 0.2·1W + 0.3·1M + 0.5·3M 초과수익 */
  leaderScore: number | null;
  rank: number;
  tail: { ratio: number; momentum: number }[];
}

export interface GroupTrend {
  no: number;
  name: string;
  changeRate: number;
  rise: number;
  fall: number;
  steady: number;
  total: number;
  advanceRatio: number | null;
}

export interface CoinCategory {
  id: string;
  name: string;
  marketCap: number | null;
  change24h: number | null;
  volume24h: number | null;
  topCoins: string[];
}

export interface Ranked<T> {
  top: T[];
  bottom: T[];
  count: number;
}

export interface MarketTrends {
  market: MarketCode;
  sectors: SectorTrend[];
  benchmark?: string;
  sectorSource?: string;
  groups: { industry: Ranked<GroupTrend>; theme: Ranked<GroupTrend> } | null;
  categories: Ranked<CoinCategory> | null;
  breadth?: number | null;
  concentration?: { topN: number; share: number; total: number } | null;
  mostActive?: Quote[];
  fearGreedHistory?: { value: number; label: string; ts: number }[];
  btcDominance?: number | null;
  warnings: string[];
  asOf: number;
}

export interface GroupStock {
  code: string;
  name: string | null;
  exchange?: string;
  price: number | null;
  changeRate: number | null;
  tradeValue?: number | null;
  marketCap?: number | null;
  weight?: number | null;
}

export interface TrendGroup {
  kind: "industry" | "theme" | "sector";
  id: string;
  name?: string;
  stocks: GroupStock[];
  source: string | null;
}

export interface BriefingSentence {
  text: string;
  evidence: Record<string, string | number>;
}

export interface Briefing {
  market: MarketCode;
  date: string;
  headline: string;
  regime: { score: number | null; label: string; factors: FactorResult[] };
  sections: { key: string; title: string; sentences: BriefingSentence[] }[];
  generatedAt: number;
}
