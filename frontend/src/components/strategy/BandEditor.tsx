import { Minus, Plus, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BandChart } from "@/components/analysis/BandChart";
import { MAX_BAND_POINTS } from "@/lib/strategy-config";
import { NumberField } from "./NumberField";
import type { Band, ValueUnit } from "@/types/model.types";

interface Props {
  label: string;
  unit: ValueUnit;
  band: Band;
  baseline: Band;
  onChange: (band: Band) => void;
  error?: string;
}

/** pct 단위는 편집할 때 % 로 보여 주고 저장은 비율로 */
const scale = (unit: ValueUnit) => (unit === "pct" ? 100 : 1);
const round = (v: number) => Math.round(v * 1e6) / 1e6;

/** 밴드 편집: 점 (x, 점수) 표 + 곡선 미리보기(점선 = 기본값) */
export function BandEditor({ label, unit, band, baseline, onChange, error }: Props) {
  const k = scale(unit);
  const setPoint = (i: number, axis: "xs" | "ys", v: number) => {
    const next = { xs: [...band.xs], ys: [...band.ys] };
    next[axis][i] = axis === "xs" ? round(v / k) : v;
    onChange(next);
  };
  const addPoint = () => {
    // 마지막 두 점 사이 중간에 추가 (점이 하나면 오른쪽에)
    const n = band.xs.length;
    const x = n >= 2 ? (band.xs[n - 2] + band.xs[n - 1]) / 2 : (band.xs[0] ?? 0) + 1;
    const y = n >= 2 ? (band.ys[n - 2] + band.ys[n - 1]) / 2 : band.ys[0] ?? 0;
    const xs = [...band.xs.slice(0, n - 1), round(x), band.xs[n - 1]];
    const ys = [...band.ys.slice(0, n - 1), round(y), band.ys[n - 1]];
    onChange({ xs, ys });
  };
  const removePoint = (i: number) => onChange({ xs: band.xs.filter((_, j) => j !== i), ys: band.ys.filter((_, j) => j !== i) });
  const changed = JSON.stringify(band) !== JSON.stringify(baseline);

  return (
    <div className="rounded-md border p-3">
      <div className="mb-1 flex items-center justify-between gap-2">
        <p className="text-xs font-medium">
          {label} {unit === "pct" && <span className="text-muted-foreground">(%)</span>}
        </p>
        {changed && (
          <Button variant="ghost" size="sm" className="h-7 gap-1 px-2 text-xs" onClick={() => onChange(baseline)}>
            <RotateCcw className="h-3 w-3" /> 기본값
          </Button>
        )}
      </div>
      <BandChart xs={band.xs} ys={band.ys} unit={unit} height={120} baseline={changed ? baseline : undefined} />
      <div className="mt-2 overflow-x-auto">
        <table className="text-xs">
          <tbody>
            <tr>
              <th className="whitespace-nowrap pr-2 text-left font-normal text-muted-foreground">입력 x</th>
              {band.xs.map((x, i) => (
                <td key={i} className="px-0.5">
                  <NumberField value={round(x * k)} onChange={(v) => setPoint(i, "xs", v)} aria-label={`${label} x${i + 1}`}
                               className="w-16" />
                </td>
              ))}
              <td rowSpan={3} className="pl-1 align-middle">
                <Button variant="outline" size="icon" className="h-7 w-7" onClick={addPoint}
                        disabled={band.xs.length >= MAX_BAND_POINTS} aria-label="점 추가">
                  <Plus className="h-3 w-3" />
                </Button>
              </td>
            </tr>
            <tr>
              <th className="whitespace-nowrap pr-2 text-left font-normal text-muted-foreground">점수</th>
              {band.ys.map((y, i) => (
                <td key={i} className="px-0.5 pt-1">
                  <NumberField value={y} onChange={(v) => setPoint(i, "ys", v)} aria-label={`${label} 점수${i + 1}`}
                               className="w-16" />
                </td>
              ))}
            </tr>
            <tr>
              <td />
              {band.xs.map((_, i) => (
                <td key={i} className="text-center">
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => removePoint(i)}
                          disabled={band.xs.length <= 2} aria-label={`점 ${i + 1} 삭제`}>
                    <Minus className="h-3 w-3" />
                  </Button>
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
      {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
    </div>
  );
}
