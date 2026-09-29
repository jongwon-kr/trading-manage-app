import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useGetTrendGroupQuery } from "@/api/market.api";
import { changeColorClass, formatCompact, formatPercent, formatPrice } from "@/lib/format";
import { symbolPath } from "@/lib/market";
import type { MarketCode } from "@/types/market.types";
import type { TrendGroup } from "@/types/trends.types";

export interface GroupRef {
  market: MarketCode;
  kind: TrendGroup["kind"];
  id: string;
  name: string;
}

/** 업종·테마(KR)·섹터(US) 구성 종목. 종목을 누르면 상세 화면으로 */
export function GroupStocksDialog({ group, onClose }: { group: GroupRef | null; onClose: () => void }) {
  const navigate = useNavigate();
  const { data, isFetching, isError } = useGetTrendGroupQuery(
    group ?? { market: "KR_STOCK", kind: "industry", id: "0" }, { skip: !group });
  const stocks = data?.stocks ?? [];
  const isUs = group?.market === "US_STOCK";

  return (
    <Dialog open={group != null} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{group?.name}</DialogTitle>
          <DialogDescription>
            {isUs ? "섹터 시가총액 상위 기업 (yfinance)" : "구성 종목 — 오늘 등락률 순 (네이버 금융)"}
          </DialogDescription>
        </DialogHeader>
        {isFetching && !data && <Skeleton className="h-60 w-full" />}
        {isError && <p className="text-sm text-muted-foreground">구성 종목을 불러오지 못했습니다.</p>}
        {data && stocks.length === 0 && <p className="text-sm text-muted-foreground">구성 종목 정보가 없습니다.</p>}
        {stocks.length > 0 && group && (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>종목</TableHead>
                <TableHead className="text-right">현재가</TableHead>
                <TableHead className="text-right">등락률</TableHead>
                <TableHead className="text-right">{isUs ? "섹터 비중" : "거래대금"}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {stocks.map((s) => (
                <TableRow key={s.code} className="cursor-pointer"
                          onClick={() => { onClose(); navigate(symbolPath(group.market, s.code)); }}>
                  <TableCell>
                    <span className="font-medium">{s.name ?? s.code}</span>
                    <span className="ml-1 text-xs text-muted-foreground">{s.code}</span>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{formatPrice(s.price, group.market)}</TableCell>
                  <TableCell className={`text-right tabular-nums ${changeColorClass(s.changeRate)}`}>{formatPercent(s.changeRate)}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {isUs ? formatPercent(s.weight, 1, false) : formatCompact(s.tradeValue)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </DialogContent>
    </Dialog>
  );
}
