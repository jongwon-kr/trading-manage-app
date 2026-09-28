import { describe, expect, it } from "vitest";
import { applyTick, isTailUpdate } from "./candles";
import type { Candle } from "@/types/market.types";

const bar = (time: number, close = 1): Candle => ({ time, open: 1, high: 1, low: 1, close, volume: 1 });

describe("candles", () => {
  it("꼬리만 바뀐 경우를 판별", () => {
    const prev = [bar(0), bar(60), bar(120)];
    expect(isTailUpdate(prev, [bar(0), bar(60), bar(120, 2)])).toBe(true); // 마지막 봉 갱신
    expect(isTailUpdate(prev, [bar(0), bar(60), bar(120), bar(180)])).toBe(true); // 새 봉 추가
    expect(isTailUpdate(prev, [bar(60), bar(120), bar(180)])).toBe(false); // 앞이 밀림
    expect(isTailUpdate(prev, [bar(0), bar(60)])).toBe(false);
    expect(isTailUpdate([], [bar(0)])).toBe(false);
  });

  it("같은 봉 안의 tick 은 고가·저가·종가·거래량을 갱신", () => {
    const last: Candle = { time: 120, open: 100, high: 105, low: 99, close: 101, volume: 10 };
    const next = applyTick(last, 107, 150_000, "1m", 2);
    expect(next).toEqual({ time: 120, open: 100, high: 107, low: 99, close: 107, volume: 12 });
  });

  it("봉 경계를 넘으면 새 봉", () => {
    const last: Candle = { time: 120, open: 100, high: 105, low: 99, close: 101, volume: 10 };
    const next = applyTick(last, 102, 185_000, "1m", 3);
    expect(next).toEqual({ time: 180, open: 102, high: 102, low: 102, close: 102, volume: 3 });
  });
});
