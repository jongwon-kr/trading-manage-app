import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Loader2, Play, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { PriceChart, type PriceLineSpec } from "@/components/chart/PriceChart";
import { DEFAULT_INDICATORS } from "@/components/chart/indicator-settings";
import { StrategyReport } from "@/components/analysis/StrategyReport";
import { SymbolSearchDialog } from "@/components/market/SymbolSearchDialog";
import { useGetCandlesQuery, useGetOverviewQuery, useGetSymbolQuery } from "@/api/market.api";
import { useStrategyJob } from "@/hooks/useStrategyJob";
import { LINE_COLORS } from "@/lib/chart-theme";
import { changeColorClass } from "@/lib/format";
import { MARKET_LABELS, MARKETS, marketSlug, parseMarketParam, symbolPath } from "@/lib/market";

const RISK_OPTIONS = ["0.005", "0.01", "0.02"];

function RegimeCards() {
  const { data } = useGetOverviewQuery(undefined, { pollingInterval: 300_000 });
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {MARKETS.map((m) => {
        const r = data?.regime?.[m];
        return (
          <Card key={m}>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">{MARKET_LABELS[m]} 시장 국면</p>
              {r ? (
                <p className={`text-2xl font-semibold tabular-nums ${changeColorClass(r.score - 50)}`}>
                  {r.score.toFixed(0)}
                  <span className="ml-2 text-sm font-normal text-muted-foreground">{r.label}</span>
                </p>
              ) : (
                <Skeleton className="mt-1 h-8 w-24" />
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

export function Analysis() {
  const [params, setParams] = useSearchParams();
  const market = parseMarketParam(params.get("market") ?? undefined);
  const symbol = params.get("symbol");
  const [pickerOpen, setPickerOpen] = useState(false);
  const [equity, setEquity] = useState("");
  const [riskPct, setRiskPct] = useState("0.01");

  const { data: symbolInfo } = useGetSymbolQuery(
    market && symbol ? { market, code: symbol } : { market: "KR_STOCK", code: "" },
    { skip: !market || !symbol }
  );
  const { data: candles } = useGetCandlesQuery(
    { market: market ?? "KR_STOCK", symbol: symbol ?? "", interval: "1d", limit: 250 },
    { skip: !market || !symbol }
  );
  const { run, busy, job } = useStrategyJob(market, symbol, { autoRun: true });
  const risk = job.result?.risk;
  const priceLines = useMemo<PriceLineSpec[]>(
    () =>
      risk
        ? [
            { price: risk.entry, title: "진입", color: LINE_COLORS.entry },
            { price: risk.stopLoss, title: "손절", color: LINE_COLORS.stop },
            { price: risk.takeProfit1, title: "목표1", color: LINE_COLORS.target },
            { price: risk.takeProfit2, title: "목표2", color: LINE_COLORS.target },
          ]
        : [],
    [risk]
  );

  const runWithOptions = () => {
    const accountEquity = Number(equity.replace(/,/g, ""));
    void run({ riskPct: Number(riskPct), ...(accountEquity > 0 ? { accountEquity } : {}) });
  };

  return (
    <div className="space-y-6">
      <RegimeCards />

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">종목 전략 분석</CardTitle>
          <p className="text-sm text-muted-foreground">
            기술적(추세·모멘텀·변동성·거래량), 기본적(밸류·수익성·성장·건전성·배당), 시장 국면(지수 추세·변동성·심리)을 0~100 점수로
            종합합니다.
          </p>
        </CardHeader>
        <CardContent className="flex flex-wrap items-end gap-4">
          <div className="space-y-1.5">
            <Label>종목</Label>
            <Button variant="outline" className="min-w-[220px] justify-start gap-2" onClick={() => setPickerOpen(true)}>
              <Search className="h-4 w-4" />
              {symbolInfo ? `${symbolInfo.name} (${symbolInfo.code})` : "종목 선택"}
            </Button>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="equity">계좌 금액 (선택)</Label>
            <Input id="equity" inputMode="numeric" placeholder="예: 10000000" value={equity}
                   onChange={(e) => setEquity(e.target.value)} className="w-44" />
          </div>
          <div className="space-y-1.5">
            <Label>1회 위험 비율</Label>
            <Select value={riskPct} onValueChange={setRiskPct}>
              <SelectTrigger className="w-28">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {RISK_OPTIONS.map((v) => (
                  <SelectItem key={v} value={v}>
                    {(Number(v) * 100).toFixed(1)}%
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={runWithOptions} disabled={!market || !symbol || busy} className="gap-2">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
            분석 실행
          </Button>
          {market && symbol && (
            <Button asChild variant="link" className="px-0">
              <Link to={symbolPath(market, symbol)}>차트 상세 보기</Link>
            </Button>
          )}
        </CardContent>
      </Card>

      {!market || !symbol ? (
        <p className="py-10 text-center text-sm text-muted-foreground">분석할 종목을 선택하세요.</p>
      ) : (
        <>
          {job.status === "PROCESSING" && (
            <p className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> 지표를 계산하는 중…
            </p>
          )}
          {(job.status === "FAILED" || job.status === "TIMEOUT") && <p className="text-sm text-destructive">{job.error}</p>}
          {job.result && (
            <>
              <Card>
                <CardContent className="p-4">
                  {candles ? (
                    <PriceChart
                      candles={candles.candles}
                      market={market}
                      interval="1d"
                      dataKey={`${market}:${symbol}:analysis`}
                      precision={symbolInfo?.pricePrecision}
                      indicators={{ ...DEFAULT_INDICATORS, rsi: false }}
                      priceLines={priceLines}
                      height={360}
                    />
                  ) : (
                    <Skeleton className="h-[360px] w-full" />
                  )}
                </CardContent>
              </Card>
              <StrategyReport result={job.result} />
            </>
          )}
        </>
      )}

      <SymbolSearchDialog
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        onSelect={(s) => setParams({ market: marketSlug(s.market), symbol: s.code })}
      />
    </div>
  );
}
