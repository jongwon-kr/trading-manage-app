// 밴드(구간 선형 보간) 계산과 값 표시 — backend-python app/analysis/scoring/primitives.interp(np.interp) 와 같은 규칙
import type { ValueUnit } from "@/types/model.types";

/** 점 (xs, ys) 사이 선형 보간. 양 끝 밖은 끝값으로 고정 (np.interp 와 동일) */
export function interp(x: number, xs: number[], ys: number[]): number {
  const n = xs.length;
  if (n === 0) return NaN;
  if (x <= xs[0]) return ys[0];
  if (x >= xs[n - 1]) return ys[n - 1];
  let i = 1;
  while (i < n && xs[i] < x) i++;
  const t = (x - xs[i - 1]) / (xs[i] - xs[i - 1]);
  return ys[i - 1] + t * (ys[i] - ys[i - 1]);
}

/** 차트용 곡선: 점들과 양 끝을 폭의 20% 만큼 연장한 평평한 구간. x 가 범위 밖이면 거기까지 늘린다 */
export function bandCurve(xs: number[], ys: number[], x?: number | null): { x: number; y: number }[] {
  if (!xs.length) return [];
  const span = xs[xs.length - 1] - xs[0] || Math.abs(xs[0]) || 1;
  let lo = xs[0] - span * 0.2;
  let hi = xs[xs.length - 1] + span * 0.2;
  if (x != null && Number.isFinite(x)) {
    lo = Math.min(lo, x);
    hi = Math.max(hi, x);
  }
  return [{ x: lo, y: ys[0] }, ...xs.map((v, i) => ({ x: v, y: ys[i] })), { x: hi, y: ys[ys.length - 1] }];
}

/** 단위별 값 표시 (pct 는 비율 → %) */
export function formatValue(value: number | string | null | undefined, unit: ValueUnit): string {
  if (value == null || value === "") return "-";
  if (typeof value === "string") return value;
  if (!Number.isFinite(value)) return "-";
  switch (unit) {
    case "pct":
      return `${(value * 100).toFixed(Math.abs(value) < 0.1 ? 2 : 1)}%`;
    case "ratio":
      return value.toFixed(Math.abs(value) < 10 ? 3 : 1);
    case "price":
    case "number": {
      const abs = Math.abs(value);
      const digits = abs >= 1000 ? 0 : abs >= 100 ? 1 : 2;
      return value.toLocaleString("ko-KR", { minimumFractionDigits: 0, maximumFractionDigits: digits });
    }
    default:
      return String(value);
  }
}

/** 가중치 레코드 → 합이 1 인 비중 (합이 0 이면 모두 0) */
export function normalizeWeights<K extends string>(weights: Record<K, number>): Record<K, number> {
  const entries = Object.entries(weights) as [K, number][];
  const total = entries.reduce((s, [, w]) => s + Math.max(w, 0), 0);
  return Object.fromEntries(entries.map(([k, w]) => [k, total > 0 ? Math.max(w, 0) / total : 0])) as Record<K, number>;
}

export const fmtPct = (v: number | null | undefined, digits = 1) => (v == null ? "-" : `${(v * 100).toFixed(digits)}%`);

/** 카탈로그 라벨의 '{period}' 같은 자리표시자를 파라미터 값으로 채운다 (백엔드 catalog.fill 과 동일) */
export function fillTemplate(template: string, params: Record<string, number>): string {
  return template.replace(/\{(\w+)\}/g, (m, k: string) => (k in params ? String(params[k]) : m));
}
