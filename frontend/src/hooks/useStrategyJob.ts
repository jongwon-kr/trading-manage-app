import { useCallback, useEffect, useRef, useState } from "react";
import { useRequestStrategyMutation } from "@/api/strategy.api";
import { useAnalysisJob, type AnalysisJob } from "./useAnalysisJob";
import type { MarketCode } from "@/types/market.types";
import type { StrategyRequest, StrategyResult } from "@/types/strategy.types";

/**
 * 전략 분석 요청 → 결과 폴링을 묶은 훅.
 * autoRun 이면 종목이 정해질 때 한 번 자동 실행한다 (Python 쪽에서 10분 캐시되므로 부담이 작다).
 */
export function useStrategyJob(market: MarketCode | null, symbol: string | null, { autoRun = false } = {}) {
  const [requestId, setRequestId] = useState<string | null>(null);
  const [requestError, setRequestError] = useState<string | null>(null);
  const [request, { isLoading: requesting }] = useRequestStrategyMutation();
  const job: AnalysisJob<StrategyResult> = useAnalysisJob<StrategyResult>(requestId);

  const run = useCallback(
    async (options: Omit<StrategyRequest, "market" | "symbol"> = {}) => {
      if (!market || !symbol) return;
      setRequestError(null);
      try {
        const res = await request({ market, symbol, ...options }).unwrap();
        setRequestId(res.requestId);
      } catch (e) {
        setRequestError((e as { message?: string }).message ?? "분석 요청에 실패했습니다.");
      }
    },
    [market, symbol, request]
  );

  const autoRan = useRef<string | null>(null);
  useEffect(() => {
    const key = market && symbol ? `${market}:${symbol}` : null;
    if (!autoRun || !key || autoRan.current === key) return;
    autoRan.current = key;
    void run();
  }, [autoRun, market, symbol, run]);

  const busy = requesting || job.status === "PROCESSING";
  return {
    run,
    busy,
    job: requestError ? ({ status: "FAILED", error: requestError } as AnalysisJob<StrategyResult>) : job,
  };
}
