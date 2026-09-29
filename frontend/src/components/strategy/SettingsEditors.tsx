import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { fmtPct, normalizeWeights } from "@/lib/bands";
import { errorAt, type FieldError } from "@/lib/strategy-config";
import { MARKET_LABELS } from "@/lib/market";
import { NumberField } from "./NumberField";
import type { AnalysisModel, StrategyConfig } from "@/types/model.types";
import type { MarketCode } from "@/types/market.types";
import type { GroupKey } from "@/types/strategy.types";

interface Props {
  model: AnalysisModel;
  value: StrategyConfig;
  onChange: (v: StrategyConfig) => void;
  errors: FieldError[];
}

function WeightRow({ label, value, share, onChange, error, max = 1 }: {
  label: string; value: number; share: number; onChange: (v: number) => void; error?: string; max?: number;
}) {
  return (
    <div className="flex items-center gap-3">
      <Label className="w-24 shrink-0 text-sm">{label}</Label>
      <Slider className="w-40" min={0} max={max} step={0.05} value={[Math.min(value, max)]}
              onValueChange={([v]) => onChange(Math.round(v * 100) / 100)} aria-label={`${label} 비중`} />
      <NumberField value={value} onChange={onChange} error={error} aria-label={`${label} 비중 값`} />
      <span className="w-14 text-right text-xs tabular-nums text-muted-foreground">{fmtPct(share, 0)}</span>
    </div>
  );
}

/** 시장별 그룹 비중 + 기술적 하위 그룹 비중. 오른쪽 % 는 합이 100% 가 되도록 정규화한 실제 비중 */
export function WeightsEditor({ model, value, onChange, errors }: Props) {
  const markets = Object.keys(value.groupWeights) as MarketCode[];
  const subShares = normalizeWeights(value.subgroupWeights);
  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        비중은 상대값입니다. 오른쪽 % 는 합이 100% 가 되도록 나눈 실제 비중이며, 분석 시 데이터가 없는 그룹은 빼고 다시
        나눕니다. 백테스트에서는 기본적 분석을 쓰지 않습니다.
      </p>
      {markets.map((m) => {
        const shares = normalizeWeights(value.groupWeights[m]);
        return (
          <div key={m} className="space-y-2">
            <h4 className="text-sm font-semibold">{MARKET_LABELS[m]}</h4>
            {errorAt(errors, `groupWeights.${m}`) && (
              <p className="text-xs text-destructive">{errorAt(errors, `groupWeights.${m}`)}</p>
            )}
            {model.groups.map((g) => (
              <WeightRow key={g.key} label={g.label} value={value.groupWeights[m][g.key as GroupKey]}
                         share={shares[g.key as GroupKey]} error={errorAt(errors, `groupWeights.${m}.${g.key}`)}
                         onChange={(v) => onChange({
                           ...value, groupWeights: { ...value.groupWeights, [m]: { ...value.groupWeights[m], [g.key]: v } },
                         })} />
            ))}
          </div>
        );
      })}
      <div className="space-y-2">
        <h4 className="text-sm font-semibold">기술적 분석 하위 그룹</h4>
        {model.subGroups.map((s) => (
          <WeightRow key={s.key} label={s.label} value={value.subgroupWeights[s.key]} share={subShares[s.key]}
                     error={errorAt(errors, `subgroupWeights.${s.key}`)}
                     onChange={(v) => onChange({ ...value, subgroupWeights: { ...value.subgroupWeights, [s.key]: v } })} />
        ))}
      </div>
    </div>
  );
}

/** 신호 임계값 · 위험회피 게이트 · 리스크(손절·목표·비중 상한) */
export function SignalRiskEditor({ value, onChange, errors }: Props) {
  const s = value.signal;
  const r = value.risk;
  const signalRow = (label: string, key: keyof StrategyConfig["signal"]) => (
    <div className="flex items-center justify-between gap-3">
      <Label className="text-sm">{label}</Label>
      <NumberField value={s[key]} onChange={(v) => onChange({ ...value, signal: { ...s, [key]: v } })} aria-label={label} />
    </div>
  );
  const riskRow = (label: string, key: keyof StrategyConfig["risk"], hint?: string) => (
    <div className="flex items-center justify-between gap-3">
      <Label className="text-sm">
        {label} {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
      </Label>
      <NumberField value={r[key]} error={errorAt(errors, `risk.${key}`)} aria-label={label}
                   onChange={(v) => onChange({ ...value, risk: { ...r, [key]: v } })} />
    </div>
  );
  return (
    <div className="grid gap-8 md:grid-cols-2">
      <div className="space-y-3">
        <h4 className="text-sm font-semibold">신호 임계값 (0~100점)</h4>
        {signalRow("강한 매수 ≥", "strongBuy")}
        {signalRow("매수 ≥", "buy")}
        {signalRow("매도 ≤", "sell")}
        {signalRow("강한 매도 ≤", "strongSell")}
        {errorAt(errors, "signal") && <p className="text-xs text-destructive">{errorAt(errors, "signal")}</p>}

        <h4 className="pt-4 text-sm font-semibold">위험회피 게이트</h4>
        <div className="flex items-center justify-between gap-3">
          <Label className="text-sm">시장 국면이 나쁘면 매수 신호 보류</Label>
          <Switch checked={value.gate.enabled} aria-label="위험회피 게이트 사용"
                  onCheckedChange={(enabled) => onChange({ ...value, gate: { ...value.gate, enabled } })} />
        </div>
        <div className="flex items-center justify-between gap-3">
          <Label className="text-sm">국면 점수 기준 (−1~1)</Label>
          <NumberField value={value.gate.threshold} disabled={!value.gate.enabled} error={errorAt(errors, "gate.threshold")}
                       aria-label="게이트 기준" onChange={(threshold) => onChange({ ...value, gate: { ...value.gate, threshold } })} />
        </div>
        <p className="text-xs text-muted-foreground">백테스트에서는 이 기준 미만일 때 새로 진입하지 않습니다.</p>
      </div>
      <div className="space-y-3">
        <h4 className="text-sm font-semibold">매매 계획</h4>
        {riskRow("손절 ATR 배수 (주식)", "stopAtrStock")}
        {riskRow("손절 ATR 배수 (코인)", "stopAtrCrypto")}
        {riskRow("1차 목표", "target1R", "R 배수")}
        {riskRow("2차 목표", "target2R", "R 배수, 백테스트 목표")}
        {riskRow("비중 상한 (주식)", "maxPositionStock", "0~1")}
        {riskRow("비중 상한 (코인)", "maxPositionCrypto", "0~1")}
      </div>
    </div>
  );
}
