import { useCallback, useEffect, useRef, useState } from "react";
import { useRequestStrategyMutation } from "@/api/strategy.api";
import { useAnalysisJob, type AnalysisJob } from "./useAnalysisJob";
import type { MarketCode } from "@/types/market.types";
import type { StrategyRequest, StrategyResult } from "@/types/strategy.types";

/**
 * 전략 분석 요청 → 결과 폴링을 묶은 훅.
 * autoRun 이면 종목(또는 선택한 전략 presetId)이 정해질 때 한 번 자동 실행한다 (Python 쪽에서 10분 캐시되므로 부담이 작다).
 * presetId 는 run 옵션에 기본으로 들어간다 (run({ config }) 처럼 직접 설정을 주면 presetId 는 빠진다).
 */
export function useStrategyJob(
  market: MarketCode | null,
  symbol: string | null,
  { autoRun = false, presetId }: { autoRun?: boolean; presetId?: number } = {}
) {
  const [requestId, setRequestId] = useState<string | null>(null);
  const [requestError, setRequestError] = useState<string | null>(null);
  const [request, { isLoading: requesting }] = useRequestStrategyMutation();
  const job: AnalysisJob<StrategyResult> = useAnalysisJob<StrategyResult>(requestId);

  const run = useCallback(
    async (options: Omit<StrategyRequest, "market" | "symbol"> = {}) => {
      if (!market || !symbol) return;
      setRequestError(null);
      try {
        const preset = options.config || options.presetId != null || presetId == null ? {} : { presetId };
        const res = await request({ market, symbol, ...preset, ...options }).unwrap();
        setRequestId(res.requestId);
      } catch (e) {
        setRequestError((e as { message?: string }).message ?? "분석 요청에 실패했습니다.");
      }
    },
    [market, symbol, presetId, request]
  );

  const autoRan = useRef<string | null>(null);
  useEffect(() => {
    const key = market && symbol ? `${market}:${symbol}:${presetId ?? "default"}` : null;
    if (!autoRun || !key || autoRan.current === key) return;
    autoRan.current = key;
    void run();
  }, [autoRun, market, symbol, presetId, run]);

  const busy = requesting || job.status === "PROCESSING";
  return {
    run,
    busy,
    job: requestError ? ({ status: "FAILED", error: requestError } as AnalysisJob<StrategyResult>) : job,
  };
}
