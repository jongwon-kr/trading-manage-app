import { SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { INTERVAL_LABELS } from "@/lib/market";
import type { Interval } from "@/types/market.types";
import type { IndicatorSettings } from "./indicator-settings";

const INDICATOR_LABELS: { key: keyof IndicatorSettings; label: string; group: "overlay" | "pane" }[] = [
  { key: "ma20", label: "이동평균 20", group: "overlay" },
  { key: "ma60", label: "이동평균 60", group: "overlay" },
  { key: "ma120", label: "이동평균 120", group: "overlay" },
  { key: "bb", label: "볼린저 밴드 (20, 2)", group: "overlay" },
  { key: "volume", label: "거래량", group: "overlay" },
  { key: "rsi", label: "RSI (14)", group: "pane" },
  { key: "macd", label: "MACD (12, 26, 9)", group: "pane" },
];

interface Props {
  intervals: Interval[];
  interval: Interval;
  onIntervalChange: (interval: Interval) => void;
  indicators: IndicatorSettings;
  onIndicatorsChange: (next: IndicatorSettings) => void;
}

export function ChartToolbar({ intervals, interval, onIntervalChange, indicators, onIndicatorsChange }: Props) {
  const toggle = (key: keyof IndicatorSettings) => onIndicatorsChange({ ...indicators, [key]: !indicators[key] });
  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <div className="flex flex-wrap gap-1 rounded-md bg-muted p-1">
        {intervals.map((iv) => (
          <Button
            key={iv}
            size="sm"
            variant={iv === interval ? "default" : "ghost"}
            className="h-7 px-2.5 text-xs"
            onClick={() => onIntervalChange(iv)}
          >
            {INTERVAL_LABELS[iv]}
          </Button>
        ))}
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="h-8 gap-2">
            <SlidersHorizontal className="h-4 w-4" />
            지표
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52">
          <DropdownMenuLabel>차트 위</DropdownMenuLabel>
          {INDICATOR_LABELS.filter((i) => i.group === "overlay").map((i) => (
            <DropdownMenuCheckboxItem
              key={i.key}
              checked={indicators[i.key]}
              onCheckedChange={() => toggle(i.key)}
              onSelect={(e) => e.preventDefault()}
            >
              {i.label}
            </DropdownMenuCheckboxItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuLabel>보조 차트</DropdownMenuLabel>
          {INDICATOR_LABELS.filter((i) => i.group === "pane").map((i) => (
            <DropdownMenuCheckboxItem
              key={i.key}
              checked={indicators[i.key]}
              onCheckedChange={() => toggle(i.key)}
              onSelect={(e) => e.preventDefault()}
            >
              {i.label}
            </DropdownMenuCheckboxItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
