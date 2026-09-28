import { Card, CardContent } from "@/components/ui/card";
import { Sparkline } from "@/components/chart/Sparkline";
import { changeColorClass, formatNumber } from "@/lib/format";
import { PriceChange } from "./PriceChange";
import type { IndexQuote } from "@/types/market.types";

export function IndexCard({ quote }: { quote: IndexQuote }) {
  const first = quote.sparkline[0];
  const last = quote.sparkline[quote.sparkline.length - 1];
  const trend = first && last ? last - first : quote.changeRate;
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate text-sm text-muted-foreground">{quote.name}</p>
            <p className="text-xl font-semibold tabular-nums">
              {formatNumber(quote.price, quote.price >= 1000 ? 0 : 2)}
            </p>
            <PriceChange changeRate={quote.changeRate} className="text-sm" showArrow />
          </div>
          <Sparkline values={quote.sparkline} className={changeColorClass(trend)} />
        </div>
        {quote.delayed && <p className="mt-1 text-[10px] text-muted-foreground">지연 시세</p>}
      </CardContent>
    </Card>
  );
}
