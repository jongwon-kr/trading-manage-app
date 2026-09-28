import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCompact, formatNumber, formatPercent } from "@/lib/format";
import type { Fundamentals } from "@/types/market.types";

interface Props {
  data: Fundamentals | undefined;
  loading?: boolean;
  error?: boolean;
}

export function FundamentalsCard({ data, loading, error }: Props) {
  const rows: [string, string][] = data
    ? [
        ["PER", data.per != null ? `${formatNumber(data.per)}배` : "-"],
        ["PBR", data.pbr != null ? `${formatNumber(data.pbr)}배` : "-"],
        ["ROE", formatPercent(data.roe, 1, false)],
        ["영업이익률", formatPercent(data.operatingMargin, 1, false)],
        ["부채비율", formatPercent(data.debtToEquity, 0, false)],
        ["배당수익률", formatPercent(data.dividendYield, 2, false)],
        ["EPS 성장률", formatPercent(data.epsGrowth, 1)],
        ["매출 성장률", formatPercent(data.revenueGrowth, 1)],
        ["시가총액", data.market === "US_STOCK" && data.marketCap != null ? `$${formatCompact(data.marketCap)}` : formatCompact(data.marketCap)],
      ]
    : [];

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">재무 지표</CardTitle>
      </CardHeader>
      <CardContent>
        {loading && <Skeleton className="h-40 w-full" />}
        {error && <p className="text-sm text-muted-foreground">재무 데이터를 불러오지 못했습니다.</p>}
        {data && (
          <>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
              {rows.map(([k, v]) => (
                <div key={k} className="flex justify-between gap-2">
                  <dt className="text-muted-foreground">{k}</dt>
                  <dd className="tabular-nums">{v}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-3 text-[11px] text-muted-foreground">
              출처: {data.source}
              {data.asOf ? ` · 기준 ${data.asOf}` : ""}
              {data.sector ? ` · ${data.sector}` : ""}
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}
