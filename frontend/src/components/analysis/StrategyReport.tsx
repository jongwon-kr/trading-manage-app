import { useState } from "react";
import { Link } from "react-router-dom";
import { AlertTriangle, BookOpen, ChevronRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { changeColorClass, formatNumber, formatPercent } from "@/lib/format";
import { formatValue } from "@/lib/bands";
import { FactorExplainPanel } from "./FactorExplainPanel";
import { FactorContributionChart } from "./FactorContributionChart";
import { ScoreGauge } from "./ScoreGauge";
import { SignalBadge } from "./SignalBadge";
import { SubScoreCards } from "./SubScoreCards";
import { TradeLevels } from "./TradeLevels";
import type { FactorResult, StrategyResult } from "@/types/strategy.types";

/** 근거 칸: 라벨이 붙은 입력값 (schemaVersion 2 결과는 raw 키를 그대로) */
function basisText(f: FactorResult): string {
  const values = f.explain
    ? f.explain.inputs.filter((i) => i.value != null && i.unit !== "text")
        .map((i) => `${i.label} ${formatValue(i.value, i.unit)}`)
    : Object.entries(f.raw).filter(([, v]) => v != null)
        .map(([k, v]) => `${k} ${typeof v === "number" ? formatNumber(v, Math.abs(v) < 10 ? 3 : 0) : v}`);
  return [f.note, ...values].filter(Boolean).join(" · ");
}

export function StrategyWarnings({ warnings }: { warnings: string[] }) {
  if (!warnings.length) return null;
  return (
    <div className="space-y-1 rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-sm">
      {warnings.map((w) => (
        <p key={w} className="flex items-start gap-2">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
          {w}
        </p>
      ))}
    </div>
  );
}

/** 전략 분석 전체 리포트: 점수·신호, 그룹별 점수, 팩터 기여도, 매매 레벨, 팩터 상세 */
export function StrategyReport({ result }: { result: StrategyResult }) {
  const [selected, setSelected] = useState<{ factor: FactorResult; group: string } | null>(null);
  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="flex flex-wrap items-center gap-6 p-5">
          <ScoreGauge score={result.score} />
          <div className="min-w-[240px] flex-1 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <SignalBadge strength={result.strength} />
              <span className="text-sm text-muted-foreground">
                신뢰도 {formatPercent(result.confidence, 0, false)} · 기준일 {result.asOf} · 모델 {result.modelVersion}
                {result.config && !result.config.isDefault && ` · 전략 ${result.config.name ?? `사용자 설정(${result.config.hash.slice(0, 6)})`}`}
              </span>
              <Link to="/analysis/methodology" className="ml-auto inline-flex items-center gap-1 text-xs text-primary hover:underline">
                <BookOpen className="h-3.5 w-3.5" />
                분석 방법 보기
              </Link>
            </div>
            {/* 요약은 일반 텍스트로만 렌더링 */}
            <p className="text-sm leading-relaxed">{result.summary}</p>
            <StrategyWarnings warnings={result.warnings} />
          </div>
        </CardContent>
      </Card>

      <SubScoreCards groups={result.groups} />

      <div className="grid gap-4 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader className="pb-1">
            <CardTitle className="text-base">팩터별 기여도 (점)</CardTitle>
            <p className="text-xs text-muted-foreground">50점(중립)에 각 팩터 기여도를 더한 값이 종합 점수입니다.</p>
          </CardHeader>
          <CardContent>
            <FactorContributionChart groups={result.groups} />
          </CardContent>
        </Card>
        {result.risk && (
          <Card className="lg:col-span-2">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">매매 계획 (ATR 기반, 롱)</CardTitle>
            </CardHeader>
            <CardContent>
              <TradeLevels risk={result.risk} market={result.market} lastPrice={result.lastPrice} />
            </CardContent>
          </Card>
        )}
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">팩터 상세</CardTitle>
          <p className="text-xs text-muted-foreground">행을 누르면 계산식·입력값·밴드(값→점수)·가중치를 볼 수 있습니다.</p>
        </CardHeader>
        <CardContent className="px-2">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>그룹</TableHead>
                <TableHead>팩터</TableHead>
                <TableHead className="text-right">점수(-1~1)</TableHead>
                <TableHead className="text-right">기여</TableHead>
                <TableHead className="hidden md:table-cell">근거</TableHead>
                <TableHead className="w-6 px-1" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {result.groups.flatMap((g) =>
                g.factors.map((f) => (
                  <TableRow key={`${g.key}:${f.key}`} className="cursor-pointer"
                            onClick={() => setSelected({ factor: f, group: g.label })}>
                    <TableCell className="text-muted-foreground">{g.label}</TableCell>
                    <TableCell>{f.label}</TableCell>
                    <TableCell className={`text-right tabular-nums ${changeColorClass(f.score)}`}>
                      {f.score == null ? "-" : f.score.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {f.score == null ? "-" : `${f.contribution >= 0 ? "+" : ""}${f.contribution.toFixed(2)}`}
                    </TableCell>
                    <TableCell className="hidden max-w-[420px] truncate text-xs text-muted-foreground md:table-cell">
                      {basisText(f)}
                    </TableCell>
                    <TableCell className="w-6 px-1 text-muted-foreground">
                      <ChevronRight className="h-4 w-4" aria-label="계산 근거 보기" />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          <p className="px-2 pt-3 text-[11px] text-muted-foreground">
            데이터: {Object.entries(result.dataSources).map(([k, v]) => `${k}=${v}`).join(", ")} · 본 분석은 투자 참고용이며
            투자 판단과 책임은 이용자에게 있습니다.
          </p>
        </CardContent>
      </Card>
      <FactorExplainPanel factor={selected?.factor ?? null} groupLabel={selected?.group}
                          open={selected != null} onOpenChange={(o) => !o && setSelected(null)} />
    </div>
  );
}
