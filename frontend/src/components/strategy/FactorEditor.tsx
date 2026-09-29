import { RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { fillTemplate } from "@/lib/bands";
import { errorAt, type FieldError } from "@/lib/strategy-config";
import { BandEditor } from "./BandEditor";
import { NumberField } from "./NumberField";
import type { FactorConfig, FactorSpec } from "@/types/model.types";

interface Props {
  spec: FactorSpec;
  value: FactorConfig;
  baseline: FactorConfig;
  onChange: (v: FactorConfig) => void;
  errors: FieldError[];
}

/** 팩터 하나: 사용 여부 · 가중치 · 파라미터(기간) · 밴드 */
export function FactorEditor({ spec, value, baseline, onChange, errors }: Props) {
  const path = `factors.${spec.key}`;
  const changed = JSON.stringify(value) !== JSON.stringify(baseline);
  const set = (patch: Partial<FactorConfig>) => onChange({ ...value, ...patch });

  return (
    <div id={`edit-${spec.key}`} className={`space-y-3 rounded-lg border p-4 ${value.enabled ? "" : "opacity-60"}`}>
      <div className="flex flex-wrap items-center gap-3">
        <Switch checked={value.enabled} onCheckedChange={(enabled) => set({ enabled })} aria-label={`${spec.label} 사용`} />
        <div className="min-w-0 flex-1">
          <p className="font-medium">{fillTemplate(spec.label, value.params)}</p>
          <p className="text-xs text-muted-foreground">{fillTemplate(spec.description, value.params)}</p>
        </div>
        {changed && (
          <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs" onClick={() => onChange(baseline)}>
            <RotateCcw className="h-3 w-3" /> 기본값으로
          </Button>
        )}
      </div>

      {value.enabled && (
        <>
          <div className="flex flex-wrap items-center gap-3">
            <Label className="w-16 text-xs text-muted-foreground">가중치</Label>
            <Slider className="w-40" min={0} max={2} step={0.05} value={[Math.min(value.weight, 2)]}
                    onValueChange={([w]) => set({ weight: Math.round(w * 100) / 100 })} aria-label={`${spec.label} 가중치`} />
            <NumberField value={value.weight} onChange={(weight) => set({ weight })} error={errorAt(errors, `${path}.weight`)}
                         aria-label={`${spec.label} 가중치 값`} />
            <span className="text-xs text-muted-foreground">기본 {baseline.weight}</span>
          </div>

          {spec.params.length > 0 && (
            <div className="flex flex-wrap gap-4">
              {spec.params.map((p) => {
                const err = errorAt(errors, `${path}.params.${p.key}`);
                return (
                  <div key={p.key} className="space-y-1">
                    <Label className="text-xs text-muted-foreground">
                      {p.label} <span className="opacity-70">({p.min}~{p.max})</span>
                    </Label>
                    <NumberField value={value.params[p.key]} error={err} aria-label={p.label}
                                 onChange={(v) => set({ params: { ...value.params, [p.key]: v } })} />
                    {err && <p className="text-xs text-destructive">{err}</p>}
                  </div>
                );
              })}
            </div>
          )}

          <p className="rounded bg-muted px-2 py-1 font-mono text-[11px] text-muted-foreground">
            {fillTemplate(spec.formula, value.params)}
          </p>
          {spec.rules.length > 0 && (
            <ul className="list-disc pl-5 text-[11px] text-muted-foreground">
              {spec.rules.map((r) => <li key={r}>{fillTemplate(r, value.params)}</li>)}
            </ul>
          )}

          <div className={`grid gap-3 ${spec.bands.length > 1 ? "xl:grid-cols-2" : ""}`}>
            {spec.bands.map((b) => (
              <BandEditor
                key={b.name}
                label={fillTemplate(b.label, value.params)}
                unit={b.unit}
                band={value.bands[b.name]}
                baseline={baseline.bands[b.name]}
                error={errorAt(errors, `${path}.bands.${b.name}`)}
                onChange={(band) => set({ bands: { ...value.bands, [b.name]: band } })}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
