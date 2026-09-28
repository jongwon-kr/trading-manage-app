import { ArrowDown, ArrowUp } from "lucide-react";
import { changeColorClass, formatPercent, formatSigned } from "@/lib/format";
import { cn } from "@/utils/shadcn-util";
import type { MarketCode } from "@/types/market.types";

interface Props {
  changeRate: number;
  changePrice?: number;
  market?: MarketCode;
  precision?: number | null;
  showArrow?: boolean;
  className?: string;
}

/** 등락률(과 등락폭) 표시. 색·부호·화살표 규칙을 한 곳에서 관리한다. */
export function PriceChange({ changeRate, changePrice, market, precision, showArrow = false, className }: Props) {
  const Icon = changeRate > 0 ? ArrowUp : changeRate < 0 ? ArrowDown : null;
  return (
    <span className={cn("inline-flex items-center gap-1 tabular-nums", changeColorClass(changeRate), className)}>
      {showArrow && Icon && <Icon className="h-3.5 w-3.5" />}
      {changePrice != null && market && <span>{formatSigned(changePrice, market, precision)}</span>}
      <span>{formatPercent(changeRate)}</span>
    </span>
  );
}
