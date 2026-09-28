import type { Candle, Interval } from "@/types/market.types";
import { INTERVAL_SECONDS } from "@/lib/market";

/** 새 캔들 배열이 기존 배열의 '꼬리만 바뀐' 형태인지 판단 → 차트에 update() 로 반영 가능 */
export function isTailUpdate(prev: Candle[], next: Candle[]): boolean {
  if (prev.length === 0 || next.length === 0) return false;
  if (prev[0].time !== next[0].time) return false;
  const diff = next.length - prev.length;
  if (diff < 0 || diff > 2) return false;
  // 마지막 봉 이전까지 동일한 시각이면 꼬리 갱신으로 본다
  const lastCommon = prev.length - 1;
  return next[lastCommon]?.time === prev[lastCommon].time;
}

/**
 * 실시간 체결가를 현재 봉에 반영한다. 봉 경계를 넘으면 새 봉을 만든다.
 * 분·시간봉에만 사용 (일봉 이상은 거래소 기준 시각이 달라 서버 캔들을 다시 받는다).
 * volumeDelta: 직전 tick 대비 누적 거래량 증가분
 */
export function applyTick(last: Candle | undefined, price: number, tsMs: number, interval: Interval,
                          volumeDelta: number): Candle {
  const step = INTERVAL_SECONDS[interval];
  const barTime = Math.floor(tsMs / 1000 / step) * step;
  if (!last || barTime > last.time) {
    return { time: barTime, open: price, high: price, low: price, close: price, volume: Math.max(volumeDelta, 0) };
  }
  return {
    ...last,
    high: Math.max(last.high, price),
    low: Math.min(last.low, price),
    close: price,
    volume: last.volume + Math.max(volumeDelta, 0),
  };
}
