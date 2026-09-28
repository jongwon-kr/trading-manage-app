import { Badge } from "@/components/ui/badge";
import { cn } from "@/utils/shadcn-util";
import type { Strength } from "@/types/strategy.types";

const STYLES: Record<Strength, { label: string; className: string }> = {
  STRONG_BUY: { label: "강한 매수", className: "bg-price-up text-white hover:bg-price-up" },
  BUY: { label: "매수", className: "bg-price-up/80 text-white hover:bg-price-up/80" },
  HOLD: { label: "관망", className: "bg-muted text-foreground hover:bg-muted" },
  SELL: { label: "매도", className: "bg-price-down/80 text-white hover:bg-price-down/80" },
  STRONG_SELL: { label: "강한 매도", className: "bg-price-down text-white hover:bg-price-down" },
};

export function SignalBadge({ strength, className }: { strength: Strength; className?: string }) {
  const s = STYLES[strength];
  return <Badge className={cn("px-3 py-1 text-sm", s.className, className)}>{s.label}</Badge>;
}
