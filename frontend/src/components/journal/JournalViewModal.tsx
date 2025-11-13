import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { JournalApiDto, MarketType, TradeType } from "@/types/journal.types";
import {
  TrendingUp,
  TrendingDown,
  Calendar,
  DollarSign,
  Package,
  ArrowRight,
  Target,
  FileText,
  Clock,
  CheckCircle2,
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { ko } from "date-fns/locale";

interface JournalViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  journal: JournalApiDto.JournalResponse | null;
  isLoading: boolean;
}

// LocalDateTime (배열 또는 문자열)을 Date 객체로 변환 및 포맷팅
const formatDateTime = (dateStr: JournalApiDto.JournalResponse["entryDate"] | null | undefined): string => {
    if (!dateStr) return "N/A";
    let date: Date;
    try {
        if (typeof dateStr === "string") {
            date = parseISO(dateStr);
        } else if (Array.isArray(dateStr)) {
            date = new Date(dateStr[0], dateStr[1] - 1, dateStr[2], dateStr[3], dateStr[4], dateStr[5]);
        } else {
            return "N/A";
        }
        return format(date, "yyyy년 MM월 dd일 HH:mm", { locale: ko });
    } catch (e) {
        console.error("Invalid date format:", dateStr);
        return "날짜 오류";
    }
}

const formatCurrency = (amount: number | null | undefined) => {
    if (amount === null || amount === undefined) return "N/A";
    const color = amount > 0 ? "text-green-600" : amount < 0 ? "text-red-600" : "text-muted-foreground";
    return <span className={color}>${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>;
};

const InfoRow = ({ label, value, icon: Icon }: { label: string; value: React.ReactNode; icon: React.ElementType }) => (
    <div className="flex items-start space-x-3">
        <Icon className="h-5 w-5 text-muted-foreground mt-1" />
        <div className="flex-1">
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className="text-base font-medium">{value}</p>
        </div>
    </div>
);


export function JournalViewModal({ isOpen, onClose, journal, isLoading }: JournalViewModalProps) {
  const renderContent = () => {
    if (isLoading || !journal) {
      return (
        <div className="space-y-6">
            <Skeleton className="h-8 w-1/2" />
            <div className="grid grid-cols-2 gap-4">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
            </div>
             <div className="grid grid-cols-2 gap-4">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
            </div>
             <div className="grid grid-cols-2 gap-4">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
            </div>
            <Skeleton className="h-32 w-full" />
        </div>
      );
    }

    const pnl = journal.realizedPnL;
    const isWin = pnl !== null && pnl > 0;
    const isLoss = pnl !== null && pnl < 0;
    
    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Badge
                        variant={journal.tradeType === TradeType.LONG ? "default" : "destructive"}
                        className={`flex items-center gap-1 ${
                            journal.tradeType === TradeType.LONG ? "bg-green-600 hover:bg-green-700" : "bg-red-600 hover:bg-red-700"
                        }`}
                        >
                        {journal.tradeType === TradeType.LONG ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                        {journal.tradeType}
                    </Badge>
                    <Badge variant="outline">{journal.market}</Badge>
                     <Badge variant={journal.isClosed ? "secondary" : "outline"} className={journal.isClosed ? "text-green-600 border-green-600" : ""}>
                        {journal.isClosed ? "거래 종료" : "진행중"}
                    </Badge>
                </div>
                {pnl !== null && (
                    <Badge variant={isWin ? "default" : isLoss ? "destructive" : "secondary"} className={`text-lg ${isWin ? "bg-green-600" : ""}`}>
                        {isWin ? "WIN" : isLoss ? "LOSS" : "BREAKEVEN"}
                    </Badge>
                )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                <InfoRow label="진입 날짜" value={formatDateTime(journal.entryDate)} icon={Calendar} />
                <InfoRow label="종료 날짜" value={journal.exitDate ? formatDateTime(journal.exitDate) : "N/A"} icon={Calendar} />
                
                <InfoRow label="진입 가격" value={`$${journal.entryPrice.toLocaleString()}`} icon={ArrowRight} />
                <InfoRow label="종료 가격" value={journal.exitPrice ? `$${journal.exitPrice.toLocaleString()}` : "N/A"} icon={ArrowRight} />

                <InfoRow label="수량" value={journal.quantity.toLocaleString()} icon={Package} />
                <InfoRow label="손절 가격" value={journal.stopLossPrice ? `$${journal.stopLossPrice.toLocaleString()}` : "N/A"} icon={Target} />

                <InfoRow label="실현 손익" value={formatCurrency(journal.realizedPnL)} icon={DollarSign} />
                 <InfoRow label="작성자" value={journal.authorEmail} icon={FileText} />
            </div>

             <div className="space-y-2">
                <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2"><FileText className="h-5 w-5" />매매 근거</h4>
                <div 
                    className="prose prose-sm max-w-none rounded-md border p-4 min-h-[150px] bg-muted/50"
                    dangerouslySetInnerHTML={{ __html: journal.reasoning?.markdown || "<p>작성된 근거가 없습니다.</p>" }} 
                />
             </div>

             <div className="flex justify-between text-xs text-muted-foreground pt-4 border-t">
                <span className="flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3" />
                    생성: {formatDateTime(journal.createdAt)}
                </span>
                <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    수정: {formatDateTime(journal.updatedAt)}
                </span>
             </div>
        </div>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">
            {isLoading ? "로딩중..." : `[${journal?.symbol}] 매매일지 상세`}
          </DialogTitle>
          <DialogDescription>
            기록된 매매의 상세 내역을 확인합니다.
          </DialogDescription>
        </DialogHeader>
        {renderContent()}
        <Button onClick={onClose} variant="outline" className="mt-4">
          닫기
        </Button>
      </DialogContent>
    </Dialog>
  );
}