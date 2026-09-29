// 최근 백테스트 기록 (브라우저 localStorage) — 전략 공유 시 성과로 첨부할 결과를 고르는 용도.
// 결과 자체는 서버(Redis)에 24시간 보관되므로 requestId 와 요약만 저장한다.
export interface BacktestHistoryEntry {
  requestId: string;
  configHash: string;
  presetName: string | null;
  symbol: string;
  name: string;
  from: string;
  to: string;
  totalReturn: number;
  mdd: number;
  at: number;
}

const KEY = "backtest.history";
const MAX = 30;
const TTL_MS = 24 * 3600 * 1000; // 서버 보관 기간

export function loadBacktests(): BacktestHistoryEntry[] {
  try {
    const list = JSON.parse(localStorage.getItem(KEY) ?? "[]") as BacktestHistoryEntry[];
    return list.filter((e) => Date.now() - e.at < TTL_MS);
  } catch {
    return [];
  }
}

export function saveBacktest(entry: BacktestHistoryEntry): void {
  try {
    const rest = loadBacktests().filter((e) => e.requestId !== entry.requestId);
    localStorage.setItem(KEY, JSON.stringify([entry, ...rest].slice(0, MAX)));
  } catch {
    // 저장소를 쓸 수 없으면 기록하지 않는다
  }
}

/** 이 설정(해시)으로 실행한 백테스트만 */
export function backtestsFor(configHash: string): BacktestHistoryEntry[] {
  return loadBacktests().filter((e) => e.configHash === configHash);
}
