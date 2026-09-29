import { describe, expect, it } from "vitest";
import { bandCurve, formatValue, interp, normalizeWeights } from "./bands";

// RSI 기본 밴드 (backend-python app/analysis/model/catalog.py)
const XS = [20, 30, 50, 65, 75, 85];
const YS = [0.2, -0.2, 0, 0.8, 0.3, -0.6];

describe("interp (np.interp 와 동일)", () => {
  it("구간 안은 선형 보간", () => {
    // np.interp(58.2, XS, YS) = 0 + (8.2 / 15) * 0.8
    expect(interp(58.2, XS, YS)).toBeCloseTo(0.437333, 6);
    expect(interp(25, XS, YS)).toBeCloseTo(0, 10);
    expect(interp(65, XS, YS)).toBe(0.8);
  });
  it("양 끝 밖은 끝값", () => {
    expect(interp(5, XS, YS)).toBe(0.2);
    expect(interp(99, XS, YS)).toBe(-0.6);
  });
  it("clip_lin(x, 0.05) 는 밴드 [-0.05, 0.05] → [-1, 1] 과 같다", () => {
    expect(interp(0.02, [-0.05, 0.05], [-1, 1])).toBeCloseTo(0.4, 10);
    expect(interp(0.2, [-0.05, 0.05], [-1, 1])).toBe(1);
  });
});

describe("bandCurve", () => {
  it("양 끝을 연장하고 범위 밖 현재값을 포함한다", () => {
    const pts = bandCurve([0, 10], [-1, 1], 30);
    expect(pts[0]).toEqual({ x: -2, y: -1 });
    expect(pts[pts.length - 1]).toEqual({ x: 30, y: 1 });
  });
});

describe("formatValue / normalizeWeights", () => {
  it("단위별 표시", () => {
    expect(formatValue(0.1234, "pct")).toBe("12.3%");
    expect(formatValue(-0.012, "pct")).toBe("-1.20%");
    expect(formatValue(null, "number")).toBe("-");
    expect(formatValue("코스피", "text")).toBe("코스피");
  });
  it("비중 정규화", () => {
    expect(normalizeWeights({ a: 1, b: 3 })).toEqual({ a: 0.25, b: 0.75 });
    expect(normalizeWeights({ a: 0, b: 0 })).toEqual({ a: 0, b: 0 });
  });
});
