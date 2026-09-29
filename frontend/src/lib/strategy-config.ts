// 전략 설정 편집 도우미 — 검증 규칙은 backend-python app/analysis/model/config.py validate() 와 같다
import { fillTemplate } from "./bands";
import type { AnalysisModel, StrategyConfig } from "@/types/model.types";

export interface FieldError {
  path: string;
  msg: string;
}

export const MAX_BAND_POINTS = 8;
export const MAX_WEIGHT = 10;

/** 두 설정의 다른 곳(잎 경로). 배열(밴드 xs/ys)은 통째로 비교한다 */
export function diffPaths(a: unknown, b: unknown, prefix = ""): string[] {
  if (Array.isArray(a) || Array.isArray(b)) {
    return JSON.stringify(a) === JSON.stringify(b) ? [] : [prefix];
  }
  if (a && b && typeof a === "object" && typeof b === "object") {
    const keys = new Set([...Object.keys(a as object), ...Object.keys(b as object)]);
    return [...keys].flatMap((k) =>
      diffPaths((a as Record<string, unknown>)[k], (b as Record<string, unknown>)[k], prefix ? `${prefix}.${k}` : k)
    );
  }
  return a === b ? [] : [prefix];
}

/** 경로의 값을 바꾼 새 객체 (불변 갱신) */
export function setIn<T>(obj: T, path: (string | number)[], value: unknown): T {
  if (!path.length) return value as T;
  const [head, ...rest] = path;
  const src = (obj ?? {}) as Record<string | number, unknown>;
  const copy = (Array.isArray(src) ? [...src] : { ...src }) as Record<string | number, unknown>;
  copy[head] = setIn(src[head], rest, value);
  return copy as T;
}

/** 변경된 곳을 사람이 읽을 이름으로 (팩터 단위로 묶음, 라벨의 기간은 cfg 값으로 채움) */
export function changeLabels(paths: string[], model: AnalysisModel, cfg: StrategyConfig): string[] {
  const labels = new Set<string>();
  for (const p of paths) {
    const [top, key] = p.split(".");
    if (top === "factors") {
      const spec = model.factors.find((f) => f.key === key);
      labels.add(spec ? fillTemplate(spec.label, cfg.factors[key]?.params ?? {}) : key);
    }
    else if (top === "groupWeights" || top === "subgroupWeights") labels.add("그룹 비중");
    else if (top === "signal") labels.add("신호 임계값");
    else if (top === "gate") labels.add("위험회피 게이트");
    else if (top === "risk") labels.add("리스크");
  }
  return [...labels];
}

const finite = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);

export function validateConfig(cfg: StrategyConfig, model: AnalysisModel): FieldError[] {
  const errs: FieldError[] = [];
  const err = (path: string, msg: string) => errs.push({ path, msg });

  for (const [market, weights] of Object.entries(cfg.groupWeights)) {
    let sum = 0;
    for (const [g, w] of Object.entries(weights)) {
      if (!finite(w) || w < 0 || w > MAX_WEIGHT) err(`groupWeights.${market}.${g}`, `0 이상 ${MAX_WEIGHT} 이하여야 합니다.`);
      else sum += w;
    }
    if (sum <= 0) err(`groupWeights.${market}`, "적어도 한 그룹의 비중은 0보다 커야 합니다.");
  }
  for (const [s, w] of Object.entries(cfg.subgroupWeights)) {
    if (!finite(w) || w < 0 || w > MAX_WEIGHT) err(`subgroupWeights.${s}`, `0 이상 ${MAX_WEIGHT} 이하여야 합니다.`);
  }

  let active = 0;
  for (const spec of model.factors) {
    const fc = cfg.factors[spec.key];
    if (!fc) continue;
    const base = `factors.${spec.key}`;
    if (!finite(fc.weight) || fc.weight < 0 || fc.weight > MAX_WEIGHT) err(`${base}.weight`, `0 이상 ${MAX_WEIGHT} 이하여야 합니다.`);
    else if (fc.enabled && fc.weight > 0) active++;
    for (const p of spec.params) {
      const v = fc.params[p.key];
      const path = `${base}.params.${p.key}`;
      if (!finite(v) || v < p.min || v > p.max) err(path, `${p.min} ~ ${p.max} 범위여야 합니다.`);
      else if (p.integer && !Number.isInteger(v)) err(path, "정수여야 합니다.");
    }
    for (const [small, large] of spec.ordered) {
      const a = fc.params[small];
      const b = fc.params[large];
      if (finite(a) && finite(b) && !(a < b)) {
        err(`${base}.params.${large}`, `${spec.params.find((p) => p.key === small)?.label}보다 커야 합니다.`);
      }
    }
    for (const b of spec.bands) {
      const band = fc.bands[b.name];
      if (!band) continue;
      const path = `${base}.bands.${b.name}`;
      if (band.xs.length < 2 || band.xs.length > MAX_BAND_POINTS) err(`${path}.xs`, `점은 2~${MAX_BAND_POINTS}개여야 합니다.`);
      if (band.xs.length !== band.ys.length) err(`${path}.ys`, "x 와 점수 개수가 같아야 합니다.");
      if (!band.xs.every(finite) || band.xs.some((x, i) => i > 0 && x <= band.xs[i - 1])) {
        err(`${path}.xs`, "x 값은 순서대로 커져야 합니다.");
      }
      if (!band.ys.every((y) => finite(y) && y >= -1 && y <= 1)) err(`${path}.ys`, "점수는 -1 ~ 1 범위여야 합니다.");
    }
  }
  if (active === 0) err("factors", "사용하는 팩터가 하나 이상 있어야 합니다.");

  const s = cfg.signal;
  if (![s.strongSell, s.sell, s.buy, s.strongBuy].every(finite) ||
      !(0 <= s.strongSell && s.strongSell < s.sell && s.sell < s.buy && s.buy < s.strongBuy && s.strongBuy <= 100)) {
    err("signal", "0 ≤ 강한 매도 < 매도 < 매수 < 강한 매수 ≤ 100 이어야 합니다.");
  }
  if (!finite(cfg.gate.threshold) || cfg.gate.threshold < -1 || cfg.gate.threshold > 1) err("gate.threshold", "-1 ~ 1 범위여야 합니다.");
  const r = cfg.risk;
  const ranges: [keyof StrategyConfig["risk"], number, number][] = [
    ["stopAtrStock", 0.1, 10], ["stopAtrCrypto", 0.1, 10], ["target1R", 0.1, 20], ["target2R", 0.1, 20],
    ["maxPositionStock", 0.01, 1], ["maxPositionCrypto", 0.01, 1],
  ];
  for (const [k, lo, hi] of ranges) {
    if (!finite(r[k]) || r[k] < lo || r[k] > hi) err(`risk.${k}`, `${lo} ~ ${hi} 범위여야 합니다.`);
  }
  if (finite(r.target1R) && finite(r.target2R) && r.target1R > r.target2R) err("risk.target2R", "1차 목표보다 크거나 같아야 합니다.");
  return errs;
}

/** 경로(또는 그 하위)에 해당하는 오류 메시지 */
export function errorAt(errors: FieldError[], path: string): string | undefined {
  return errors.find((e) => e.path === path || e.path.startsWith(`${path}.`))?.msg;
}
