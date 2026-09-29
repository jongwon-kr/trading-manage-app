import { Link } from "react-router-dom";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useGetAnalysisModelQuery } from "@/api/strategy.api";
import { changeColorClass } from "@/lib/format";
import { fmtPct, formatValue } from "@/lib/bands";
import { BandChart } from "./BandChart";
import type { FactorResult } from "@/types/strategy.types";

interface Props {
  factor: FactorResult | null;
  groupLabel?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <h3 className="text-sm font-semibold">{title}</h3>
      {children}
    </section>
  );
}

/** 팩터 계산 근거: 무엇을 보는지 · 식 · 입력값 · 밴드(값→점수) · 가중치 경로 · 기여 점수 */
export function FactorExplainPanel({ factor, groupLabel, open, onOpenChange }: Props) {
  const { data: model } = useGetAnalysisModelQuery();
  const ex = factor?.explain;
  const subLabel = model?.subGroups.find((s) => s.key === ex?.weightPath.subGroup)?.label;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-lg">
        {factor && (
          <>
            <SheetHeader className="space-y-1 text-left">
              <p className="text-xs text-muted-foreground">
                {groupLabel}
                {subLabel ? ` › ${subLabel}` : ""}
              </p>
              <SheetTitle>{factor.label}</SheetTitle>
              <SheetDescription>{ex?.description ?? "이전 버전 분석 결과라 상세 근거가 없습니다. 다시 분석해 주세요."}</SheetDescription>
            </SheetHeader>

            <div className="mt-4 grid grid-cols-3 gap-2 text-center">
              <div className="rounded-md border p-2">
                <p className="text-[11px] text-muted-foreground">팩터 점수 (−1~1)</p>
                <p className={`text-lg font-semibold tabular-nums ${changeColorClass(factor.score)}`}>
                  {factor.score == null ? "-" : factor.score.toFixed(2)}
                </p>
              </div>
              <div className="rounded-md border p-2">
                <p className="text-[11px] text-muted-foreground">종합 점수 내 비중</p>
                <p className="text-lg font-semibold tabular-nums">{fmtPct(factor.weight)}</p>
              </div>
              <div className="rounded-md border p-2">
                <p className="text-[11px] text-muted-foreground">기여 (점)</p>
                <p className={`text-lg font-semibold tabular-nums ${changeColorClass(factor.contribution)}`}>
                  {factor.score == null ? "-" : `${factor.contribution >= 0 ? "+" : ""}${factor.contribution.toFixed(2)}`}
                </p>
              </div>
            </div>
            {factor.note && <p className="mt-3 text-sm">{factor.note}</p>}

            {ex && (
              <div className="mt-5 space-y-5">
                <Section title="계산식">
                  <p className="rounded-md bg-muted px-3 py-2 font-mono text-xs leading-relaxed">{ex.formula}</p>
                  {ex.rules.length > 0 && (
                    <ul className="list-disc space-y-1 pl-5 text-xs text-muted-foreground">
                      {ex.rules.map((r) => <li key={r}>{r}</li>)}
                    </ul>
                  )}
                </Section>

                {ex.inputs.length > 0 && (
                  <Section title="입력값 (기준일)">
                    <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                      {ex.inputs.map((i) => (
                        <div key={i.key} className="contents">
                          <dt className="text-muted-foreground">{i.label}</dt>
                          <dd className="text-right tabular-nums">{formatValue(i.value, i.unit)}</dd>
                        </div>
                      ))}
                    </dl>
                  </Section>
                )}

                {ex.bands.length > 0 && (
                  <Section title="밴드: 입력값 → 점수">
                    <p className="text-xs text-muted-foreground">
                      점 사이는 직선으로 잇고, 양 끝 밖은 끝값을 씁니다. 큰 점이 이번 입력값의 위치입니다.
                    </p>
                    {ex.bands.map((b) => (
                      <div key={b.name} className="rounded-md border p-2">
                        <div className="flex items-baseline justify-between px-1 text-xs">
                          <span className="font-medium">{b.label}</span>
                          <span className="tabular-nums text-muted-foreground">
                            {b.x == null ? "데이터 없음" : `${formatValue(b.x, b.unit)} → ${b.y?.toFixed(2)}`}
                          </span>
                        </div>
                        <BandChart xs={b.xs} ys={b.ys} unit={b.unit} x={b.x} height={140} />
                      </div>
                    ))}
                  </Section>
                )}

                {ex.params.length > 0 && (
                  <Section title="파라미터">
                    <div className="flex flex-wrap gap-2">
                      {ex.params.map((p) => (
                        <Badge key={p.key} variant="secondary" className="font-normal">
                          {p.label} {p.value}
                        </Badge>
                      ))}
                    </div>
                  </Section>
                )}

                <Separator />
                <Section title="종합 점수 반영">
                  <div className="space-y-1 text-sm">
                    <p>
                      그룹 비중 <b className="tabular-nums">{fmtPct(ex.weightPath.groupShare)}</b> × 그룹 안 비중{" "}
                      <b className="tabular-nums">{fmtPct(ex.weightPath.inGroup)}</b> ={" "}
                      <b className="tabular-nums">{fmtPct(ex.weightPath.effective)}</b>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      그룹 안 비중 = 이 팩터 가중치
                      {ex.weightPath.subgroupWeight != null &&
                        ` (${subLabel ?? "하위 그룹"} ${ex.weightPath.subgroupWeight} × 팩터 ${ex.weightPath.factorWeight})`}
                      {ex.weightPath.subgroupWeight == null && ` ${ex.weightPath.factorWeight}`} ÷ 데이터가 있는 팩터 가중치 합
                    </p>
                    {factor.score != null && (
                      <p>
                        기여 = 50 × {fmtPct(ex.weightPath.effective)} × {factor.score.toFixed(2)} ={" "}
                        <b className={`tabular-nums ${changeColorClass(factor.contribution)}`}>
                          {factor.contribution >= 0 ? "+" : ""}
                          {factor.contribution.toFixed(2)}점
                        </b>
                      </p>
                    )}
                  </div>
                </Section>
                <Link to="/analysis/methodology" className="block text-sm text-primary underline-offset-4 hover:underline">
                  전체 분석 방법 보기 →
                </Link>
              </div>
            )}
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
