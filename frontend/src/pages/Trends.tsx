import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Line, LineChart, ResponsiveContainer, Tooltip as ChartTooltip, YAxis } from "recharts";
import { useTheme } from "next-themes";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StrategyWarnings } from "@/components/analysis/StrategyReport";
import { FactorExplainPanel } from "@/components/analysis/FactorExplainPanel";
import { BriefingCard } from "@/components/trends/BriefingCard";
import { GroupStocksDialog, type GroupRef } from "@/components/trends/GroupStocksDialog";
import { SectorRotationChart, SectorTable } from "@/components/trends/SectorRotation";
import { useGetBriefingQuery, useGetTrendsQuery } from "@/api/market.api";
import { chartPalette, LINE_COLORS } from "@/lib/chart-theme";
import { changeColorClass, formatCompact, formatPercent } from "@/lib/format";
import { MARKET_LABELS, MARKETS, marketSlug, parseMarketParam } from "@/lib/market";
import type { MarketCode } from "@/types/market.types";
import type { FactorResult } from "@/types/strategy.types";
import type { GroupTrend, MarketTrends, Ranked } from "@/types/trends.types";

function GroupList({ title, ranked, onSelect }: { title: string; ranked: Ranked<GroupTrend>; onSelect: (g: GroupTrend) => void }) {
  const row = (g: GroupTrend) => (
    <TableRow key={g.no} className="cursor-pointer" onClick={() => onSelect(g)}>
      <TableCell className="max-w-[180px] truncate">{g.name}</TableCell>
      <TableCell className={`text-right tabular-nums ${changeColorClass(g.changeRate)}`}>{formatPercent(g.changeRate)}</TableCell>
      <TableCell className="whitespace-nowrap text-right text-xs tabular-nums text-muted-foreground">
        <span className="text-price-up">{g.rise}</span> / <span className="text-price-down">{g.fall}</span> / {g.total}
      </TableCell>
    </TableRow>
  );
  return (
    <Card>
      <CardHeader className="pb-1">
        <CardTitle className="text-base">{title}</CardTitle>
        <p className="text-xs text-muted-foreground">오늘 등락률 (구성 종목 5개 이상 {ranked.count}개 중) · 상승/하락/전체 종목 수</p>
      </CardHeader>
      <CardContent className="grid gap-4 px-2 lg:grid-cols-2">
        {([["상승 상위", ranked.top], ["하락 상위", ranked.bottom]] as const).map(([label, rows]) => (
          <div key={label}>
            <p className="px-2 pb-1 text-xs font-medium text-muted-foreground">{label}</p>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>이름</TableHead>
                  <TableHead className="text-right">등락률</TableHead>
                  <TableHead className="whitespace-nowrap text-right">상승/하락/전체</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>{rows.map(row)}</TableBody>
            </Table>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function CryptoTrends({ t }: { t: MarketTrends }) {
  const { resolvedTheme } = useTheme();
  const c = chartPalette(resolvedTheme === "dark");
  const fg = [...(t.fearGreedHistory ?? [])].reverse();
  const cats = t.categories;
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">상승 종목 비율 (업비트 KRW, 24시간)</p>
            <p className="text-2xl font-semibold tabular-nums">{formatPercent(t.breadth, 1, false)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">거래대금 상위 {t.concentration?.topN ?? 10}개 비중</p>
            <p className="text-2xl font-semibold tabular-nums">{formatPercent(t.concentration?.share, 1, false)}</p>
            <p className="text-xs text-muted-foreground">전체 {formatCompact(t.concentration?.total)}원 · 높을수록 쏠림</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">BTC 도미넌스 · 공포탐욕지수(30일)</p>
            <div className="flex items-center gap-3">
              <p className="text-2xl font-semibold tabular-nums">{formatPercent(t.btcDominance, 1, false)}</p>
              <div className="h-10 flex-1">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={fg}>
                    <YAxis domain={[0, 100]} hide />
                    <ChartTooltip contentStyle={{ background: c.background, border: `1px solid ${c.border}`, fontSize: 11 }}
                                  formatter={(v: number) => [v, "공포탐욕"]} labelFormatter={() => ""} />
                    <Line dataKey="value" stroke={LINE_COLORS.signal} dot={false} strokeWidth={2} isAnimationActive={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <span className="tabular-nums">{fg[fg.length - 1]?.value ?? "-"}</span>
            </div>
          </CardContent>
        </Card>
      </div>
      {cats && (
        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="text-base">코인 카테고리 (24시간)</CardTitle>
            <p className="text-xs text-muted-foreground">
              CoinGecko 글로벌 시가총액 기준(USD) · 시총 10억 달러 이상 {cats.count}개 · 업비트 원화 시세와 다를 수 있습니다
            </p>
          </CardHeader>
          <CardContent className="grid gap-4 px-2 lg:grid-cols-2">
            {([["강한 카테고리", cats.top], ["약한 카테고리", cats.bottom]] as const).map(([label, rows]) => (
              <Table key={label}>
                <TableHeader>
                  <TableRow>
                    <TableHead>{label}</TableHead>
                    <TableHead className="text-right">시총 변화</TableHead>
                    <TableHead className="text-right">시가총액</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="flex items-center gap-2">
                        <span className="flex -space-x-1">
                          {r.topCoins.slice(0, 3).map((src) => <img key={src} src={src} alt="" className="h-4 w-4 rounded-full" />)}
                        </span>
                        <span className="max-w-[200px] truncate">{r.name}</span>
                      </TableCell>
                      <TableCell className={`text-right tabular-nums ${changeColorClass(r.change24h)}`}>{formatPercent(r.change24h)}</TableCell>
                      <TableCell className="whitespace-nowrap text-right tabular-nums">{formatCompact(r.marketCap)} 달러</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function MarketTab({ market, onGroup }: { market: MarketCode; onGroup: (g: GroupRef) => void }) {
  const { data: t, isLoading, isError } = useGetTrendsQuery(market, { pollingInterval: 600_000 });
  if (isLoading) return <Skeleton className="h-[480px] w-full" />;
  if (isError || !t) return <p className="py-10 text-center text-sm text-muted-foreground">시장 동향을 불러오지 못했습니다.</p>;
  return (
    <div className="space-y-4">
      <StrategyWarnings warnings={t.warnings} />
      {t.sectors.length > 0 && (
        <div className="grid gap-4 xl:grid-cols-5">
          <Card className="xl:col-span-2">
            <CardHeader className="pb-1">
              <CardTitle className="text-base">섹터 로테이션</CardTitle>
              <p className="text-xs text-muted-foreground">
                상대강도 = 100 × (섹터 ÷ {t.benchmark}) ÷ 그 50일 평균, 모멘텀 = 상대강도의 10일 변화 · {t.sectorSource}
              </p>
            </CardHeader>
            <CardContent>
              <SectorRotationChart sectors={t.sectors} benchmark={t.benchmark} />
            </CardContent>
          </Card>
          <Card className="xl:col-span-3">
            <CardHeader className="pb-1">
              <CardTitle className="text-base">주도 섹터 순위</CardTitle>
              <p className="text-xs text-muted-foreground">
                순위 = 0.2·1주 + 0.3·1개월 + 0.5·3개월 {t.benchmark} 대비 초과수익
                {market === "US_STOCK" && " · 행을 누르면 섹터 상위 기업"}
              </p>
            </CardHeader>
            <CardContent className="px-2">
              <SectorTable sectors={t.sectors} onSelect={market === "US_STOCK"
                ? (s) => onGroup({ market, kind: "sector", id: s.key, name: `${s.name} (${s.ticker}) 상위 기업` }) : undefined} />
            </CardContent>
          </Card>
        </div>
      )}
      {t.groups && (
        <div className="grid gap-4 2xl:grid-cols-2">
          <GroupList title="업종" ranked={t.groups.industry}
                     onSelect={(g) => onGroup({ market, kind: "industry", id: String(g.no), name: `업종 · ${g.name}` })} />
          <GroupList title="테마" ranked={t.groups.theme}
                     onSelect={(g) => onGroup({ market, kind: "theme", id: String(g.no), name: `테마 · ${g.name}` })} />
        </div>
      )}
      {market === "CRYPTO" && <CryptoTrends t={t} />}
      <p className="text-[11px] text-muted-foreground">
        갱신 {new Date(t.asOf).toLocaleString("ko-KR")} · 무료 비공식 데이터(yfinance·네이버·CoinGecko·업비트)라 지연·누락될 수 있습니다.
      </p>
    </div>
  );
}

/** 시장 동향: 규칙 기반 브리핑 + 섹터 로테이션·주도 섹터 + 오늘의 업종/테마 + 코인 카테고리 */
export function Trends() {
  const [params, setParams] = useSearchParams();
  const market = parseMarketParam(params.get("market") ?? undefined) ?? "KR_STOCK";
  const [group, setGroup] = useState<GroupRef | null>(null);
  const [regimeOpen, setRegimeOpen] = useState(false);
  const [factor, setFactor] = useState<FactorResult | null>(null);
  const { data: briefing } = useGetBriefingQuery({ market });

  return (
    <div className="space-y-4">
      <Tabs value={market} onValueChange={(v) => setParams({ market: marketSlug(v as MarketCode) })}>
        <TabsList>
          {MARKETS.map((m) => <TabsTrigger key={m} value={m}>{MARKET_LABELS[m]}</TabsTrigger>)}
        </TabsList>
        {MARKETS.map((m) => (
          <TabsContent key={m} value={m} className="space-y-4">
            <BriefingCard market={m} onRegimeClick={() => setRegimeOpen((o) => !o)} />
            {regimeOpen && m === market && briefing && (
              <Card>
                <CardHeader className="pb-1">
                  <CardTitle className="text-base">시장 국면 구성 ({briefing.regime.score?.toFixed(0)}점)</CardTitle>
                  <p className="text-xs text-muted-foreground">행을 누르면 계산식·입력값·밴드를 볼 수 있습니다.</p>
                </CardHeader>
                <CardContent className="px-2">
                  <Table>
                    <TableBody>
                      {briefing.regime.factors.map((f) => (
                        <TableRow key={f.key} className="cursor-pointer" onClick={() => setFactor(f)}>
                          <TableCell>{f.label}</TableCell>
                          <TableCell className={`text-right tabular-nums ${changeColorClass(f.score)}`}>
                            {f.score == null ? "데이터 없음" : f.score.toFixed(2)}
                          </TableCell>
                          <TableCell className={`text-right tabular-nums ${changeColorClass(f.contribution)}`}>
                            {f.score == null ? "-" : `${f.contribution >= 0 ? "+" : ""}${f.contribution.toFixed(1)}점`}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}
            <MarketTab market={m} onGroup={setGroup} />
          </TabsContent>
        ))}
      </Tabs>
      <GroupStocksDialog group={group} onClose={() => setGroup(null)} />
      <FactorExplainPanel factor={factor} groupLabel="시장 국면" open={factor != null} onOpenChange={(o) => !o && setFactor(null)} />
    </div>
  );
}
