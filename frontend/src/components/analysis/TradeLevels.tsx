import { formatMoney, formatNumber, formatPercent } from "@/lib/format";
import type { MarketCode } from "@/types/market.types";
import type { RiskPlan } from "@/types/strategy.types";

interface Props {
  risk: RiskPlan;
  market: MarketCode;
  lastPrice?: number;
}

/** ATR 기반 진입·손절·목표가 */
export function TradeLevels({ risk, market, lastPrice }: Props) {
  const base = lastPrice ?? risk.entry;
  const dist = (p: number) => formatPercent(p / base - 1, 1);
  const rows: [string, string, string?][] = [
    ["진입 구간", `${formatMoney(risk.entryLow, market)} ~ ${formatMoney(risk.entryHigh, market)}`],
    ["손절가", formatMoney(risk.stopLoss, market), dist(risk.stopLoss)],
    ["1차 목표 (1.5R)", formatMoney(risk.takeProfit1, market), dist(risk.takeProfit1)],
    ["2차 목표 (3R)", formatMoney(risk.takeProfit2, market), dist(risk.takeProfit2)],
    ["추적 손절 (샹들리에)", formatMoney(risk.trailingStop, market), dist(risk.trailingStop)],
  ];
  return (
    <div className="space-y-3 text-sm">
      <dl className="space-y-1.5">
        {rows.map(([k, v, d]) => (
          <div key={k} className="flex items-center justify-between gap-2">
            <dt className="text-muted-foreground">{k}</dt>
            <dd className="text-right tabular-nums">
              {v}
              {d && <span className="ml-2 text-xs text-muted-foreground">{d}</span>}
            </dd>
          </div>
        ))}
      </dl>
      <div className="grid grid-cols-3 gap-2 rounded-md bg-muted/50 p-2 text-center text-xs">
        <div>
          <p className="text-muted-foreground">ATR(14)</p>
          <p className="tabular-nums">{formatPercent(risk.atrPct, 2, false)}</p>
        </div>
        <div>
          <p className="text-muted-foreground">고점까지 R</p>
          <p className="tabular-nums">{risk.structuralRiskReward != null ? `${formatNumber(risk.structuralRiskReward, 2)}R` : "-"}</p>
        </div>
        <div>
          <p className="text-muted-foreground">권장 비중</p>
          <p className="tabular-nums">{formatPercent(risk.positionSizePct, 1, false)}</p>
        </div>
      </div>
      {risk.quantity != null && (
        <p className="text-xs text-muted-foreground">
          계좌 위험 {formatPercent(risk.riskPct, 1, false)} 기준 권장 수량:{" "}
          <span className="font-medium text-foreground">{formatNumber(risk.quantity, market === "CRYPTO" ? 8 : 0)}</span>
        </p>
      )}
    </div>
  );
}
