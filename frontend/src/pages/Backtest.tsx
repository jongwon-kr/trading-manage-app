import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Loader2, Play, Search } from "lucide-react";
import type { SeriesMarker, Time, UTCTimestamp } from "lightweight-charts";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EquityChart } from "@/components/chart/EquityChart";
import { PriceChart } from "@/components/chart/PriceChart";
import { DEFAULT_INDICATORS } from "@/components/chart/indicator-settings";
import { StrategyWarnings } from "@/components/analysis/StrategyReport";
import { SymbolSearchDialog } from "@/components/market/SymbolSearchDialog";
import { StrategyPresetSelect } from "@/components/strategy/StrategyPresetSelect";
import { useSelectedPreset } from "@/hooks/useSelectedPreset";
import { useGetCandlesQuery, useGetSymbolQuery } from "@/api/market.api";
import { useRequestBacktestMutation } from "@/api/strategy.api";
import { useAnalysisJob } from "@/hooks/useAnalysisJob";
import { saveBacktest } from "@/lib/backtest-history";
import { chartPalette } from "@/lib/chart-theme";
import { changeColorClass, formatMoney, formatNumber, formatPercent } from "@/lib/format";
import { marketSlug, parseMarketParam, symbolPath } from "@/lib/market";
import type { BacktestMetrics, BacktestResult } from "@/types/strategy.types";

const EXIT_LABELS = { SIGNAL: "신호", STOP: "손절", TARGET: "목표", END: "기간 종료" } as const;

const isoDate = (d: Date) => d.toISOString().slice(0, 10);

function MetricsTable({ strategy, hold, base, strategyLabel = "전략" }: {
  strategy: BacktestMetrics; hold: BacktestMetrics; base?: BacktestMetrics; strategyLabel?: string;
}) {
  const rows: [string, (m: BacktestMetrics) => string, (m: BacktestMetrics) => number | null][] = [
    ["총 수익률", (m) => formatPercent(m.totalReturn, 1), (m) => m.totalReturn],
    ["연환산 수익률(CAGR)", (m) => formatPercent(m.cagr, 1), (m) => m.cagr],
    ["최대 낙폭(MDD)", (m) => formatPercent(m.mdd, 1), () => null],
    ["샤프 지수", (m) => formatNumber(m.sharpe, 2), () => null],
    ["거래 수", (m) => (m.trades ? String(m.trades) : "-"), () => null],
    ["승률", (m) => formatPercent(m.winRate, 1, false), () => null],
    ["손익비(PF)", (m) => formatNumber(m.profitFactor, 2), () => null],
    ["평균 수익 / 손실", (m) => (m.trades ? `${formatPercent(m.avgWin, 1)} / ${formatPercent(m.avgLoss, 1)}` : "-"), () => null],
    ["평균 보유 봉 수", (m) => formatNumber(m.avgHoldingBars, 1), () => null],
    ["보유 비중(노출)", (m) => formatPercent(m.exposure ?? 1, 0, false), () => null],
  ];
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>지표</TableHead>
          <TableHead className="whitespace-nowrap text-right">{strategyLabel}</TableHead>
          {base && <TableHead className="whitespace-nowrap text-right">기본 모델</TableHead>}
          <TableHead className="whitespace-nowrap text-right">단순 보유</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map(([label, fmt, colored]) => (
          <TableRow key={label}>
            <TableCell className="text-muted-foreground">{label}</TableCell>
            <TableCell className={`text-right tabular-nums ${colored(strategy) != null ? changeColorClass(colored(strategy)) : ""}`}>
              {fmt(strategy)}
            </TableCell>
            {base && (
              <TableCell className={`text-right tabular-nums ${colored(base) != null ? changeColorClass(colored(base)) : ""}`}>
                {fmt(base)}
              </TableCell>
            )}
            <TableCell className={`text-right tabular-nums ${colored(hold) != null ? changeColorClass(colored(hold)) : ""}`}>
              {label === "거래 수" || label.startsWith("승률") || label.startsWith("손익비") || label.startsWith("평균") ? "-" : fmt(hold)}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function BacktestResultView({ result, baseline }: { result: BacktestResult; baseline?: BacktestResult }) {
  const { data: candles } = useGetCandlesQuery({ market: result.market, symbol: result.symbol, interval: "1d", limit: 2000 });
  const c = chartPalette(false);
  const fromTs = Date.parse(result.from) / 1000;
  const periodCandles = useMemo(() => candles?.candles.filter((k) => k.time >= fromTs) ?? [], [candles, fromTs]);
  const markers = useMemo<SeriesMarker<Time>[]>(() => {
    const ts = (d: string) => (Date.parse(d) / 1000) as UTCTimestamp;
    return result.trades
      .flatMap((t) => [
        { time: ts(t.entryTime), position: "belowBar" as const, shape: "arrowUp" as const, color: c.up, text: "매수" },
        { time: ts(t.exitTime), position: "aboveBar" as const, shape: "arrowDown" as const, color: c.down,
          text: EXIT_LABELS[t.exitReason] },
      ])
      .sort((a, b) => (a.time as number) - (b.time as number));
  }, [result.trades, c.up, c.down]);
  const m = result.metrics;
  const label = result.config && !result.config.isDefault ? result.config.name ?? "사용자 설정" : "기본 모델";

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-4">
        {[
          ["총 수익률", formatPercent(m.totalReturn, 1), m.totalReturn],
          ["CAGR", formatPercent(m.cagr, 1), m.cagr],
          ["최대 낙폭", formatPercent(m.mdd, 1), null],
          baseline
            ? ["기본 모델 대비", formatPercent(m.totalReturn - baseline.metrics.totalReturn, 1),
               m.totalReturn - baseline.metrics.totalReturn]
            : ["단순 보유 대비", formatPercent(m.totalReturn - result.benchmarkMetrics.totalReturn, 1),
               m.totalReturn - result.benchmarkMetrics.totalReturn],
        ].map(([label, value, color]) => (
          <Card key={label as string}>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">{label}</p>
              <p className={`text-2xl font-semibold tabular-nums ${color != null ? changeColorClass(color as number) : ""}`}>
                {value}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
      <StrategyWarnings warnings={result.warnings} />

      <div className="grid gap-4 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader className="pb-1">
            <CardTitle className="text-base">자산 곡선</CardTitle>
            <p className="text-xs text-muted-foreground">
              {result.name} · {result.from} ~ {result.to} · 초기 자본 {formatMoney(result.params.initialCapital, result.market)}
              {" "}· 전략: {label}
            </p>
          </CardHeader>
          <CardContent>
            <EquityChart points={result.equityCurve} compare={baseline?.equityCurve} />
          </CardContent>
        </Card>
        <Card className="lg:col-span-2">
          <CardHeader className="pb-1">
            <CardTitle className="text-base">성과 지표</CardTitle>
          </CardHeader>
          <CardContent className="px-2">
            <MetricsTable strategy={m} hold={result.benchmarkMetrics} base={baseline?.metrics}
                          strategyLabel={baseline ? label : "전략"} />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-1">
          <CardTitle className="text-base">매매 시점</CardTitle>
        </CardHeader>
        <CardContent>
          {periodCandles.length ? (
            <PriceChart candles={periodCandles} market={result.market} interval="1d" dataKey={`bt:${result.requestId}`}
                        indicators={{ ...DEFAULT_INDICATORS, rsi: false }} markers={markers} height={380} />
          ) : (
            <Skeleton className="h-[380px] w-full" />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-1">
          <CardTitle className="text-base">거래 내역 ({result.trades.length})</CardTitle>
        </CardHeader>
        <CardContent className="px-2">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>진입일</TableHead>
                <TableHead className="text-right">진입가</TableHead>
                <TableHead>청산일</TableHead>
                <TableHead className="text-right">청산가</TableHead>
                <TableHead>사유</TableHead>
                <TableHead className="text-right">수익률</TableHead>
                <TableHead className="text-right">보유(봉)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {[...result.trades].reverse().map((t) => (
                <TableRow key={`${t.entryTime}-${t.exitTime}`}>
                  <TableCell>{t.entryTime}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatMoney(t.entryPrice, result.market)}</TableCell>
                  <TableCell>{t.exitTime}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatMoney(t.exitPrice, result.market)}</TableCell>
                  <TableCell>{EXIT_LABELS[t.exitReason]}</TableCell>
                  <TableCell className={`text-right tabular-nums ${changeColorClass(t.returnPct)}`}>
                    {formatPercent(t.returnPct, 2)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{t.bars}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <p className="px-2 pt-3 text-[11px] text-muted-foreground">
            과거 성과는 미래 수익을 보장하지 않습니다. 비용: 수수료 {result.params.feeBps}bp · 세금 {result.params.taxBps}bp ·
            슬리피지 {result.params.slippageBps}bp · 데이터 {result.dataSources.candles}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

export function Backtest() {
  const [params, setParams] = useSearchParams();
  const market = parseMarketParam(params.get("market") ?? undefined);
  const symbol = params.get("symbol");
  const [pickerOpen, setPickerOpen] = useState(false);
  const today = new Date();
  const [from, setFrom] = useState(isoDate(new Date(today.getFullYear() - 3, today.getMonth(), today.getDate())));
  const [to, setTo] = useState(isoDate(today));
  const [buy, setBuy] = useState("60");
  const [sell, setSell] = useState("45");
  const [stopAtr, setStopAtr] = useState("");
  const [takeProfitR, setTakeProfitR] = useState("3");
  const [capital, setCapital] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [requestId, setRequestId] = useState<string | null>(null);
  const [baseRequestId, setBaseRequestId] = useState<string | null>(null);
  const preset = useSelectedPreset();
  const [compare, setCompare] = useState(params.get("compare") === "1");
  // 전략 편집기에서 넘어온 경우 (?preset=ID&compare=1) 그 전략을 선택
  const urlPreset = params.get("preset");
  useEffect(() => {
    if (urlPreset) preset.setValue(Number(urlPreset));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- URL 값이 바뀔 때만
  }, [urlPreset]);

  const { data: symbolInfo } = useGetSymbolQuery(
    { market: market ?? "KR_STOCK", code: symbol ?? "" },
    { skip: !market || !symbol }
  );
  const [request, { isLoading: requesting }] = useRequestBacktestMutation();
  const job = useAnalysisJob<BacktestResult>(requestId, { timeoutMs: 180_000 });
  const baseJob = useAnalysisJob<BacktestResult>(baseRequestId, { timeoutMs: 180_000 });
  const comparing = compare && preset.presetId != null;
  // 완료된 결과를 기록 → 전략 공유 시 성과로 첨부
  const done = job.result;
  useEffect(() => {
    if (!done?.config || !requestId) return;
    saveBacktest({ requestId, configHash: done.config.hash, presetName: done.config.name, symbol: done.symbol,
      name: done.name, from: done.from, to: done.to, totalReturn: done.metrics.totalReturn, mdd: done.metrics.mdd, at: Date.now() });
  }, [done, requestId]);
  const busy = requesting || job.status === "PROCESSING" || (comparing && baseJob.status === "PROCESSING");

  const submit = async () => {
    if (!market || !symbol) return;
    const num = (v: string) => (v.trim() === "" ? undefined : Number(v.replace(/,/g, "")));
    const body = {
      market, symbol, from, to,
      buyThreshold: num(buy), sellThreshold: num(sell), stopAtr: num(stopAtr), takeProfitR: num(takeProfitR),
      initialCapital: num(capital),
    };
    if (Object.values(body).some((v) => typeof v === "number" && Number.isNaN(v))) {
      setFormError("숫자 입력값을 확인하세요.");
      return;
    }
    if ((body.buyThreshold ?? 60) <= (body.sellThreshold ?? 45)) {
      setFormError("진입 임계값은 청산 임계값보다 커야 합니다.");
      return;
    }
    if (from >= to) {
      setFormError("시작일은 종료일보다 이전이어야 합니다.");
      return;
    }
    setFormError(null);
    try {
      // 비교: 같은 조건으로 기본 모델도 함께 실행
      const [res, base] = await Promise.all([
        request({ ...body, ...(preset.presetId != null ? { presetId: preset.presetId } : {}) }).unwrap(),
        comparing ? request(body).unwrap() : Promise.resolve(null),
      ]);
      setRequestId(res.requestId);
      setBaseRequestId(base?.requestId ?? null);
    } catch (e) {
      setFormError((e as { message?: string }).message ?? "백테스트 요청에 실패했습니다.");
    }
  };

  const field = (id: string, label: string, value: string, set: (v: string) => void, props: object = {}) => (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} value={value} onChange={(e) => set(e.target.value)} className="w-32" {...props} />
    </div>
  );

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">전략 백테스트</CardTitle>
          <p className="text-sm text-muted-foreground">
            전략 점수가 진입 임계값 이상이면 다음 날 시가에 매수하고, 청산 임계값 이하·손절(ATR 배수)·목표(R 배수)에서 매도합니다.
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
            <Label>분석 방법</Label>
            <StrategyPresetSelect value={preset.value} onChange={preset.setValue} />
          </div>
          {preset.presetId != null && (
            <label className="flex h-9 items-center gap-2 text-sm">
              <Checkbox checked={compare} onCheckedChange={(v) => setCompare(v === true)} />
              기본 모델과 비교
            </label>
          )}
          {field("from", "시작일", from, setFrom, { type: "date", className: "w-40" })}
          {field("to", "종료일", to, setTo, { type: "date", className: "w-40" })}
          {field("buy", "진입 점수 ≥", buy, setBuy, { inputMode: "decimal" })}
          {field("sell", "청산 점수 ≤", sell, setSell, { inputMode: "decimal" })}
          {field("stopAtr", "손절 ATR 배수", stopAtr, setStopAtr, { placeholder: market === "CRYPTO" ? "2.5" : "2.0" })}
          {field("tp", "목표 R 배수", takeProfitR, setTakeProfitR, { inputMode: "decimal" })}
          {field("capital", "초기 자본", capital, setCapital, {
            placeholder: market === "US_STOCK" ? "10000" : "10000000", className: "w-36",
          })}
          <Button onClick={submit} disabled={!market || !symbol || busy} className="gap-2">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
            백테스트 실행
          </Button>
          {market && symbol && (
            <Button asChild variant="link" className="px-0">
              <Link to={symbolPath(market, symbol)}>차트 상세 보기</Link>
            </Button>
          )}
        </CardContent>
        {formError && <p className="px-6 pb-4 text-sm text-destructive">{formError}</p>}
      </Card>

      {job.status === "PROCESSING" && (
        <Card>
          <CardContent className="space-y-2 p-6">
            <p className="text-sm text-muted-foreground">{job.message || "백테스트 대기 중…"}</p>
            <Progress value={(job.progress ?? 0.05) * 100} />
          </CardContent>
        </Card>
      )}
      {(job.status === "FAILED" || job.status === "TIMEOUT") && <p className="text-sm text-destructive">{job.error}</p>}
      {(baseJob.status === "FAILED" || baseJob.status === "TIMEOUT") && (
        <p className="text-sm text-destructive">기본 모델 비교 실패: {baseJob.error}</p>
      )}
      {job.result && (!baseRequestId || baseJob.status !== "PROCESSING") && (
        <BacktestResultView result={job.result} baseline={baseRequestId ? baseJob.result ?? undefined : undefined} />
      )}
      {job.status === "IDLE" && (
        <p className="py-10 text-center text-sm text-muted-foreground">종목과 기간을 정하고 백테스트를 실행하세요.</p>
      )}

      <SymbolSearchDialog
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        onSelect={(s) => setParams({ market: marketSlug(s.market), symbol: s.code })}
      />
    </div>
  );
}
