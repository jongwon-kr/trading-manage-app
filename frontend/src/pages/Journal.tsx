import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import {
  BookOpen,
  Plus,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Target,
  BarChart3,
  Edit,
  Eye,
  Filter,
  Trash2,
} from "lucide-react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  fetchJournals,
  fetchJournalStats,
  createJournal,
  deleteJournal,
  setJournalFilters,
} from "@/store/slices/tradingSlice";
import {
  JournalSummary,
  JournalApiDto,
  JournalStatistics,
  TradeType,
  JournalFilters,
  LocalDateTime,
} from "@/types/journal.types";
import {
  JournalEntryForm,
  JournalFormData,
} from "@/components/journal/JournalEntryForm";
import { toast } from "sonner";
import { unwrapResult } from "@reduxjs/toolkit";

export function Journal() {
  const dispatch = useAppDispatch();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedJournal, setSelectedJournal] = useState<JournalSummary | null>(
    null
  );
  const [isViewMode, setIsViewMode] = useState(false);

  const {
    journals,
    journalStats,
    journalFilters,
    isJournalLoading,
    isStatsLoading,
  } = useAppSelector((state) => state.trading);

  useEffect(() => {
    dispatch(fetchJournals(journalFilters));
    dispatch(fetchJournalStats());
  }, [dispatch]);

  const handleFilterChange = (newFilters: Partial<JournalFilters>) => {
    const updatedFilters = { ...journalFilters, ...newFilters, page: 0 }; // 페이지 0으로 초기화
    dispatch(setJournalFilters(updatedFilters));
    dispatch(fetchJournals(updatedFilters));
  };

  const handleSubmit = async (formData: JournalFormData) => {
    const requestData: JournalApiDto.CreateRequest = {
      market: formData.market,
      symbol: formData.symbol,
      tradeType: formData.type === "long" ? TradeType.LONG : TradeType.SHORT,
      quantity: parseFloat(formData.quantity),
      entryPrice: parseFloat(formData.entryPrice),
      stopLossPrice: formData.stopLossPrice
        ? parseFloat(formData.stopLossPrice)
        : undefined,
      realizedPnL: formData.realizedPnl
        ? parseFloat(formData.realizedPnl)
        : undefined,
      reasoning: {
        markdown: formData.reasoning,
        images: [],
      },
    };

    try {
      if (selectedJournal) {
        toast.info("수정 기능은 구현 중입니다.");
      } else {
        await dispatch(createJournal(requestData)).unwrap();
      }

      setIsFormOpen(false);
      setSelectedJournal(null);
    } catch (error: any) {
      console.error("Failed to save journal:", error);
    }
  };

  const handleDelete = (journalId: number) => {
    toast.warning("정말로 삭제하시겠습니까?", {
      description: "삭제된 데이터는 복구할 수 없습니다.",
      action: {
        label: "삭제",
        onClick: () => dispatch(deleteJournal(journalId)),
      },
      cancel: {
        label: "취소",
      },
      duration: 5000,
    });
  };

  const handleEdit = (journal: JournalSummary) => {
    setSelectedJournal(journal);
    setIsViewMode(false);
    setIsFormOpen(true);
  };

  const handleView = (journal: JournalSummary) => {
    setSelectedJournal(journal);
    setIsViewMode(true);
    setIsFormOpen(true);
  };

  const formatCurrency = (amount: number | null | undefined) => {
    if (amount === null || amount === undefined) return "-";
    return new Intl.NumberFormat("ko-KR", {
      style: "decimal",
      maximumFractionDigits: 2,
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateStr: string | LocalDateTime) => {
    if (Array.isArray(dateStr)) {
      try {
        return new Date(
          dateStr[0],
          dateStr[1] - 1,
          dateStr[2],
          dateStr[3],
          dateStr[4],
          dateStr[5]
        ).toLocaleDateString("ko-KR");
      } catch (e) {
        return "날짜 오류";
      }
    }
    return new Date(dateStr).toLocaleDateString("ko-KR");
  };

  const StatsCard = ({
    title,
    data,
    icon: Icon,
    formatFn,
    isLoading,
  }: {
    title: string;
    data: string | number;
    icon: React.ElementType;
    formatFn?: (data: any) => string;
    isLoading: boolean;
  }) => (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-8 w-3/4 mt-1" />
        ) : (
          <div className="text-2xl font-bold">
            {formatFn ? formatFn(data) : data}
          </div>
        )}
      </CardContent>
    </Card>
  );

  const TradeCard = ({ journal }: { journal: JournalSummary }) => (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex flex-col">
              <span className="font-semibold text-lg">{journal.symbol}</span>
              <span className="text-sm text-muted-foreground">
                {journal.market}
              </span>
            </div>
            <Badge
              variant={
                journal.tradeType === TradeType.LONG ? "default" : "destructive"
              }
              className={`flex items-center gap-1 ${
                journal.tradeType === TradeType.LONG
                  ? "bg-green-600 hover:bg-green-700"
                  : "bg-red-600 hover:bg-red-700"
              }`}
            >
              {journal.tradeType === TradeType.LONG ? (
                <TrendingUp className="h-3 w-3" />
              ) : (
                <TrendingDown className="h-3 w-3" />
              )}
              {journal.tradeType}
            </Badge>
            <Badge variant={journal.isClosed ? "outline" : "secondary"}>
              {journal.isClosed ? "종료" : "진행중"}
            </Badge>
          </div>
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => handleEdit(journal)}
              disabled // [임시] 수정 기능 비활성화
            >
              <Edit className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => handleView(journal)}
              disabled // [임시] 상세 보기 기능 비활성화
            >
              <Eye className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-red-500 hover:text-red-600"
              onClick={() => handleDelete(journal.id)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-3 gap-4">
          <div>
            <p className="text-xs text-muted-foreground">진입가격</p>
            <p className="font-semibold text-sm">
              {formatCurrency(journal.entryPrice)}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">수량</p>
            <p className="font-semibold text-sm">
              {journal.quantity?.toLocaleString() || "-"}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">실현손익</p>
            <p
              className={`font-semibold text-sm ${
                (journal.realizedPnL || 0) > 0
                  ? "text-green-600"
                  : (journal.realizedPnL || 0) < 0
                  ? "text-red-600"
                  : "text-muted-foreground"
              }`}
            >
              {formatCurrency(journal.realizedPnL)}
            </p>
          </div>
        </div>
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>진입: {formatDate(journal.createdAt)}</span>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BookOpen className="h-6 w-6" />
          <div>
            <h2 className="text-3xl font-bold tracking-tight">매매 일지</h2>
            <p className="text-muted-foreground">거래 기록 및 성과 분석</p>
          </div>
        </div>
        <Button
          className="flex items-center gap-2"
          onClick={() => {
            setSelectedJournal(null);
            setIsViewMode(false);
            setIsFormOpen(true);
          }}
        >
          <Plus className="h-4 w-4" />새 거래 기록
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="총 거래"
          data={journalStats?.totalTrades || 0}
          icon={BarChart3}
          isLoading={isStatsLoading}
        />
        <StatsCard
          title="승률"
          data={journalStats?.winRate || 0}
          icon={Target}
          isLoading={isStatsLoading}
          formatFn={(d: number) => `${d.toFixed(1)}%`}
        />
        <StatsCard
          title="총 실현손익"
          data={journalStats?.totalPnL || 0}
          icon={DollarSign}
          isLoading={isStatsLoading}
          formatFn={formatCurrency}
        />
        <StatsCard
          title="진행중"
          data={journalStats?.openTrades || 0}
          icon={TrendingUp}
          isLoading={isStatsLoading}
        />
      </div>

      <div className="flex items-center gap-4">
        <div className="flex gap-2">
          <Button
            variant={
              journalFilters.isClosed === undefined ? "default" : "outline"
            }
            size="sm"
            onClick={() => handleFilterChange({ isClosed: undefined })}
          >
            전체
          </Button>
          <Button
            variant={journalFilters.isClosed === false ? "default" : "outline"}
            size="sm"
            onClick={() => handleFilterChange({ isClosed: false })}
          >
            진행중
          </Button>
          <Button
            variant={journalFilters.isClosed === true ? "default" : "outline"}
            size="sm"
            onClick={() => handleFilterChange({ isClosed: true })}
          >
            완료
          </Button>
        </div>
        <div className="flex gap-2">
          <Button
            variant={
              journalFilters.tradeType === undefined ? "default" : "outline"
            }
            size="sm"
            onClick={() => handleFilterChange({ tradeType: undefined })}
          >
            전체 유형
          </Button>
          <Button
            variant={
              journalFilters.tradeType === TradeType.LONG
                ? "default"
                : "outline"
            }
            size="sm"
            onClick={() => handleFilterChange({ tradeType: TradeType.LONG })}
          >
            <TrendingUp className="h-4 w-4 mr-1" />
            매수
          </Button>
          <Button
            variant={
              journalFilters.tradeType === TradeType.SHORT
                ? "default"
                : "outline"
            }
            size="sm"
            onClick={() => handleFilterChange({ tradeType: TradeType.SHORT })}
          >
            <TrendingDown className="h-4 w-4 mr-1" />
            매도
          </Button>
        </div>
        <Button variant="outline" size="sm" className="ml-auto">
          <Filter className="h-4 w-4 mr-2" />
          필터
        </Button>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">
            거래 기록 ({journals.totalElements})
          </h3>
        </div>

        {isJournalLoading && journals.content.length === 0 ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Skeleton className="h-56 w-full" />
            <Skeleton className="h-56 w-full" />
            <Skeleton className="h-56 w-full" />
          </div>
        ) : journals.content.length === 0 ? (
          <div className="text-center py-12">
            <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">거래 기록이 없습니다</h3>
            <p className="text-muted-foreground mb-4">
              첫 거래를 기록하여 매매 일지를 시작해보세요.
            </p>
            <Button onClick={() => setIsFormOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              거래 기록 추가
            </Button>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {journals.content.map((journal) => (
              <TradeCard key={journal.id} journal={journal} />
            ))}
          </div>
        )}
      </div>

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {isViewMode
                ? "거래 상세 보기"
                : selectedJournal
                ? "거래 기록 수정"
                : "새 거래 기록"}
            </DialogTitle>
            <DialogDescription>
              {isViewMode
                ? "거래 내역을 확인합니다."
                : "매매 상세 내역을 입력해주세요."}
            </DialogDescription>
          </DialogHeader>
          {isViewMode ? (
            <div className="space-y-4">
              <div className="prose max-w-none">
                <h3>{selectedJournal?.symbol}</h3>
              </div>
              <Button onClick={() => setIsFormOpen(false)}>닫기</Button>
            </div>
          ) : (
            <JournalEntryForm
              onSubmit={handleSubmit}
              onCancel={() => setIsFormOpen(false)}
              isSubmitting={isJournalLoading}
              initialData={
                selectedJournal
                  ? {
                      symbol: selectedJournal.symbol,
                      market: selectedJournal.market,
                      entryPrice: selectedJournal.entryPrice.toString(),
                      stopLossPrice: "", // 상세 조회 API 구현 필요
                      realizedPnl:
                        selectedJournal.realizedPnL?.toString() || "",
                      reasoning: "", // 상세 조회 API 구현 필요
                      type:
                        selectedJournal.tradeType === TradeType.LONG
                          ? "long"
                          : "short",
                      quantity: selectedJournal.quantity?.toString() || "",
                    }
                  : undefined
              }
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
