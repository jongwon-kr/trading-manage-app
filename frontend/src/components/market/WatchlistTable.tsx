import { Link, useNavigate } from "react-router-dom";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useGetWatchlistQuery, useRemoveWatchlistItemMutation } from "@/api/watchlist.api";
import { useLivePrices } from "@/hooks/useLivePrices";
import { formatCompact, formatPrice } from "@/lib/format";
import { MARKET_LABELS, quoteKey, symbolPath } from "@/lib/market";
import { PriceChange } from "./PriceChange";

interface Props {
  limit?: number;
  /** 대시보드 위젯 등에서 삭제 버튼 숨김 */
  readOnly?: boolean;
}

export function WatchlistTable({ limit, readOnly }: Props) {
  const navigate = useNavigate();
  const { data: all = [], isLoading } = useGetWatchlistQuery();
  const items = limit ? all.slice(0, limit) : all;
  const prices = useLivePrices(items);
  const [remove] = useRemoveWatchlistItemMutation();

  if (isLoading) return <Skeleton className="h-40 w-full" />;
  if (items.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        관심종목이 없습니다. 종목 상세에서 <span className="font-medium">관심 추가</span>를 누르거나{" "}
        <Link to="/market" className="text-primary hover:underline">시장</Link>에서 종목을 찾아보세요.
      </p>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>종목</TableHead>
          <TableHead className="hidden sm:table-cell">시장</TableHead>
          <TableHead className="text-right">현재가</TableHead>
          <TableHead className="text-right">등락률</TableHead>
          <TableHead className="hidden text-right md:table-cell">거래대금</TableHead>
          {!readOnly && <TableHead className="w-10" />}
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.map((item) => {
          const q = prices.get(quoteKey(item.market, item.code));
          return (
            <TableRow key={item.id} className="cursor-pointer" onClick={() => navigate(symbolPath(item.market, item.code))}>
              <TableCell>
                <p className="font-medium">{item.name}</p>
                <p className="text-xs text-muted-foreground">{item.code}</p>
              </TableCell>
              <TableCell className="hidden sm:table-cell">
                <Badge variant="outline">{MARKET_LABELS[item.market]}</Badge>
              </TableCell>
              <TableCell className="text-right tabular-nums">{q ? formatPrice(q.price, item.market) : "-"}</TableCell>
              <TableCell className="text-right">{q ? <PriceChange changeRate={q.changeRate} /> : "-"}</TableCell>
              <TableCell className="hidden text-right tabular-nums text-muted-foreground md:table-cell">
                {formatCompact(q?.tradeValue)}
              </TableCell>
              {!readOnly && (
                <TableCell>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    aria-label={`${item.name} 삭제`}
                    onClick={(e) => {
                      e.stopPropagation();
                      remove(item.id).unwrap().catch(() => toast.error("삭제에 실패했습니다."));
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TableCell>
              )}
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
