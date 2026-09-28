import { useCallback, useMemo } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ChartToolbar } from "@/components/chart/ChartToolbar";
import { PriceChart, type LiveTick } from "@/components/chart/PriceChart";
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
import { subscribeTicks, useOnRealtimeReconnect, useRealtimeStatus, useRealtimeSymbols, useTick } from "@/hooks/useRealtime";
import { isIntraday, parseMarketParam, quoteKey, SUPPORTED_INTERVALS } from "@/lib/market";
import { NotFound } from "./NotFound";
import type { Interval, MarketCode } from "@/types/market.types";

function SymbolDetailContent({ market, code }: { market: MarketCode; code: string }) {
  const [params, setParams] = useSearchParams();
  const intervals = SUPPORTED_INTERVALS[market];
  const requested = params.get("interval") as Interval | null;
  const interval: Interval = requested && intervals.includes(requested) ? requested : "1d";
  const [indicators, setIndicators] = usePersistentState<IndicatorSettings>("chart.indicators", DEFAULT_INDICATORS);

  const { data: overview } = useGetOverviewQuery();
  const isStock = market !== "CRYPTO";
  const open = !isStock || overview?.marketStatus[market] === "OPEN";

  // 코인은 SSE 실시간, 주식은 장중 주기 폴링
  const key = quoteKey(market, code);
  useRealtimeSymbols(isStock ? [] : [key]);
  const tick = useTick(isStock ? undefined : key);
  const realtimeOpen = useRealtimeStatus() === "open";
  const live = !isStock && realtimeOpen;

  const symbolQuery = useGetSymbolQuery({ market, code });
  const quoteQuery = useGetQuoteQuery(
    { market, symbol: code },
    { pollingInterval: live ? 0 : !isStock ? 5_000 : open ? 20_000 : 0, skipPollingIfUnfocused: true }
  );
  const candleQuery = useGetCandlesQuery(
    { market, symbol: code, interval },
    {
      // 실시간 봉이 흐르는 동안에도 1분마다 서버 캔들로 보정(보조지표 재계산 포함)
      pollingInterval: !open ? 0 : isIntraday(interval) ? (isStock ? 30_000 : 60_000) : 60_000,
      skipPollingIfUnfocused: true,
    }
  );
  // 재연결되면 끊긴 동안의 봉을 다시 받는다
  const { refetch: refetchCandles } = candleQuery;
  useOnRealtimeReconnect(useCallback(() => void refetchCandles(), [refetchCandles]));

  // 주·월봉은 봉 경계가 거래소 기준과 달라 실시간 반영하지 않는다
  const liveBars = !isStock && !["1w", "1M"].includes(interval);
  const chartTicks = useMemo(
    () =>
      liveBars
        ? (onTick: (t: LiveTick) => void) =>
            subscribeTicks(key, (q) => onTick({ price: q.price, ts: q.ts, accTradeVolume: q.accTradeVolume }))
        : undefined,
    [liveBars, key]
  );
  const quote = tick ? { ...tick, name: tick.name ?? quoteQuery.data?.name ?? null } : quoteQuery.data;
  const fundamentalsQuery = useGetFundamentalsQuery({ market, symbol: code }, { skip: !isStock });

  if (symbolQuery.error && "status" in symbolQuery.error && symbolQuery.error.status === 404) {
    return <NotFound message={`종목을 찾을 수 없습니다: ${code}`} />;
  }
  const symbol = symbolQuery.data;
  const series = candleQuery.data;

  return (
    <div className="space-y-4">
      {symbol ? <QuoteHeader symbol={symbol} quote={quote} /> : <Skeleton className="h-16 w-full" />}

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
                subscribeTicks={chartTicks}
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
