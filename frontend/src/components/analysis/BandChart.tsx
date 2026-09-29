import { CartesianGrid, Line, LineChart, ReferenceDot, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useTheme } from "next-themes";
import { chartPalette, LINE_COLORS } from "@/lib/chart-theme";
import { bandCurve, formatValue, interp } from "@/lib/bands";
import type { ValueUnit } from "@/types/model.types";

interface Props {
  xs: number[];
  ys: number[];
  unit: ValueUnit;
  /** 현재 입력값 (있으면 곡선 위에 점으로 표시) */
  x?: number | null;
  height?: number;
  /** 편집 중 비교용 기본 밴드 (점선) */
  baseline?: { xs: number[]; ys: number[] };
}

/** 밴드: 입력값(x) → 팩터 점수(-1~1) 구간 선형 함수 */
export function BandChart({ xs, ys, unit, x, height = 160, baseline }: Props) {
  const { resolvedTheme } = useTheme();
  const c = chartPalette(resolvedTheme === "dark");
  const curve = bandCurve(xs, ys, x);
  const base = baseline ? bandCurve(baseline.xs, baseline.ys, x) : null;
  const hasX = x != null && Number.isFinite(x);
  const y = hasX ? interp(x as number, xs, ys) : null;

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart margin={{ left: 0, right: 12, top: 8, bottom: 0 }}>
        <CartesianGrid stroke={c.border} strokeDasharray="3 3" />
        <XAxis
          type="number"
          dataKey="x"
          domain={["dataMin", "dataMax"]}
          tick={{ fontSize: 10, fill: c.text }}
          tickFormatter={(v: number) => formatValue(v, unit)}
          allowDuplicatedCategory={false}
        />
        <YAxis domain={[-1, 1]} ticks={[-1, -0.5, 0, 0.5, 1]} width={32} tick={{ fontSize: 10, fill: c.text }} />
        <ReferenceLine y={0} stroke={c.text} strokeOpacity={0.4} />
        <Tooltip
          contentStyle={{ background: c.background, border: `1px solid ${c.border}`, fontSize: 12 }}
          labelFormatter={(v: number) => `입력 ${formatValue(v, unit)}`}
          formatter={(v: number) => [v.toFixed(2), "점수"]}
        />
        {base && (
          <Line data={base} dataKey="y" type="linear" stroke={c.text} strokeOpacity={0.5} strokeDasharray="4 3"
                dot={false} isAnimationActive={false} name="기본" />
        )}
        <Line data={curve} dataKey="y" type="linear" stroke={LINE_COLORS.macd} strokeWidth={2} isAnimationActive={false}
              dot={(p: { cx?: number; cy?: number; index?: number }) =>
                p.index === 0 || p.index === curve.length - 1 || p.cx == null ? <g key={p.index} /> :
                  <circle key={p.index} cx={p.cx} cy={p.cy} r={3} fill={LINE_COLORS.macd} />} />
        {hasX && y != null && (
          <ReferenceDot x={x as number} y={y} r={6} fill={y >= 0 ? c.up : c.down} stroke={c.background} strokeWidth={2} />
        )}
      </LineChart>
    </ResponsiveContainer>
  );
}
