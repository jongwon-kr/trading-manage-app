import { Bar, BarChart, Cell, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useTheme } from "next-themes";
import { chartPalette } from "@/lib/chart-theme";
import type { GroupResult } from "@/types/strategy.types";

interface Row {
  label: string;
  contribution: number;
  score: number | null;
  group: string;
}

/** 팩터별 기여도(점) 가로 막대. 양수 = 점수를 올린 요인(상승색), 음수 = 내린 요인(하락색) */
export function FactorContributionChart({ groups }: { groups: GroupResult[] }) {
  const { resolvedTheme } = useTheme();
  const c = chartPalette(resolvedTheme === "dark");
  const rows: Row[] = groups
    .flatMap((g) => g.factors.filter((f) => f.score != null).map((f) => ({
      label: f.label, contribution: f.contribution, score: f.score, group: g.label,
    })))
    .sort((a, b) => b.contribution - a.contribution);

  return (
    <ResponsiveContainer width="100%" height={Math.max(rows.length * 26 + 30, 120)}>
      <BarChart data={rows} layout="vertical" margin={{ left: 8, right: 24, top: 4, bottom: 4 }}>
        <XAxis type="number" tick={{ fontSize: 11, fill: c.text }} tickFormatter={(v: number) => `${v > 0 ? "+" : ""}${v}`} />
        <YAxis type="category" dataKey="label" width={170} tick={{ fontSize: 12, fill: c.text }} />
        <ReferenceLine x={0} stroke={c.border} />
        <Tooltip
          cursor={{ fill: "transparent" }}
          contentStyle={{ background: c.background, border: `1px solid ${c.border}`, fontSize: 12 }}
          formatter={(v: number, _n, item) => [
            `${v > 0 ? "+" : ""}${v.toFixed(2)}점 (팩터 점수 ${(item.payload as Row).score?.toFixed(2)})`,
            (item.payload as Row).group,
          ]}
        />
        <Bar dataKey="contribution" radius={2}>
          {rows.map((r) => (
            <Cell key={r.label} fill={r.contribution >= 0 ? c.up : c.down} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
