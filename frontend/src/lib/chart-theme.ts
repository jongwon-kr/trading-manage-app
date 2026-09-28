import { ColorType, type DeepPartial, type ChartOptions } from "lightweight-charts";

// 캔버스는 CSS 변수를 읽지 못하므로 hex 로 둔다. index.css 의 --price-up/--price-down 과 값을 맞춘다.
export const CHART_COLORS = {
  light: {
    up: "#e5383b",
    down: "#1f63ee",
    text: "#52525b",
    grid: "#f4f4f5",
    border: "#e4e4e7",
    background: "#ffffff",
  },
  dark: {
    up: "#f16466",
    down: "#528ff5",
    text: "#a1a1aa",
    grid: "#27272a",
    border: "#3f3f46",
    background: "#09090b",
  },
} as const;

// 보조 지표 선 색 (테마 공통)
export const LINE_COLORS = {
  ma20: "#f59e0b",
  ma60: "#10b981",
  ma120: "#8b5cf6",
  bb: "#94a3b8",
  rsi: "#8b5cf6",
  macd: "#0ea5e9",
  signal: "#f59e0b",
  entry: "#0ea5e9",
  stop: "#ef4444",
  target: "#22c55e",
};

export type ChartPalette = (typeof CHART_COLORS)["light"] | (typeof CHART_COLORS)["dark"];

export function chartPalette(isDark: boolean): ChartPalette {
  return isDark ? CHART_COLORS.dark : CHART_COLORS.light;
}

export function chartThemeOptions(isDark: boolean): DeepPartial<ChartOptions> {
  const c = chartPalette(isDark);
  return {
    layout: {
      background: { type: ColorType.Solid, color: c.background },
      textColor: c.text,
      attributionLogo: true, // TradingView lightweight-charts 라이선스 표기
      panes: { separatorColor: c.border },
    },
    grid: { vertLines: { color: c.grid }, horzLines: { color: c.grid } },
    rightPriceScale: { borderColor: c.border },
    timeScale: { borderColor: c.border },
  };
}
