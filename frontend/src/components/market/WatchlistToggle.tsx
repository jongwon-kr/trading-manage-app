import { Star } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useAddWatchlistItemMutation, useGetWatchlistQuery, useRemoveWatchlistItemMutation } from "@/api/watchlist.api";
import type { SymbolInfo } from "@/types/market.types";

/** 종목 상세 헤더의 관심종목 별 토글 */
export function WatchlistToggle({ symbol }: { symbol: SymbolInfo }) {
  const { data: items = [] } = useGetWatchlistQuery();
  const [add, { isLoading: adding }] = useAddWatchlistItemMutation();
  const [remove, { isLoading: removing }] = useRemoveWatchlistItemMutation();
  const existing = items.find((i) => i.market === symbol.market && i.code === symbol.code);

  const toggle = async () => {
    try {
      if (existing) {
        await remove(existing.id).unwrap();
        toast.success("관심종목에서 삭제했습니다.");
      } else {
        await add({ market: symbol.market, code: symbol.code, name: symbol.name }).unwrap();
        toast.success("관심종목에 추가했습니다.");
      }
    } catch (e) {
      toast.error((e as { message?: string }).message ?? "관심종목 변경에 실패했습니다.");
    }
  };

  return (
    <Button variant="outline" size="sm" onClick={toggle} disabled={adding || removing || (existing?.id ?? 0) < 0}
            className="gap-1.5" aria-pressed={!!existing}>
      <Star className={existing ? "h-4 w-4 fill-amber-400 text-amber-400" : "h-4 w-4"} />
      {existing ? "관심종목" : "관심 추가"}
    </Button>
  );
}
