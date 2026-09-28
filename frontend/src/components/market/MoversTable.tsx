import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCompact, formatPrice } from "@/lib/format";
import { symbolPath } from "@/lib/market";
import { PriceChange } from "./PriceChange";
import type { Quote } from "@/types/market.types";

interface Props {
  title: string;
  quotes: Quote[] | undefined;
  loading?: boolean;
  /** 거래대금 컬럼 표시 (없으면 거래량) */
  showValue?: boolean;
}

export function MoversTable({ title, quotes, loading, showValue }: Props) {
  const navigate = useNavigate();
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="px-2 pb-2">
        {loading ? (
          <div className="space-y-2 p-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-8 w-full" />
            ))}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>종목</TableHead>
                <TableHead className="text-right">현재가</TableHead>
                <TableHead className="text-right">등락률</TableHead>
                <TableHead className="hidden text-right sm:table-cell">{showValue ? "거래대금" : "거래량"}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(quotes ?? []).map((q) => (
                <TableRow key={q.key} className="cursor-pointer" onClick={() => navigate(symbolPath(q.market, q.code))}>
                  <TableCell className="max-w-[140px]">
                    <p className="truncate font-medium">{q.name ?? q.code}</p>
                    <p className="text-xs text-muted-foreground">{q.code}</p>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{formatPrice(q.price, q.market)}</TableCell>
                  <TableCell className="text-right">
                    <PriceChange changeRate={q.changeRate} />
                  </TableCell>
                  <TableCell className="hidden text-right tabular-nums text-muted-foreground sm:table-cell">
                    {formatCompact(showValue ? q.tradeValue : q.volume)}
                  </TableCell>
                </TableRow>
              ))}
              {quotes && quotes.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="py-6 text-center text-muted-foreground">
                    데이터가 없습니다.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
