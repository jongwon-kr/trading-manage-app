import { Info } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useGetAnalysisModelQuery } from "@/api/strategy.api";
import { Progress } from "@/components/ui/progress";
import { changeColorClass, formatPercent } from "@/lib/format";
import type { GroupResult } from "@/types/strategy.types";

/** 그룹 점수(-1~1)를 0~100 으로 */
const toScore100 = (s: number | null) => (s == null ? null : 50 + 50 * s);

export function SubScoreCards({ groups }: { groups: GroupResult[] }) {
  const { data: model } = useGetAnalysisModelQuery();
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {groups.map((g) => {
        const s100 = toScore100(g.score);
        const available = s100 != null && (g.effectiveWeight ?? 0) > 0;
        return (
          <Card key={g.key}>
            <CardContent className="space-y-2 p-4">
              <div className="flex items-baseline justify-between">
                <span className="flex items-center gap-1 text-sm text-muted-foreground">
                  {g.label}
                  <Tooltip>
                    <TooltipTrigger aria-label={`${g.label} 설명`}>
                      <Info className="h-3.5 w-3.5" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs text-xs leading-relaxed">
                      <p>{model?.groups.find((m) => m.key === g.key)?.description}</p>
                      <p className="mt-1 opacity-80">
                        비중 = 기본 비중 {formatPercent(g.baseWeight, 0, false)} × 데이터 커버리지, 사용 가능한 그룹끼리 합이 100%가
                        되도록 다시 나눈 값
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </span>
                <span className="text-xs text-muted-foreground">
                  비중 {available ? formatPercent(g.effectiveWeight, 0, false) : "-"}
                </span>
              </div>
              {available ? (
                <>
                  <p className={`text-2xl font-semibold tabular-nums ${changeColorClass(g.score)}`}>
                    {s100.toFixed(0)}
                    <span className="ml-1 text-sm text-muted-foreground">/ 100</span>
                  </p>
                  <Progress value={s100} className="h-1.5" />
                  <p className="text-xs text-muted-foreground">
                    데이터 {formatPercent(g.coverage, 0, false)} · 기여 {g.contribution >= 0 ? "+" : ""}
                    {g.contribution.toFixed(1)}점
                  </p>
                </>
              ) : (
                <p className="py-3 text-sm text-muted-foreground">
                  {g.baseWeight === 0 ? "해당 없음 (암호화폐)" : "데이터 없음"}
                </p>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
