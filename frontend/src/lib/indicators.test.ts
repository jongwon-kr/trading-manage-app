import { describe, expect, it } from "vitest";
import { bollinger, ema, macd, rsi, sma } from "./indicators";

// StockCharts ChartSchool RSI(14) 예제 (Wilder). backend-python 테스트와 같은 기준값을 쓴다.
const CLOSES = [
  44.3389, 44.0902, 44.1497, 43.6124, 44.2779, 44.9951, 45.2461, 45.4238, 45.8411, 46.0826, 45.8931, 46.0328, 45.614,
  46.282, 46.282, 46.0028, 46.0328, 46.4116, 46.2222, 45.6439,
];
const EXPECTED_RSI = [70.53, 66.32, 66.55, 69.41, 66.36, 57.97];

describe("indicators", () => {
  it("SMA 는 period-1 까지 null", () => {
    expect(sma([1, 2, 3, 4], 2)).toEqual([null, 1.5, 2.5, 3.5]);
  });

  it("EMA 는 첫 period 개의 SMA 로 시작", () => {
    const out = ema([1, 2, 3, 4, 5], 3);
    expect(out.slice(0, 2)).toEqual([null, null]);
    expect(out[2]).toBe(2);
    expect(out[3]).toBeCloseTo(3, 10); // 4*0.5 + 2*0.5
    expect(out[4]).toBeCloseTo(4, 10);
  });

  it("RSI(14) 는 Wilder 평활 — StockCharts 예제와 일치", () => {
    const out = rsi(CLOSES, 14);
    expect(out.slice(0, 14).every((v) => v === null)).toBe(true);
    out.slice(14).forEach((v, i) => expect(v).toBeCloseTo(EXPECTED_RSI[i], 1));
  });

  it("RSI 는 하락이 없으면 100", () => {
    const out = rsi(Array.from({ length: 20 }, (_, i) => i + 1), 14);
    expect(out[19]).toBe(100);
  });

  it("볼린저 밴드는 모집단 표준편차", () => {
    const { upper, middle, lower } = bollinger([2, 4, 4, 4, 5, 5, 7, 9], 8, 2);
    expect(middle[7]).toBe(5);
    expect(upper[7]).toBe(9); // σ = 2
    expect(lower[7]).toBe(1);
  });

  it("MACD 히스토그램 = MACD - 시그널", () => {
    const values = Array.from({ length: 60 }, (_, i) => 100 + Math.sin(i / 3) * 5 + i * 0.2);
    const m = macd(values);
    const i = 59;
    expect(m.histogram[i]).toBeCloseTo((m.macd[i] as number) - (m.signal[i] as number), 10);
    expect(m.signal[25 + 7]).toBeNull(); // slow(26) + signal(9) - 2 이전은 null
    expect(m.signal[25 + 8]).not.toBeNull();
  });
});
