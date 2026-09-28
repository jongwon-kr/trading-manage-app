import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { journalAPI } from "@/api/journal.api";
import { changeColorClass, formatNumber, formatPrice } from "@/lib/format";
import type { MarketCode } from "@/types/market.types";
import { JournalApiDto } from "@/types/journal.types";

/** 종목 상세: 이 종목의 내 매매일지 (Journal 페이지의 목록 상태를 건드리지 않도록 로컬 state 로 조회) */
export function MyTradesCard({ market, code }: { market: MarketCode; code: string }) {
  const [rows, setRows] = useState<JournalApiDto.JournalSummaryResponse[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    // 일지에는 코인을 'BTC' 처럼 적었을 수도 있어 두 형태 모두 조회
    const symbols = market === "CRYPTO" ? [code, code.replace(/^KRW-/, "")] : [code];
    Promise.all(symbols.map((symbol) => journalAPI.search({ symbol, page: 0, size: 20 }).catch(() => null)))
      .then((pages) => {
        if (cancelled) return;
        const byId = new Map<number, JournalApiDto.JournalSummaryResponse>();
        pages.forEach((p) => p?.content.forEach((j) => byId.set(j.id, j)));
        setRows([...byId.values()]);
      });
    return () => {
      cancelled = true;
    };
  }, [market, code]);

  if (!rows || rows.length === 0) return null;
  return (
    <Card>
      <CardHeader className="pb-1">
        <CardTitle className="text-base">내 매매기록 ({rows.length})</CardTitle>
      </CardHeader>
      <CardContent className="px-2">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>유형</TableHead>
              <TableHead className="text-right">수량</TableHead>
              <TableHead className="text-right">진입가</TableHead>
              <TableHead className="text-right">실현손익</TableHead>
              <TableHead>상태</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((j) => (
              <TableRow key={j.id}>
                <TableCell>{j.tradeType}</TableCell>
                <TableCell className="text-right tabular-nums">{formatNumber(j.quantity, 8)}</TableCell>
                <TableCell className="text-right tabular-nums">{formatPrice(j.entryPrice, market)}</TableCell>
                <TableCell className={`text-right tabular-nums ${changeColorClass(j.realizedPnL)}`}>
                  {j.realizedPnL == null ? "-" : formatNumber(j.realizedPnL, 2)}
                </TableCell>
                <TableCell>{j.isClosed ? "종료" : "진행중"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <Link to="/journal" className="block px-2 pt-2 text-right text-xs text-primary hover:underline">
          매매 일지에서 보기 →
        </Link>
      </CardContent>
    </Card>
  );
}
