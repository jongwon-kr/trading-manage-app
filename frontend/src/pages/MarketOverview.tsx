import { useSearchParams } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { IndexCard } from "@/components/market/IndexCard";
import { MoversTable } from "@/components/market/MoversTable";
import { useGetMoversQuery, useGetOverviewQuery } from "@/api/market.api";
import { MARKET_LABELS, MARKETS, marketSlug, parseMarketParam } from "@/lib/market";
import { formatPercent } from "@/lib/format";
import type { MarketCode, MarketOverview as Overview } from "@/types/market.types";

function MarketMovers({ market, open }: { market: MarketCode; open: boolean }) {
  // 장중에만 주기 갱신 (코인은 항상)
  const { data, isLoading } = useGetMoversQuery(
    { market, limit: 10 },
    { pollingInterval: market === "CRYPTO" ? 30_000 : open ? 60_000 : 0, skipPollingIfUnfocused: true }
  );
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <MoversTable title="상승률 상위" quotes={data?.gainers} loading={isLoading} />
      <MoversTable title="하락률 상위" quotes={data?.losers} loading={isLoading} />
      <MoversTable title={market === "US_STOCK" ? "거래량 상위" : "거래대금 상위"} quotes={data?.mostActive}
                   loading={isLoading} showValue={market !== "US_STOCK"} />
    </div>
  );
}

function SentimentBar({ data }: { data: Overview }) {
  const fg = data.fearGreed;
  return (
    <Card>
      <CardContent className="flex flex-wrap items-center gap-x-8 gap-y-3 p-4 text-sm">
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">장 운영</span>
          {MARKETS.map((m) => (
            <Badge key={m} variant={data.marketStatus[m] === "OPEN" ? "default" : "secondary"}>
              {MARKET_LABELS[m]} {data.marketStatus[m] === "OPEN" ? "개장" : "마감"}
            </Badge>
          ))}
        </div>
        {fg && (
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">코인 공포·탐욕 지수</span>
            <span className="font-semibold tabular-nums">{fg.value}</span>
            <span className="text-muted-foreground">({fg.label})</span>
          </div>
        )}
        {data.btcDominance != null && (
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">BTC 도미넌스</span>
            <span className="font-semibold tabular-nums">{formatPercent(data.btcDominance, 1, false)}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function MarketOverview() {
  const [params, setParams] = useSearchParams();
  const tab = parseMarketParam(params.get("tab") ?? undefined) ?? "KR_STOCK";
  const { data, isLoading, isError } = useGetOverviewQuery(undefined, {
    pollingInterval: 60_000,
    skipPollingIfUnfocused: true,
  });

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {isLoading && Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-[104px]" />)}
        {data?.indices.map((q) => <IndexCard key={q.key} quote={q} />)}
      </div>
      {isError && <p className="text-sm text-destructive">시장 개요를 불러오지 못했습니다.</p>}
      {data && <SentimentBar data={data} />}

      <Tabs value={tab} onValueChange={(v) => setParams({ tab: marketSlug(v as MarketCode) }, { replace: true })}>
        <TabsList>
          {MARKETS.map((m) => (
            <TabsTrigger key={m} value={m}>
              {MARKET_LABELS[m]}
            </TabsTrigger>
          ))}
        </TabsList>
        {MARKETS.map((m) => (
          <TabsContent key={m} value={m} className="mt-4">
            <MarketMovers market={m} open={data?.marketStatus[m] === "OPEN"} />
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
