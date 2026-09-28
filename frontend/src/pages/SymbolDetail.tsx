import { useParams, useSearchParams } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ChartToolbar } from "@/components/chart/ChartToolbar";
import { PriceChart } from "@/components/chart/PriceChart";
import { DEFAULT_INDICATORS, type IndicatorSettings } from "@/components/chart/indicator-settings";
import { FundamentalsCard } from "@/components/market/FundamentalsCard";
import { QuoteHeader } from "@/components/market/QuoteHeader";
import {
  useGetCandlesQuery,
  useGetFundamentalsQuery,
  useGetOverviewQuery,
  useGetQuoteQuery,
  useGetSymbolQuery,
} from "@/api/market.api";
import { usePersistentState } from "@/hooks/usePersistentState";
import { isIntraday, parseMarketParam, SUPPORTED_INTERVALS } from "@/lib/market";
import { NotFound } from "./NotFound";
import type { Interval, MarketCode } from "@/types/market.types";

function SymbolDetailContent({ market, code }: { market: MarketCode; code: string }) {
  const [params, setParams] = useSearchParams();
  const intervals = SUPPORTED_INTERVALS[market];
  const requested = params.get("interval") as Interval | null;
  const interval: Interval = requested && intervals.includes(requested) ? requested : "1d";
  const [indicators, setIndicators] = usePersistentState<IndicatorSettings>("chart.indicators", DEFAULT_INDICATORS);

  const { data: overview } = useGetOverviewQuery();
  const open = market === "CRYPTO" || overview?.marketStatus[market] === "OPEN";
  const isStock = market !== "CRYPTO";

  const symbolQuery = useGetSymbolQuery({ market, code });
  const quoteQuery = useGetQuoteQuery(
    { market, symbol: code },
    { pollingInterval: market === "CRYPTO" ? 5_000 : open ? 20_000 : 0, skipPollingIfUnfocused: true }
  );
  const candleQuery = useGetCandlesQuery(
    { market, symbol: code, interval },
    {
      // 분봉은 짧게, 일봉 이상은 장중에만 1분 주기로 갱신
      pollingInterval: !open ? 0 : isIntraday(interval) ? (market === "CRYPTO" ? 10_000 : 30_000) : 60_000,
      skipPollingIfUnfocused: true,
    }
  );
  const fundamentalsQuery = useGetFundamentalsQuery({ market, symbol: code }, { skip: !isStock });

  if (symbolQuery.error && "status" in symbolQuery.error && symbolQuery.error.status === 404) {
    return <NotFound message={`종목을 찾을 수 없습니다: ${code}`} />;
  }
  const symbol = symbolQuery.data;
  const series = candleQuery.data;

  return (
    <div className="space-y-4">
      {symbol ? <QuoteHeader symbol={symbol} quote={quoteQuery.data} /> : <Skeleton className="h-16 w-full" />}

      <div className="grid gap-4 lg:grid-cols-12">
        <Card className={isStock ? "lg:col-span-8" : "lg:col-span-12"}>
          <CardContent className="space-y-3 p-4">
            <ChartToolbar
              intervals={intervals}
              interval={interval}
              onIntervalChange={(iv) => setParams({ interval: iv }, { replace: true })}
              indicators={indicators}
              onIndicatorsChange={setIndicators}
            />
            {candleQuery.isError ? (
              <div className="flex h-[520px] items-center justify-center text-sm text-muted-foreground">
                {(candleQuery.error as { message?: string })?.message ?? "차트 데이터를 불러오지 못했습니다."}
              </div>
            ) : series ? (
              <PriceChart
                candles={series.candles}
                market={market}
                interval={interval}
                dataKey={`${market}:${code}:${interval}`}
                precision={symbol?.pricePrecision}
                indicators={indicators}
              />
            ) : (
              <Skeleton className="h-[520px] w-full" />
            )}
            {series && (
              <p className="text-[11px] text-muted-foreground">
                데이터: {series.source}
                {series.delayed ? " · 지연 시세" : ""} · 봉 {series.candles.length}개
              </p>
            )}
          </CardContent>
        </Card>

        {isStock && (
          <div className="space-y-4 lg:col-span-4">
            <FundamentalsCard
              data={fundamentalsQuery.data}
              loading={fundamentalsQuery.isLoading}
              error={fundamentalsQuery.isError}
            />
          </div>
        )}
      </div>
    </div>
  );
}

export function SymbolDetail() {
  const { market: slug, symbol } = useParams();
  const market = parseMarketParam(slug);
  if (!market || !symbol) return <NotFound />;
  // key: 종목이 바뀌면 차트 상태를 새로 만든다
  return <SymbolDetailContent key={`${market}:${symbol}`} market={market} code={decodeURIComponent(symbol)} />;
}
