import { CartesianGrid, LabelList, ReferenceArea, ReferenceLine, ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis, ZAxis } from "recharts";
import { useTheme } from "next-themes";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { chartPalette } from "@/lib/chart-theme";
import { changeColorClass } from "@/lib/format";
import { fmtPct } from "@/lib/bands";
import type { PeriodKey, Quadrant, SectorTrend } from "@/types/trends.types";

const QUADRANT_META: Record<Quadrant, { label: string; desc: string; className: string; fill: string }> = {
  LEADING: { label: "주도", desc: "시장보다 강하고 더 강해지는 중", className: "bg-price-up/15 text-price-up", fill: "#e5383b" },
  WEAKENING: { label: "약화", desc: "아직 강하지만 모멘텀이 꺾임", className: "bg-amber-500/15 text-amber-600", fill: "#f59e0b" },
  LAGGING: { label: "소외", desc: "시장보다 약하고 더 약해지는 중", className: "bg-price-down/15 text-price-down", fill: "#1f63ee" },
  IMPROVING: { label: "개선", desc: "아직 약하지만 좋아지는 중", className: "bg-emerald-500/15 text-emerald-600", fill: "#10b981" },
};

export function QuadrantBadge({ q }: { q: Quadrant | null }) {
  if (!q) return <span className="text-xs text-muted-foreground">-</span>;
  const m = QUADRANT_META[q];
  return <Badge variant="outline" className={`border-0 font-normal ${m.className}`} title={m.desc}>{m.label}</Badge>;
}

/** 상대강도 사분면 (RRG): x = RS-Ratio(100 = 시장과 같음), y = RS-Momentum */
export function SectorRotationChart({ sectors, benchmark }: { sectors: SectorTrend[]; benchmark?: string }) {
  const { resolvedTheme } = useTheme();
  const c = chartPalette(resolvedTheme === "dark");
  const points = sectors.filter((s) => s.rsRatio != null && s.rsMomentum != null)
    .map((s) => ({ x: s.rsRatio as number, y: s.rsMomentum as number, name: s.name, q: s.quadrant }));
  if (!points.length) return <p className="py-10 text-center text-sm text-muted-foreground">상대강도를 계산할 데이터가 부족합니다.</p>;
  const span = Math.max(2, ...points.map((p) => Math.abs(p.x - 100))) * 1.15;
  const mspan = Math.max(1, ...points.map((p) => Math.abs(p.y))) * 1.15;
  const x0 = 100 - span, x1 = 100 + span, y0 = -mspan, y1 = mspan;
  const byQ = (q: Quadrant) => points.filter((p) => p.q === q);

  return (
    <div>
      <ResponsiveContainer width="100%" height={380}>
        <ScatterChart margin={{ top: 10, right: 20, bottom: 20, left: 0 }}>
          <ReferenceArea x1={100} x2={x1} y1={0} y2={y1} fill={QUADRANT_META.LEADING.fill} fillOpacity={0.06}
                         label={{ value: "주도", position: "insideTopRight", fill: c.text, fontSize: 12 }} />
          <ReferenceArea x1={100} x2={x1} y1={y0} y2={0} fill={QUADRANT_META.WEAKENING.fill} fillOpacity={0.06}
                         label={{ value: "약화", position: "insideBottomRight", fill: c.text, fontSize: 12 }} />
          <ReferenceArea x1={x0} x2={100} y1={y0} y2={0} fill={QUADRANT_META.LAGGING.fill} fillOpacity={0.06}
                         label={{ value: "소외", position: "insideBottomLeft", fill: c.text, fontSize: 12 }} />
          <ReferenceArea x1={x0} x2={100} y1={0} y2={y1} fill={QUADRANT_META.IMPROVING.fill} fillOpacity={0.06}
                         label={{ value: "개선", position: "insideTopLeft", fill: c.text, fontSize: 12 }} />
          <CartesianGrid stroke={c.border} strokeDasharray="3 3" />
          <XAxis type="number" dataKey="x" domain={[x0, x1]} tick={{ fontSize: 11, fill: c.text }} tickFormatter={(v: number) => v.toFixed(1)}
                 label={{ value: `상대강도 (${benchmark ?? "시장"} = 100)`, position: "insideBottom", offset: -12, fill: c.text, fontSize: 11 }} />
          <YAxis type="number" dataKey="y" domain={[y0, y1]} width={44} tick={{ fontSize: 11, fill: c.text }} tickFormatter={(v: number) => v.toFixed(1)} />
          <ZAxis range={[70, 70]} />
          <ReferenceLine x={100} stroke={c.text} strokeOpacity={0.5} />
          <ReferenceLine y={0} stroke={c.text} strokeOpacity={0.5} />
          <Tooltip cursor={false} contentStyle={{ background: c.background, border: `1px solid ${c.border}`, fontSize: 12 }}
                   formatter={(v: number, n: string) => [v.toFixed(2), n === "x" ? "상대강도" : "모멘텀"]}
                   labelFormatter={() => ""} />
          {(Object.keys(QUADRANT_META) as Quadrant[]).map((q) => (
            <Scatter key={q} data={byQ(q)} fill={QUADRANT_META[q].fill} isAnimationActive={false}>
              <LabelList dataKey="name" position="top" style={{ fontSize: 11, fill: c.text }} />
            </Scatter>
          ))}
        </ScatterChart>
      </ResponsiveContainer>
      <p className="text-xs text-muted-foreground">
        오른쪽일수록 {benchmark ?? "시장"}보다 강하고, 위쪽일수록 상대강도가 좋아지는 중입니다. 섹터는 보통 개선 → 주도 → 약화 → 소외
        방향(시계 방향)으로 순환합니다.
      </p>
    </div>
  );
}

const PERIODS: [PeriodKey, string][] = [["1d", "1일"], ["1w", "1주"], ["1m", "1개월"], ["3m", "3개월"]];

/** 수익률 칸 배경: 등락 색 농도 = |수익률| (±10% 에서 최대) */
function heat(v: number | null): React.CSSProperties | undefined {
  if (v == null) return undefined;
  const a = Math.min(Math.abs(v) / 0.1, 1) * 0.35;
  return { background: `hsl(var(${v >= 0 ? "--price-up" : "--price-down"}) / ${a.toFixed(3)})` };
}

export function SectorTable({ sectors, onSelect }: { sectors: SectorTrend[]; onSelect?: (s: SectorTrend) => void }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-10 whitespace-nowrap">순위</TableHead>
          <TableHead>섹터</TableHead>
          <TableHead>국면</TableHead>
          {PERIODS.map(([k, l]) => <TableHead key={k} className="text-right">{l}</TableHead>)}
          <TableHead className="text-right" title="벤치마크 대비 3개월 초과수익">3개월 초과</TableHead>
          <TableHead className="text-center" title="종가가 50일 이동평균 위">50일선</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {sectors.map((s) => (
          <TableRow key={s.key} className={onSelect ? "cursor-pointer" : undefined} onClick={() => onSelect?.(s)}>
            <TableCell className="tabular-nums text-muted-foreground">{s.rank}</TableCell>
            <TableCell>
              <span className="font-medium">{s.name}</span>
              <span className="ml-1 text-xs text-muted-foreground">{s.ticker}</span>
            </TableCell>
            <TableCell><QuadrantBadge q={s.quadrant} /></TableCell>
            {PERIODS.map(([k]) => (
              <TableCell key={k} className={`text-right tabular-nums ${changeColorClass(s.returns[k])}`} style={heat(s.returns[k])}>
                {s.returns[k] == null ? "-" : `${s.returns[k]! >= 0 ? "+" : ""}${fmtPct(s.returns[k])}`}
              </TableCell>
            ))}
            <TableCell className={`text-right tabular-nums ${changeColorClass(s.excess["3m"])}`}>
              {s.excess["3m"] == null ? "-" : `${s.excess["3m"]! >= 0 ? "+" : ""}${fmtPct(s.excess["3m"])}`}
            </TableCell>
            <TableCell className="text-center">{s.aboveMa50 == null ? "-" : s.aboveMa50 ? "위" : "아래"}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
