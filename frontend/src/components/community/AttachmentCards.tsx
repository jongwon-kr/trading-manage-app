import { Link, useNavigate } from "react-router-dom";
import { Download, Loader2, Play } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SafeHtml } from "@/components/common/SafeHtml";
import { useImportStrategyMutation } from "@/api/community.api";
import { useGetAnalysisModelQuery } from "@/api/strategy.api";
import { useSelectedPreset } from "@/hooks/useSelectedPreset";
import { changeColorClass, formatNumber, formatPercent } from "@/lib/format";
import { changeLabels, diffPaths } from "@/lib/strategy-config";
import type { JournalAttachment, StrategyAttachment } from "@/types/community.types";

/** 일지 시장(STOCK/CRYPTO) + 코드 → 종목 상세 경로 */
function journalSymbolPath(a: JournalAttachment): string | null {
  if (a.market === "CRYPTO") return `/market/crypto/${a.symbol.includes("-") ? a.symbol : `KRW-${a.symbol}`}`;
  if (a.market === "STOCK") return `/market/${/^\d{6}$/.test(a.symbol) ? "kr" : "us"}/${a.symbol}`;
  return null;
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: number | null }) {
  return (
    <div className="rounded-md border p-2 text-center">
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className={`text-base font-semibold tabular-nums ${tone != null ? changeColorClass(tone) : ""}`}>{value}</p>
    </div>
  );
}

export function JournalShareCard({ a, compact }: { a: JournalAttachment; compact?: boolean }) {
  const path = journalSymbolPath(a);
  return (
    <Card className="border-dashed">
      <CardHeader className="pb-2">
        <CardTitle className="flex flex-wrap items-center gap-2 text-base">
          {path ? <Link to={path} className="hover:underline">{a.symbol}</Link> : a.symbol}
          <Badge variant="outline" className="font-normal">{a.tradeType === "LONG" ? "매수(롱)" : "매도(숏)"}</Badge>
          <Badge variant="secondary" className="font-normal">{a.closed ? "청산" : "보유 중"}</Badge>
          {a.hideAmounts && <Badge variant="outline" className="font-normal">금액 비공개</Badge>}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Stat label="진입가" value={formatNumber(a.entryPrice, a.entryPrice < 100 ? 4 : 0)} />
          <Stat label="손절가" value={a.stopLossPrice != null ? formatNumber(a.stopLossPrice, a.stopLossPrice < 100 ? 4 : 0) : "-"} />
          <Stat label="수익률" value={a.pnlPct != null ? formatPercent(a.pnlPct, 2) : "-"} tone={a.pnlPct} />
          <Stat label="R 배수" value={a.rMultiple != null ? `${a.rMultiple >= 0 ? "+" : ""}${a.rMultiple.toFixed(2)}R` : "-"} tone={a.rMultiple} />
        </div>
        {!a.hideAmounts && a.quantity != null && (
          <p className="text-xs text-muted-foreground">
            수량 {formatNumber(a.quantity, 8)} · 실현손익 {a.realizedPnL != null ? formatNumber(a.realizedPnL, 0) : "-"}
          </p>
        )}
        {!compact && a.reasoningHtml != null && (
          <div>
            <p className="mb-1 text-xs font-medium text-muted-foreground">매매 근거</p>
            <SafeHtml html={a.reasoningHtml} empty="작성된 근거가 없습니다." className="rounded-md bg-muted/50 p-3" />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function StrategyShareCard({ a, contentId, compact }: { a: StrategyAttachment; contentId?: number; compact?: boolean }) {
  const navigate = useNavigate();
  const { data: model } = useGetAnalysisModelQuery(undefined, { skip: compact || !a.config });
  const [importStrategy, { isLoading }] = useImportStrategyMutation();
  const selected = useSelectedPreset();
  const m = a.backtest?.metrics;
  const b = a.backtest?.benchmarkMetrics;
  const paths = model && a.config ? diffPaths(model.defaultConfig, a.config) : [];
  const labels = model && a.config ? changeLabels(paths, model, a.config) : [];

  const doImport = async (then: "edit" | "analyze") => {
    if (!contentId) return;
    try {
      const preset = await importStrategy(contentId).unwrap();
      toast.success(`‘${preset.name}’을 내 전략에 추가했습니다.`);
      if (then === "edit") navigate(`/strategies/${preset.id}`);
      else {
        selected.setValue(preset.id);
        const sym = a.backtest ? `?market=${a.backtest.market === "KR_STOCK" ? "kr" : a.backtest.market === "US_STOCK" ? "us" : "crypto"}&symbol=${a.backtest.symbol}` : "";
        navigate(`/analysis${sym}`);
      }
    } catch (e) {
      toast.error((e as { message?: string }).message ?? "가져오지 못했습니다.");
    }
  };

  return (
    <Card className="border-dashed">
      <CardHeader className="pb-2">
        <CardTitle className="flex flex-wrap items-center gap-2 text-base">
          {a.name}
          <Badge variant="outline" className="font-mono text-[10px] font-normal">{a.configHash.slice(0, 8)}</Badge>
        </CardTitle>
        {a.description && <p className="text-sm text-muted-foreground">{a.description}</p>}
      </CardHeader>
      <CardContent className="space-y-3">
        {a.backtest && m ? (
          <>
            <p className="text-xs text-muted-foreground">
              백테스트: {a.backtest.name} ({a.backtest.symbol}) · {a.backtest.from} ~ {a.backtest.to}
            </p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <Stat label="총 수익률" value={formatPercent(m.totalReturn, 1)} tone={m.totalReturn} />
              <Stat label="최대 낙폭" value={formatPercent(m.mdd, 1)} />
              <Stat label="승률 · 거래" value={`${formatPercent(m.winRate, 0, false)} · ${m.trades ?? 0}회`} />
              <Stat label="단순 보유" value={formatPercent(b?.totalReturn, 1)} tone={b?.totalReturn} />
            </div>
          </>
        ) : (
          <p className="text-xs text-muted-foreground">첨부된 백테스트 성과가 없습니다.</p>
        )}
        {!compact && model && (
          <div className="flex flex-wrap gap-1">
            {paths.length === 0 ? <Badge variant="outline" className="font-normal">기본 모델과 같음</Badge> : (
              <>
                <Badge className="font-normal">기본 대비 변경 {paths.length}곳</Badge>
                {labels.map((l) => <Badge key={l} variant="outline" className="font-normal">{l}</Badge>)}
              </>
            )}
          </div>
        )}
        {!compact && contentId && (
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => doImport("edit")} disabled={isLoading} className="gap-2">
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}내 전략으로 가져오기
            </Button>
            <Button variant="outline" onClick={() => doImport("analyze")} disabled={isLoading} className="gap-2">
              <Play className="h-4 w-4" />가져와서 분석해보기
            </Button>
          </div>
        )}
        <p className="text-[11px] text-muted-foreground">과거 성과는 미래 수익을 보장하지 않습니다. 여러 종목·기간에서 직접 검증하세요.</p>
      </CardContent>
    </Card>
  );
}
