import { Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatPercent } from "@/lib/format";
import { ScoreGauge } from "./ScoreGauge";
import { SignalBadge } from "./SignalBadge";
import { TradeLevels } from "./TradeLevels";
import type { AnalysisJob } from "@/hooks/useAnalysisJob";
import type { StrategyResult } from "@/types/strategy.types";

interface Props {
  job: AnalysisJob<StrategyResult>;
  busy: boolean;
  onRun: () => void;
}

/** 종목 상세 우측의 전략 요약 (게이지·신호·매매 레벨) */
export function StrategySummaryCard({ job, busy, onRun }: Props) {
  const r = job.result;
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-base">전략 분석</CardTitle>
        <Button variant="ghost" size="sm" onClick={onRun} disabled={busy} className="h-8 gap-1.5">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          {r ? "다시 분석" : "분석 실행"}
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {job.status === "PROCESSING" && (
          <p className="py-6 text-center text-sm text-muted-foreground">
            기본적·기술적·시장국면 지표를 계산하는 중…
          </p>
        )}
        {(job.status === "FAILED" || job.status === "TIMEOUT") && (
          <p className="text-sm text-destructive">{job.error}</p>
        )}
        {job.status === "IDLE" && !busy && (
          <p className="text-sm text-muted-foreground">분석을 실행하면 종합 점수와 매매 계획을 보여줍니다.</p>
        )}
        {r && (
          <>
            <div className="flex items-center gap-3">
              <ScoreGauge score={r.score} size={140} />
              <div className="space-y-1">
                <SignalBadge strength={r.strength} />
                <p className="text-xs text-muted-foreground">신뢰도 {formatPercent(r.confidence, 0, false)}</p>
                <p className="text-xs text-muted-foreground">기준일 {r.asOf}</p>
              </div>
            </div>
            {r.risk && <TradeLevels risk={r.risk} market={r.market} lastPrice={r.lastPrice} />}
            <a href="#strategy-report" className="block text-right text-xs text-primary hover:underline">
              상세 리포트 보기 ↓
            </a>
          </>
        )}
      </CardContent>
    </Card>
  );
}
