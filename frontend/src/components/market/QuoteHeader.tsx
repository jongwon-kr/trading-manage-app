import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { changeColorClass, formatCompact, formatPrice } from "@/lib/format";
import { MARKET_LABELS } from "@/lib/market";
import { PriceChange } from "./PriceChange";
import type { Quote, SymbolInfo } from "@/types/market.types";

interface Props {
  symbol: SymbolInfo;
  quote: Quote | undefined;
  /** 우측 액션 영역 (관심종목 토글 등) */
  actions?: ReactNode;
}

export function QuoteHeader({ symbol, quote, actions }: Props) {
  const p = symbol.pricePrecision;
  const stats: [string, string][] = quote
    ? [
        ["시가", formatPrice(quote.open, symbol.market, p)],
        ["고가", formatPrice(quote.high, symbol.market, p)],
        ["저가", formatPrice(quote.low, symbol.market, p)],
        ["전일", formatPrice(quote.prevClose, symbol.market, p)],
        [symbol.market === "CRYPTO" ? "거래량(24h)" : "거래량", formatCompact(quote.volume)],
        [symbol.market === "CRYPTO" ? "거래대금(24h)" : "거래대금", formatCompact(quote.tradeValue)],
      ]
    : [];

  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div className="space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-2xl font-bold">{symbol.name}</h2>
          <span className="text-sm text-muted-foreground">
            {symbol.code} · {symbol.exchange}
          </span>
          <Badge variant="outline">{MARKET_LABELS[symbol.market]}</Badge>
          {symbol.warning && <Badge variant="destructive">{symbol.warning === "WARNING" ? "투자유의" : "주의"}</Badge>}
          {quote?.delayed && <Badge variant="secondary">지연 시세</Badge>}
        </div>
        {quote ? (
          <div className="flex items-baseline gap-3">
            <span className={`text-3xl font-bold tabular-nums ${changeColorClass(quote.changeRate)}`}>
              {formatPrice(quote.price, symbol.market, p)}
            </span>
            <PriceChange
              changeRate={quote.changeRate}
              changePrice={quote.changePrice}
              market={symbol.market}
              precision={p}
              showArrow
              className="text-base"
            />
          </div>
        ) : (
          <Skeleton className="h-9 w-56" />
        )}
      </div>
      <div className="flex items-end gap-6">
        <dl className="hidden grid-cols-3 gap-x-6 gap-y-1 text-sm lg:grid">
          {stats.map(([k, v]) => (
            <div key={k} className="flex justify-between gap-3">
              <dt className="text-muted-foreground">{k}</dt>
              <dd className="tabular-nums">{v}</dd>
            </div>
          ))}
        </dl>
        {actions}
      </div>
    </div>
  );
}
