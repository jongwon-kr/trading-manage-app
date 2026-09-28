import { useEffect, useRef, useState } from "react";
import { useTheme } from "next-themes";
import {
  CandlestickSeries,
  createChart,
  CrosshairMode,
  createSeriesMarkers,
  HistogramSeries,
  LineSeries,
  LineStyle,
  TickMarkType,
  type IChartApi,
  type IPriceLine,
  type ISeriesApi,
  type ISeriesMarkersPluginApi,
  type SeriesMarker,
  type SeriesType,
  type Time,
  type UTCTimestamp,
} from "lightweight-charts";
import { chartPalette, chartThemeOptions, LINE_COLORS } from "@/lib/chart-theme";
import { isTailUpdate } from "@/lib/candles";
import { bollinger, macd, rsi, sma, type Series } from "@/lib/indicators";
import { isIntraday, marketTimeZone } from "@/lib/market";
import { formatCompact, formatPrice, pricePrecision } from "@/lib/format";
import type { Candle, Interval, MarketCode } from "@/types/market.types";
import type { IndicatorSettings } from "./indicator-settings";

export interface PriceLineSpec {
  price: number;
  title: string;
  color: string;
}

interface Props {
  candles: Candle[];
  market: MarketCode;
  interval: Interval;
  /** 종목/주기가 바뀔 때만 화면을 데이터에 맞춘다 (폴링 갱신 시 스크롤 위치 유지) */
  dataKey: string;
  precision?: number | null;
  indicators: IndicatorSettings;
  priceLines?: PriceLineSpec[];
  markers?: SeriesMarker<Time>[];
  /** 실시간 봉 구독 (코인). 콜백은 React 렌더를 거치지 않고 차트에 직접 반영된다 */
  subscribeLive?: (onBar: (bar: Candle) => void) => () => void;
  height?: number;
}

const toTime = (t: number) => t as UTCTimestamp;

function lineData(candles: Candle[], values: Series) {
  const out: { time: UTCTimestamp; value: number }[] = [];
  values.forEach((v, i) => {
    if (v != null && Number.isFinite(v)) out.push({ time: toTime(candles[i].time), value: v });
  });
  return out;
}

export function PriceChart({
  candles,
  market,
  interval,
  dataKey,
  precision,
  indicators,
  priceLines = [],
  markers,
  subscribeLive,
  height = 520,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const volumeRef = useRef<ISeriesApi<"Histogram"> | null>(null);
  const overlayRef = useRef<ISeriesApi<SeriesType>[]>([]);
  const priceLineRef = useRef<IPriceLine[]>([]);
  const markersRef = useRef<ISeriesMarkersPluginApi<Time> | null>(null);
  const prevRef = useRef<{ key: string; candles: Candle[]; isDark: boolean }>({ key: "", candles: [], isDark: false });
  const [legend, setLegend] = useState<Candle | null>(null);

  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const lastPrice = candles.length ? candles[candles.length - 1].close : 0;
  const digits = pricePrecision(market, lastPrice, precision);

  // 1) 차트 생성 (1회)
  useEffect(() => {
    if (!containerRef.current) return;
    const chart = createChart(containerRef.current, { autoSize: true, crosshair: { mode: CrosshairMode.Normal } });
    candleRef.current = chart.addSeries(CandlestickSeries, { borderVisible: false });
    volumeRef.current = chart.addSeries(HistogramSeries, {
      priceScaleId: "",
      priceFormat: { type: "volume" },
      lastValueVisible: false,
      priceLineVisible: false,
    });
    volumeRef.current.priceScale().applyOptions({ scaleMargins: { top: 0.8, bottom: 0 } });
    chartRef.current = chart;

    chart.subscribeCrosshairMove((param) => {
      const bar = candleRef.current && param.seriesData.get(candleRef.current);
      const vol = volumeRef.current && param.seriesData.get(volumeRef.current);
      if (bar && "open" in bar && param.time != null) {
        setLegend({
          time: param.time as number,
          open: bar.open,
          high: bar.high,
          low: bar.low,
          close: bar.close,
          volume: vol && "value" in vol ? vol.value : 0,
        });
      } else {
        setLegend(null);
      }
    });

    return () => {
      chart.remove();
      chartRef.current = null;
      candleRef.current = null;
      volumeRef.current = null;
      overlayRef.current = [];
      priceLineRef.current = [];
      markersRef.current = null;
      prevRef.current = { key: "", candles: [], isDark: false };
    };
  }, []);

  // 2) 테마·시간대·가격 형식
  useEffect(() => {
    const chart = chartRef.current;
    if (!chart || !candleRef.current) return;
    const c = chartPalette(isDark);
    // 일봉 이상은 '거래일 00:00 UTC' 로 오므로 UTC 로 날짜만 표시, 분봉은 거래소 현지 시각
    const intraday = isIntraday(interval);
    const tz = intraday ? marketTimeZone(market) : "UTC";
    const full = new Intl.DateTimeFormat("ko-KR", {
      timeZone: tz,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      ...(intraday ? { hour: "2-digit", minute: "2-digit", hour12: false } : {}),
    });
    const tick = (opts: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat("ko-KR", { timeZone: tz, ...opts });
    const fYear = tick({ year: "numeric" });
    const fMonth = tick({ month: "short" });
    const fDay = tick({ month: "numeric", day: "numeric" });
    const fTime = tick({ hour: "2-digit", minute: "2-digit", hour12: false });

    chart.applyOptions({
      ...chartThemeOptions(isDark),
      localization: {
        locale: "ko-KR",
        timeFormatter: (t: Time) => full.format(new Date((t as number) * 1000)),
        priceFormatter: (p: number) => formatPrice(p, market, digits),
      },
      timeScale: {
        timeVisible: intraday,
        secondsVisible: false,
        tickMarkFormatter: (t: Time, type: TickMarkType) => {
          const d = new Date((t as number) * 1000);
          if (type === TickMarkType.Year) return fYear.format(d);
          if (type === TickMarkType.Month) return fMonth.format(d);
          if (type === TickMarkType.DayOfMonth) return fDay.format(d);
          return fTime.format(d);
        },
      },
    });
    candleRef.current.applyOptions({
      upColor: c.up,
      downColor: c.down,
      wickUpColor: c.up,
      wickDownColor: c.down,
      priceFormat: { type: "price", precision: digits, minMove: 1 / 10 ** digits },
    });
  }, [isDark, market, interval, digits]);

  // 3) 캔들·거래량 데이터
  useEffect(() => {
    const chart = chartRef.current;
    const cs = candleRef.current;
    const vs = volumeRef.current;
    if (!chart || !cs || !vs) return;
    const c = chartPalette(isDark);
    const volColor = (k: Candle) => (k.close >= k.open ? `${c.up}66` : `${c.down}66`);
    const prev = prevRef.current;
    const sameKey = prev.key === dataKey && prev.isDark === isDark;

    if (sameKey && isTailUpdate(prev.candles, candles)) {
      // 폴링으로 마지막 봉만 바뀐 경우: 전체 setData 대신 update (스크롤·줌 유지)
      for (let i = Math.max(prev.candles.length - 1, 0); i < candles.length; i++) {
        const k = candles[i];
        cs.update({ time: toTime(k.time), open: k.open, high: k.high, low: k.low, close: k.close });
        vs.update({ time: toTime(k.time), value: k.volume, color: volColor(k) });
      }
    } else {
      cs.setData(candles.map((k) => ({ time: toTime(k.time), open: k.open, high: k.high, low: k.low, close: k.close })));
      vs.setData(candles.map((k) => ({ time: toTime(k.time), value: k.volume, color: volColor(k) })));
      if (prev.key !== dataKey && candles.length) {
        const n = candles.length;
        chart.timeScale().setVisibleLogicalRange({ from: Math.max(n - 150, 0), to: n + 3 });
      }
    }
    prevRef.current = { key: dataKey, candles, isDark };
  }, [candles, dataKey, isDark]);

  // 4) 보조지표: 설정·데이터가 바뀌면 지표 시리즈와 하단 pane 을 모두 다시 만든다
  //    (토글마다 pane 인덱스를 추적하면 인덱스가 밀리는 버그가 생기기 쉬움 — 재구성 비용은 작다)
  useEffect(() => {
    const chart = chartRef.current;
    if (!chart || !volumeRef.current) return;
    overlayRef.current.forEach((s) => chart.removeSeries(s));
    overlayRef.current = [];
    while (chart.panes().length > 1) chart.removePane(chart.panes().length - 1);

    volumeRef.current.applyOptions({ visible: indicators.volume });
    if (!candles.length) return;
    const closes = candles.map((k) => k.close);
    const add = (values: Series, color: string, pane = 0, width: 1 | 2 = 1, style = LineStyle.Solid) => {
      const s = chart.addSeries(
        LineSeries,
        { color, lineWidth: width, lineStyle: style, priceLineVisible: false, lastValueVisible: pane > 0, crosshairMarkerVisible: false },
        pane
      );
      s.setData(lineData(candles, values));
      overlayRef.current.push(s);
      return s;
    };

    if (indicators.ma20) add(sma(closes, 20), LINE_COLORS.ma20);
    if (indicators.ma60) add(sma(closes, 60), LINE_COLORS.ma60);
    if (indicators.ma120) add(sma(closes, 120), LINE_COLORS.ma120);
    if (indicators.bb) {
      const b = bollinger(closes, 20, 2);
      add(b.upper, LINE_COLORS.bb, 0, 1, LineStyle.Dashed);
      add(b.lower, LINE_COLORS.bb, 0, 1, LineStyle.Dashed);
    }

    let pane = 1;
    if (indicators.rsi) {
      const s = add(rsi(closes, 14), LINE_COLORS.rsi, pane);
      s.createPriceLine({ price: 70, color: "#ef444480", lineStyle: LineStyle.Dotted, lineWidth: 1, axisLabelVisible: false, title: "" });
      s.createPriceLine({ price: 30, color: "#3b82f680", lineStyle: LineStyle.Dotted, lineWidth: 1, axisLabelVisible: false, title: "" });
      chart.panes()[pane]?.setHeight(110);
      pane++;
    }
    if (indicators.macd) {
      const m = macd(closes);
      const c = chartPalette(isDark);
      const hist = chart.addSeries(HistogramSeries, { priceLineVisible: false, lastValueVisible: false }, pane);
      hist.setData(
        m.histogram.flatMap((v, i) =>
          v == null ? [] : [{ time: toTime(candles[i].time), value: v, color: v >= 0 ? `${c.up}99` : `${c.down}99` }]
        )
      );
      overlayRef.current.push(hist);
      add(m.macd, LINE_COLORS.macd, pane);
      add(m.signal, LINE_COLORS.signal, pane);
      chart.panes()[pane]?.setHeight(120);
    }
  }, [candles, indicators, isDark]);

  // 5) 진입·손절·목표 가격선
  useEffect(() => {
    const cs = candleRef.current;
    if (!cs) return;
    priceLineRef.current.forEach((l) => cs.removePriceLine(l));
    priceLineRef.current = priceLines.map((p) =>
      cs.createPriceLine({ price: p.price, color: p.color, lineWidth: 1, lineStyle: LineStyle.Dashed, axisLabelVisible: true, title: p.title })
    );
  }, [priceLines]);

  // 6) 마커 (백테스트 매매 시점 등)
  useEffect(() => {
    const cs = candleRef.current;
    if (!cs) return;
    if (!markersRef.current) markersRef.current = createSeriesMarkers(cs, []);
    markersRef.current.setMarkers(markers ?? []);
  }, [markers]);

  // 7) 실시간 봉 (코인)
  useEffect(() => {
    if (!subscribeLive) return;
    return subscribeLive((bar) => {
      const cs = candleRef.current;
      const vs = volumeRef.current;
      if (!cs || !vs) return;
      const last = prevRef.current.candles[prevRef.current.candles.length - 1];
      if (last && bar.time < last.time) return; // 서버 캔들보다 과거 tick 은 무시
      const c = chartPalette(isDark);
      cs.update({ time: toTime(bar.time), open: bar.open, high: bar.high, low: bar.low, close: bar.close });
      vs.update({ time: toTime(bar.time), value: bar.volume, color: bar.close >= bar.open ? `${c.up}66` : `${c.down}66` });
    });
  }, [subscribeLive, isDark]);

  const shown = legend ?? (candles.length ? candles[candles.length - 1] : null);
  const up = shown ? shown.close >= shown.open : true;

  return (
    <div className="relative w-full" style={{ height }}>
      {shown && (
        <div className="pointer-events-none absolute left-2 top-1 z-10 flex flex-wrap gap-x-3 text-xs tabular-nums">
          {(["open", "high", "low", "close"] as const).map((k) => (
            <span key={k} className="text-muted-foreground">
              {{ open: "시", high: "고", low: "저", close: "종" }[k]}{" "}
              <span className={up ? "text-price-up" : "text-price-down"}>{formatPrice(shown[k], market, digits)}</span>
            </span>
          ))}
          <span className="text-muted-foreground">
            거래량 <span className="text-foreground">{formatCompact(shown.volume)}</span>
          </span>
        </div>
      )}
      <div ref={containerRef} className="h-full w-full" />
    </div>
  );
}
