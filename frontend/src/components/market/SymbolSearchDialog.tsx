import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useSearchSymbolsQuery } from "@/api/market.api";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { MARKET_LABELS, MARKETS, symbolPath } from "@/lib/market";
import { cn } from "@/utils/shadcn-util";
import type { MarketCode } from "@/types/market.types";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** 종목 검색 팔레트 (Ctrl/⌘+K). 검색은 서버에서 하므로 cmdk 자체 필터는 끈다. */
export function SymbolSearchDialog({ open, onOpenChange }: Props) {
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [market, setMarket] = useState<MarketCode | undefined>();
  const debounced = useDebouncedValue(q.trim(), 250);
  const { data = [], isFetching } = useSearchSymbolsQuery(
    { q: debounced, market, limit: 20 },
    { skip: !debounced || !open }
  );

  const select = (m: MarketCode, code: string) => {
    onOpenChange(false);
    setQ("");
    navigate(symbolPath(m, code));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="overflow-hidden p-0 max-w-xl">
        <DialogTitle className="sr-only">종목 검색</DialogTitle>
        <Command shouldFilter={false} className="[&_[cmdk-input]]:h-12 [&_[cmdk-item]]:py-2.5">
          <CommandInput placeholder="종목명 또는 코드 (예: 삼성전자, AAPL, 비트코인)" value={q} onValueChange={setQ} />
          <div className="flex gap-1 border-b px-3 py-2">
            {[undefined, ...MARKETS].map((m) => (
              <button
                key={m ?? "ALL"}
                type="button"
                onClick={() => setMarket(m)}
                className={cn(
                  "rounded-full px-3 py-1 text-xs transition-colors",
                  market === m ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-accent"
                )}
              >
                {m ? MARKET_LABELS[m] : "전체"}
              </button>
            ))}
          </div>
          <CommandList className="max-h-[360px]">
            {debounced && !isFetching && <CommandEmpty>검색 결과가 없습니다.</CommandEmpty>}
            {data.length > 0 && (
              <CommandGroup heading="종목">
                {data.map((s) => (
                  <CommandItem key={`${s.market}:${s.code}`} value={`${s.market}:${s.code}`} onSelect={() => select(s.market, s.code)}>
                    <div className="flex w-full items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate font-medium">{s.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {s.code} · {s.exchange}
                        </p>
                      </div>
                      <Badge variant="outline" className="shrink-0">
                        {MARKET_LABELS[s.market]}
                      </Badge>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </DialogContent>
    </Dialog>
  );
}
