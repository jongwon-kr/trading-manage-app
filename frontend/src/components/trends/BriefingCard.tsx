import { useState } from "react";
import { Info } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useGetBriefingDatesQuery, useGetBriefingQuery } from "@/api/market.api";
import { changeColorClass } from "@/lib/format";
import type { MarketCode } from "@/types/market.types";
import type { BriefingSentence } from "@/types/trends.types";

const TODAY = "today";

function Sentence({ s }: { s: BriefingSentence }) {
  const ev = Object.entries(s.evidence);
  return (
    <li className="flex items-start gap-1.5 leading-relaxed">
      <span>{s.text}</span>
      {ev.length > 0 && (
        <Tooltip>
          <TooltipTrigger aria-label="근거 수치" className="mt-1 shrink-0 text-muted-foreground hover:text-foreground">
            <Info className="h-3.5 w-3.5" />
          </TooltipTrigger>
          <TooltipContent className="max-w-sm text-xs">
            <p className="mb-1 font-medium">근거</p>
            {ev.map(([k, v]) => (
              <p key={k} className="flex justify-between gap-4">
                <span>{k}</span>
                <span className="tabular-nums">{String(v)}</span>
              </p>
            ))}
          </TooltipContent>
        </Tooltip>
      )}
    </li>
  );
}

/** 규칙 기반 시장 브리핑: 헤드라인 + 섹션별 문장, 문장마다 근거 수치 (최근 14일 조회) */
export function BriefingCard({ market, onRegimeClick }: { market: MarketCode; onRegimeClick?: () => void }) {
  const [date, setDate] = useState(TODAY);
  const { data: dates = [] } = useGetBriefingDatesQuery(market);
  const { data, isFetching, isError } = useGetBriefingQuery(
    { market, date: date === TODAY ? undefined : date },
    { pollingInterval: date === TODAY ? 600_000 : 0 }
  );
  const score = data?.regime.score;

  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3 space-y-0 pb-2">
        <div className="space-y-1">
          <CardTitle className="text-base">오늘의 브리핑</CardTitle>
          <p className="text-xs text-muted-foreground">
            지수·국면·섹터 로테이션·업종/테마 수치로 정해진 규칙에 따라 만든 문장입니다. ⓘ 에 근거 수치가 있습니다.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {score != null && (
            <button type="button" onClick={onRegimeClick} className="rounded-md border px-2 py-1 text-xs hover:bg-muted">
              시장 국면 <b className={`tabular-nums ${changeColorClass(score - 50)}`}>{score.toFixed(0)}</b> {data?.regime.label}
            </button>
          )}
          <Select value={date} onValueChange={setDate}>
            <SelectTrigger className="h-8 w-36" aria-label="브리핑 날짜">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={TODAY}>오늘 (실시간)</SelectItem>
              {dates.slice(1).map((d) => (
                <SelectItem key={d} value={d}>{d}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {isError && <p className="text-sm text-muted-foreground">브리핑을 불러오지 못했습니다.</p>}
        {!data && isFetching && <Skeleton className="h-40 w-full" />}
        {data && (
          <>
            <p className="text-base font-medium leading-relaxed">{data.headline}</p>
            <div className="grid gap-4 md:grid-cols-2">
              {data.sections.map((sec) => (
                <section key={sec.key} className="space-y-1.5">
                  <h4 className="text-sm font-semibold text-muted-foreground">{sec.title}</h4>
                  <ul className="list-disc space-y-1 pl-4 text-sm">
                    {sec.sentences.map((s) => <Sentence key={s.text} s={s} />)}
                  </ul>
                </section>
              ))}
            </div>
            <p className="text-[11px] text-muted-foreground">
              기준 {data.date} · 생성 {new Date(data.generatedAt).toLocaleTimeString("ko-KR")} · 투자 참고용이며 투자 판단의 책임은
              이용자에게 있습니다.
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}
