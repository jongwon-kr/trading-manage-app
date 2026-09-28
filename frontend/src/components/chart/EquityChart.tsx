import { useEffect, useRef } from "react";
import { useTheme } from "next-themes";
import { AreaSeries, createChart, LineSeries, type IChartApi, type Time, type UTCTimestamp } from "lightweight-charts";
import { chartPalette, chartThemeOptions } from "@/lib/chart-theme";
import { formatCompact } from "@/lib/format";
import type { EquityPoint } from "@/types/strategy.types";

const dateFmt = new Intl.DateTimeFormat("ko-KR", { timeZone: "UTC", year: "numeric", month: "2-digit", day: "2-digit" });

/** 백테스트 자산 곡선 (전략 vs 보유) + 하단 낙폭 pane */
export function EquityChart({ points, height = 380 }: { points: EquityPoint[]; height?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  useEffect(() => {
    if (!ref.current) return;
    const c = chartPalette(isDark);
    const chart = createChart(ref.current, {
      autoSize: true,
      ...chartThemeOptions(isDark),
      localization: {
        locale: "ko-KR",
        timeFormatter: (t: Time) => dateFmt.format(new Date((t as number) * 1000)),
        priceFormatter: (p: number) => formatCompact(p),
      },
    });
    chartRef.current = chart;
    const time = (p: EquityPoint) => p.time as UTCTimestamp;

    const strategy = chart.addSeries(LineSeries, { color: c.up, lineWidth: 2, title: "전략" });
    strategy.setData(points.map((p) => ({ time: time(p), value: p.equity })));
    const hold = chart.addSeries(LineSeries, { color: c.text, lineWidth: 1, lineStyle: 2, title: "보유" });
    hold.setData(points.map((p) => ({ time: time(p), value: p.benchmark })));

    const dd = chart.addSeries(
      AreaSeries,
      {
        lineColor: c.down,
        topColor: `${c.down}10`,
        bottomColor: `${c.down}66`,
        lineWidth: 1,
        priceFormat: { type: "percent" },
        title: "낙폭",
      },
      1
    );
    dd.setData(points.map((p) => ({ time: time(p), value: p.drawdown * 100 })));
    chart.panes()[1]?.setHeight(100);
    chart.timeScale().fitContent();
    return () => {
      chart.remove();
      chartRef.current = null;
    };
  }, [points, isDark]);

  return <div ref={ref} style={{ height }} className="w-full" />;
}
