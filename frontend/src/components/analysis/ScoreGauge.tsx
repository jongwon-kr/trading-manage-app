import { CHART_COLORS } from "@/lib/chart-theme";

interface Props {
  /** 0~100 */
  score: number;
  size?: number;
}

// 반원 게이지: 0(매도) ← 50(중립) → 100(매수). 구간 경계는 scoring/weights.py 신호 구간과 같다.
const BANDS: [number, number, string][] = [
  [0, 25, CHART_COLORS.light.down],
  [25, 40, "#7aa2f7"],
  [40, 60, "#a1a1aa"],
  [60, 75, "#f28b8d"],
  [75, 100, CHART_COLORS.light.up],
];

function polar(cx: number, cy: number, r: number, value: number) {
  const angle = Math.PI * (1 - value / 100);
  return [cx + r * Math.cos(angle), cy - r * Math.sin(angle)];
}

function arc(cx: number, cy: number, r: number, from: number, to: number) {
  const [x1, y1] = polar(cx, cy, r, from);
  const [x2, y2] = polar(cx, cy, r, to);
  return `M ${x1} ${y1} A ${r} ${r} 0 0 1 ${x2} ${y2}`;
}

export function ScoreGauge({ score, size = 180 }: Props) {
  const w = size;
  const h = size * 0.6;
  const cx = w / 2;
  const cy = h - 8;
  const r = w / 2 - 12;
  const clamped = Math.max(0, Math.min(100, score));
  // 지시선은 원호 안쪽에 짧게 그려 가운데 점수 숫자를 가리지 않게 한다
  const [ix, iy] = polar(cx, cy, r - 22, clamped);
  const [ox, oy] = polar(cx, cy, r + 6, clamped);
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} role="img" aria-label={`전략 점수 ${score.toFixed(0)}점`}>
      {BANDS.map(([a, b, color]) => (
        <path key={a} d={arc(cx, cy, r, a, b)} stroke={color} strokeWidth={12} fill="none" />
      ))}
      <line x1={ix} y1={iy} x2={ox} y2={oy} stroke="currentColor" strokeWidth={3} strokeLinecap="round" />
      <text x={cx} y={cy - 6} textAnchor="middle" className="fill-foreground text-3xl font-bold tabular-nums">
        {clamped.toFixed(0)}
      </text>
    </svg>
  );
}
