import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BandChart } from "@/components/analysis/BandChart";
import { useGetAnalysisModelQuery } from "@/api/strategy.api";
import { fillTemplate, fmtPct } from "@/lib/bands";
import { MARKET_LABELS } from "@/lib/market";
import type { AnalysisModel, FactorSpec } from "@/types/model.types";
import type { MarketCode } from "@/types/market.types";

function defaultsOf(f: FactorSpec): Record<string, number> {
  return Object.fromEntries(f.params.map((p) => [p.key, p.default]));
}

function FactorCard({ f, model }: { f: FactorSpec; model: AnalysisModel }) {
  const params = defaultsOf(f);
  const cfg = model.defaultConfig.factors[f.key];
  return (
    <Card id={`factor-${f.key}`}>
      <CardHeader className="pb-2">
        <CardTitle className="flex flex-wrap items-center gap-2 text-base">
          {fillTemplate(f.label, params)}
          <Badge variant="secondary" className="font-normal">가중치 {cfg?.weight}</Badge>
        </CardTitle>
        <p className="text-sm text-muted-foreground">{fillTemplate(f.description, params)}</p>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="rounded-md bg-muted px-3 py-2 font-mono text-xs leading-relaxed">{fillTemplate(f.formula, params)}</p>
        {f.rules.length > 0 && (
          <ul className="list-disc space-y-1 pl-5 text-xs text-muted-foreground">
            {f.rules.map((r) => <li key={r}>{fillTemplate(r, params)}</li>)}
          </ul>
        )}
        {f.params.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {f.params.map((p) => (
              <Badge key={p.key} variant="outline" className="font-normal">
                {p.label} {p.default} <span className="ml-1 text-muted-foreground">({p.min}~{p.max})</span>
              </Badge>
            ))}
          </div>
        )}
        <div className="grid gap-3 md:grid-cols-2">
          {f.bands.map((b) => (
            <div key={b.name} className="rounded-md border p-2">
              <p className="px-1 text-xs font-medium">{fillTemplate(b.label, params)}</p>
              <BandChart xs={b.xs} ys={b.ys} unit={b.unit} height={130} />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

/** 분석 방법: 점수 모델 v1 의 전체 계산 과정 (카탈로그 API 로 렌더링하므로 코드와 항상 일치) */
export function Methodology() {
  const { data: model, isLoading } = useGetAnalysisModelQuery();

  if (isLoading || !model) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }
  const cfg = model.defaultConfig;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <Link to="/analysis" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> 전략 분석으로
      </Link>

      <Card>
        <CardHeader>
          <CardTitle>점수는 이렇게 계산됩니다 (모델 {model.modelVersion})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm leading-relaxed">
          <ol className="list-decimal space-y-3 pl-5">
            <li>
              <b>팩터 점수 (−1 ~ +1)</b> — 지표 값(RSI, PER 등)을 <b>밴드</b>로 점수로 바꿉니다. 밴드는 (입력값, 점수) 점들을
              직선으로 이은 함수이고 양 끝 밖은 끝값을 씁니다. +1 은 강한 강세, −1 은 강한 약세입니다.
            </li>
            <li>
              <b>그룹 점수</b> — 그룹(기술적·기본적·시장 국면) 안에서 데이터가 있는 팩터만 가중평균합니다. 기술적 분석은
              하위 그룹(추세·모멘텀·변동성·거래량) 가중치 × 팩터 가중치를 씁니다. 데이터가 있는 팩터 가중치의 비율이
              <b> 커버리지</b>입니다.
            </li>
            <li>
              <b>종합 점수 (0 ~ 100)</b> — 그룹 비중 = 시장별 기본 비중 × 커버리지를 합이 1 이 되게 다시 나눈 뒤,
              C = Σ(그룹 비중 × 그룹 점수), <b>점수 = 50 + 50 × C</b>. 50 은 중립입니다.
            </li>
            <li>
              <b>기여도</b> — 팩터 기여(점) = 50 × 그룹 비중 × 그룹 안 비중 × 팩터 점수. 항상{" "}
              <b>50 + Σ 기여도 = 종합 점수</b>가 성립하므로, 리포트의 막대를 더하면 점수가 됩니다.
            </li>
            <li>
              <b>신뢰도 (0 ~ 100%)</b> — 전체 데이터 커버리지 × (0.5 + 0.5 × 그룹 간 방향 일치도). 데이터가 빠지거나 그룹끼리
              방향이 엇갈리면 낮아집니다.
            </li>
          </ol>
          <p className="text-xs text-muted-foreground">
            최소 {model.minBars}개 일봉이 있어야 분석합니다. 모든 가중치·밴드·기간·임계값은 <b>내 전략</b>에서 바꿀 수 있습니다.
          </p>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">신호와 게이트</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <Table>
              <TableBody>
                <TableRow><TableCell>강한 매수</TableCell><TableCell className="text-right">{cfg.signal.strongBuy}점 이상</TableCell></TableRow>
                <TableRow><TableCell>매수</TableCell><TableCell className="text-right">{cfg.signal.buy}점 이상</TableCell></TableRow>
                <TableRow><TableCell>관망</TableCell><TableCell className="text-right">{cfg.signal.sell}점 초과 ~ {cfg.signal.buy}점 미만</TableCell></TableRow>
                <TableRow><TableCell>매도</TableCell><TableCell className="text-right">{cfg.signal.sell}점 이하</TableCell></TableRow>
                <TableRow><TableCell>강한 매도</TableCell><TableCell className="text-right">{cfg.signal.strongSell}점 이하</TableCell></TableRow>
              </TableBody>
            </Table>
            <p className="text-xs text-muted-foreground">
              위험회피 게이트: 시장 국면 그룹 점수가 {cfg.gate.threshold} 미만이면 매수 신호를 관망으로 낮추고 경고를 표시합니다.
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">시장별 그룹 기본 비중</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>시장</TableHead>
                  {model.groups.map((g) => <TableHead key={g.key} className="text-right">{g.label}</TableHead>)}
                </TableRow>
              </TableHeader>
              <TableBody>
                {(Object.keys(cfg.groupWeights) as MarketCode[]).map((m) => (
                  <TableRow key={m}>
                    <TableCell>{MARKET_LABELS[m]}</TableCell>
                    {model.groups.map((g) => (
                      <TableCell key={g.key} className="text-right tabular-nums">{fmtPct(cfg.groupWeights[m][g.key], 0)}</TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <p className="mt-2 text-xs text-muted-foreground">
              기술적 하위 그룹:{" "}
              {model.subGroups.map((s) => `${s.label} ${fmtPct(cfg.subgroupWeights[s.key], 0)}`).join(" · ")}
            </p>
          </CardContent>
        </Card>
      </div>

      {model.groups.map((g) => {
        const factors = model.factors.filter((f) => f.group === g.key);
        return (
          <section key={g.key} className="space-y-3">
            <div>
              <h2 className="text-lg font-semibold">{g.label}</h2>
              <p className="text-sm text-muted-foreground">{g.description}</p>
            </div>
            {g.key === "technical"
              ? model.subGroups.map((s) => (
                  <div key={s.key} className="space-y-3">
                    <h3 className="text-sm font-semibold text-muted-foreground">
                      {s.label} (하위 그룹 가중치 {cfg.subgroupWeights[s.key]})
                    </h3>
                    {factors.filter((f) => f.subGroup === s.key).map((f) => <FactorCard key={f.key} f={f} model={model} />)}
                  </div>
                ))
              : factors.map((f) => <FactorCard key={f.key} f={f} model={model} />)}
          </section>
        );
      })}

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">매매 계획 (ATR 기반, 롱 전용)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 text-sm leading-relaxed">
          <p>진입 구간: [max(종가 − 0.5·ATR, 20일선), 종가], 진입가는 중간값. ATR 은 14일.</p>
          <p>
            손절가: 진입가 − k·ATR (k = 주식 {cfg.risk.stopAtrStock}, 코인 {cfg.risk.stopAtrCrypto}). R = 진입가 − 손절가.
          </p>
          <p>목표가: 1차 진입가 + {cfg.risk.target1R}R, 2차 + {cfg.risk.target2R}R. 60일 고점이 1R 안이면 ‘저항 근접’ 경고.</p>
          <p>
            비중: min(위험비율 × 진입가 ÷ R, 상한 주식 {fmtPct(cfg.risk.maxPositionStock, 0)} · 코인{" "}
            {fmtPct(cfg.risk.maxPositionCrypto, 0)}). 추적 손절: 22일 고점 − 3·ATR.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">백테스트 규칙</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 text-sm leading-relaxed">
          <p>기술적 분석과 시장 국면(지수 추세·변동성) 팩터의 시계열로 매일 점수를 다시 계산합니다.</p>
          <p>기본적 분석과 시장 폭·심리는 과거 시점 데이터가 없어 제외합니다 (미래 정보 사용 방지).</p>
          <p>종가 신호 → 다음 날 시가 체결. 같은 봉에서 손절과 목표가 모두 닿으면 손절을 우선합니다. 수수료·세금·슬리피지를 반영합니다.</p>
          <p className="text-xs text-muted-foreground">과거 성과는 미래 수익을 보장하지 않습니다. 본 분석은 투자 참고용입니다.</p>
        </CardContent>
      </Card>
    </div>
  );
}
