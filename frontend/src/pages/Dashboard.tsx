import { useEffect } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, BookOpen, FlaskConical, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { IndexCard } from "@/components/market/IndexCard";
import { WatchlistTable } from "@/components/market/WatchlistTable";
import { useGetBriefingQuery, useGetOverviewQuery } from "@/api/market.api";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { fetchJournalStats } from "@/store/slices/tradingSlice";
import { changeColorClass, formatNumber } from "@/lib/format";
import { MARKET_LABELS, MARKETS, marketSlug } from "@/lib/market";
import type { MarketCode } from "@/types/market.types";

// 대시보드에 보여줄 대표 지수 (overview.indices 의 code)
const DASHBOARD_INDICES = ["KOSPI", "KOSDAQ", "SPX", "IXIC", "KRW-BTC", "USDKRW"];

function JournalStatsCard() {
  const dispatch = useAppDispatch();
  const stats = useAppSelector((s) => s.trading.journalStats);
  useEffect(() => {
    dispatch(fetchJournalStats());
  }, [dispatch]);

  const rows: [string, string, number | null][] = stats
    ? [
        ["총 거래", `${stats.totalTrades}건`, null],
        ["진행 중", `${stats.openTrades}건`, null],
        ["승률", `${formatNumber(stats.winRate, 1)}%`, null],
        ["누적 실현손익", formatNumber(stats.totalPnL, 0), stats.totalPnL],
      ]
    : [];
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-base">매매 일지 요약</CardTitle>
        <Button asChild variant="ghost" size="sm" className="gap-1">
          <Link to="/journal">
            일지 <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </CardHeader>
      <CardContent>
        {stats ? (
          <dl className="grid grid-cols-2 gap-3 text-sm">
            {rows.map(([k, v, c]) => (
              <div key={k}>
                <dt className="text-muted-foreground">{k}</dt>
                <dd className={`text-lg font-semibold tabular-nums ${c != null ? changeColorClass(c) : ""}`}>{v}</dd>
              </div>
            ))}
          </dl>
        ) : (
          <Skeleton className="h-24 w-full" />
        )}
      </CardContent>
    </Card>
  );
}

function BriefingHeadline({ market }: { market: MarketCode }) {
  const { data, isLoading } = useGetBriefingQuery({ market }, { pollingInterval: 600_000, skipPollingIfUnfocused: true });
  return (
    <Link to={`/trends?market=${marketSlug(market)}`} className="block rounded-md p-2 hover:bg-muted">
      <p className="text-xs font-medium text-muted-foreground">{MARKET_LABELS[market]}</p>
      {isLoading ? <Skeleton className="mt-1 h-5 w-full" /> : <p className="text-sm leading-relaxed">{data?.headline ?? "브리핑 없음"}</p>}
    </Link>
  );
}

/** 오늘의 브리핑 헤드라인 (시장 동향 페이지로 연결) */
function BriefingSummaryCard() {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1">
        <CardTitle className="text-base">오늘의 브리핑</CardTitle>
        <Button asChild variant="ghost" size="sm" className="gap-1">
          <Link to="/trends">시장 동향 <ArrowRight className="h-4 w-4" /></Link>
        </Button>
      </CardHeader>
      <CardContent className="grid gap-1 px-4 md:grid-cols-3">
        {MARKETS.map((m) => <BriefingHeadline key={m} market={m} />)}
      </CardContent>
    </Card>
  );
}

export function Dashboard() {
  const { data: overview, isLoading } = useGetOverviewQuery(undefined, {
    pollingInterval: 60_000,
    skipPollingIfUnfocused: true,
  });
  const indices = (overview?.indices ?? []).filter((q) => DASHBOARD_INDICES.includes(q.code));

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        {isLoading && Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-[104px]" />)}
        {indices.map((q) => <IndexCard key={q.key} quote={q} />)}
      </div>

      <BriefingSummaryCard />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-base">관심종목</CardTitle>
            <Button asChild variant="ghost" size="sm" className="gap-1">
              <Link to="/watchlist">
                전체 보기 <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="px-2">
            <WatchlistTable limit={10} readOnly />
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">시장 국면</CardTitle>
              <p className="text-xs text-muted-foreground">지수 추세·변동성·시장 폭/심리를 종합한 0~100 점수</p>
            </CardHeader>
            <CardContent className="space-y-2">
              {MARKETS.map((m) => {
                const r = overview?.regime?.[m];
                return (
                  <div key={m} className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{MARKET_LABELS[m]}</span>
                    {r ? (
                      <span className={`font-semibold tabular-nums ${changeColorClass(r.score - 50)}`}>
                        {r.score.toFixed(0)} <span className="font-normal text-muted-foreground">{r.label}</span>
                      </span>
                    ) : (
                      <Skeleton className="h-5 w-20" />
                    )}
                  </div>
                );
              })}
            </CardContent>
          </Card>
          <JournalStatsCard />
          <Card>
            <CardContent className="grid grid-cols-3 gap-2 p-3">
              {[
                ["/analysis", "전략 분석", Target],
                ["/backtest", "백테스트", FlaskConical],
                ["/journal", "매매 일지", BookOpen],
              ].map(([to, label, Icon]) => {
                const I = Icon as typeof Target;
                return (
                  <Button key={to as string} asChild variant="outline" className="h-16 flex-col gap-1">
                    <Link to={to as string}>
                      <I className="h-4 w-4" />
                      <span className="text-xs">{label as string}</span>
                    </Link>
                  </Button>
                );
              })}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
