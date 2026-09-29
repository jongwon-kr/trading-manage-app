import { describe, expect, it } from "vitest";
import model from "./__fixtures__/analysis-model.json";
import { changeLabels, diffPaths, setIn, validateConfig } from "./strategy-config";
import type { AnalysisModel, StrategyConfig } from "@/types/model.types";

// 실제 /api/v1/analysis/model 응답 스냅샷 (backend-python catalog 기본값)
const M = model as unknown as AnalysisModel;
const base = M.defaultConfig;

describe("validateConfig (서버 규칙과 동일)", () => {
  it("기본 설정은 통과", () => {
    expect(validateConfig(base, M)).toEqual([]);
  });
  it.each<[string, (string | number)[], unknown, string]>([
    ["xs 순서", ["factors", "rsi", "bands", "rsi", "xs"], [50, 30, 60, 70, 80, 90], "factors.rsi.bands.rsi.xs"],
    ["ys 범위", ["factors", "rsi", "bands", "rsi", "ys"], [0, 0, 0, 0, 0, 2], "factors.rsi.bands.rsi.ys"],
    ["파라미터 범위", ["factors", "rsi", "params", "period"], 500, "factors.rsi.params.period"],
    ["정수", ["factors", "rsi", "params", "period"], 9.5, "factors.rsi.params.period"],
    ["대소 제약", ["factors", "ma_alignment", "params", "fast"], 80, "factors.ma_alignment.params.mid"],
    ["신호 순서", ["signal", "buy"], 30, "signal"],
    ["목표 순서", ["risk", "target1R"], 5, "risk.target2R"],
  ])("%s", (_name, path, value, expected) => {
    const cfg = setIn<StrategyConfig>(base, path, value);
    expect(validateConfig(cfg, M).map((e) => e.path)).toContain(expected);
  });
  it("모든 팩터를 끄면 거부", () => {
    let cfg = base;
    for (const f of M.factors) cfg = setIn(cfg, ["factors", f.key, "enabled"], false);
    expect(validateConfig(cfg, M).map((e) => e.path)).toContain("factors");
  });
});

describe("diffPaths / changeLabels / setIn", () => {
  it("바뀐 잎 경로와 사람이 읽는 이름", () => {
    let cfg = setIn<StrategyConfig>(base, ["factors", "rsi", "params", "period"], 9);
    cfg = setIn(cfg, ["factors", "rsi", "bands", "rsi", "ys"], [0, 0, 0, 1, 0, 0]);
    cfg = setIn(cfg, ["gate", "enabled"], false);
    const paths = diffPaths(base, cfg);
    expect(paths.sort()).toEqual(["factors.rsi.bands.rsi.ys", "factors.rsi.params.period", "gate.enabled"]);
    expect(changeLabels(paths, M, cfg)).toEqual(["RSI(9)", "위험회피 게이트"]);
    expect(base.factors.rsi.params.period).toBe(14); // 원본 불변
  });
});
