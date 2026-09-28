import { useEffect, useState } from "react";
import { skipToken } from "@reduxjs/toolkit/query";
import { useGetAnalysisResultQuery } from "@/api/strategy.api";
import type { AnalysisEnvelope } from "@/types/strategy.types";

export type JobStatus = "IDLE" | "PROCESSING" | "SUCCESS" | "FAILED" | "TIMEOUT";

export interface AnalysisJob<T> {
  status: JobStatus;
  result?: T;
  error?: string;
  progress?: number;
  message?: string;
}

const POLL_MS = 2_000;

/**
 * requestId 로 분석 결과를 폴링한다. 완료(SUCCESS/FAILED)·timeout·언마운트 시 폴링이 멈춘다.
 * (RTK Query 구독이 해제되면 pollingInterval 도 함께 정리된다)
 */
export function useAnalysisJob<T extends AnalysisEnvelope>(
  requestId: string | null,
  { timeoutMs = 90_000 }: { timeoutMs?: number } = {}
): AnalysisJob<T> {
  const [timedOutId, setTimedOutId] = useState<string | null>(null);
  const timedOut = requestId != null && timedOutId === requestId;

  // 결과 읽기용 구독
  const { data, error } = useGetAnalysisResultQuery(requestId ?? skipToken);
  const status = data?.status;
  const done = status === "SUCCESS" || status === "FAILED" || timedOut || !!error;

  // 폴링 전용 구독: 완료되면 skipToken 으로 해제 → 폴링 중단 (같은 캐시 항목을 공유)
  useGetAnalysisResultQuery(requestId && !done ? requestId : skipToken, {
    pollingInterval: POLL_MS,
    skipPollingIfUnfocused: false,
  });

  useEffect(() => {
    if (!requestId || done) return;
    const id = setTimeout(() => setTimedOutId(requestId), timeoutMs);
    return () => clearTimeout(id);
  }, [requestId, done, timeoutMs]);

  if (!requestId) return { status: "IDLE" };
  if (error) return { status: "FAILED", error: (error as { message?: string }).message ?? "결과 조회 실패" };
  if (status === "SUCCESS") return { status: "SUCCESS", result: data as T };
  if (status === "FAILED") return { status: "FAILED", error: data?.errorMessage ?? "분석에 실패했습니다." };
  if (timedOut) return { status: "TIMEOUT", error: "분석 응답이 지연되고 있습니다. 잠시 후 다시 시도하세요." };
  return { status: "PROCESSING", progress: data?.progress, message: data?.message };
}
