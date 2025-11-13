import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  CalendarDays,
  Check,
  X,
  Package,
} from "lucide-react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  fetchJournals,
  fetchJournalStats,
  fetchJournalById,
  createJournal,
  updateJournal,
  deleteJournal,
  setJournalFilters,
  clearSelectedJournal,
} from "@/store/slices/tradingSlice";
import {
  JournalApiDto,
  TradeType,
  MarketType,
} from "@/types/journal.types";
import { JournalEntryForm } from "@/components/journal/JournalEntryForm";
import { JournalViewModal } from "@/components/journal/JournalViewModal";
import { DatePickerWithRange } from "@/components/journal/JournalDatePicker";
import { DateRange } from "react-day-picker";
import { toast } from "sonner";
import { format, parseISO } from "date-fns";
import { ko } from "date-fns/locale";

// 통계 카드
const StatsCard = ({
  title,
  data,
  icon: Icon,
  formatFn,
  isLoading,
  colorClass = "",
}: {
  title: string;
  data: string | number;
  icon: React.ElementType;
  formatFn?: (data: any) => string;
  isLoading: boolean;
  colorClass?: string;
}) => (
  <Card>
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-sm font-medium">{title}</CardTitle>
      <Icon className={`h-4 w-4 ${colorClass || "text-muted-foreground"}`} />
    </CardHeader>
    <CardContent>
      {isLoading ? (
        <Skeleton className="h-8 w-3/4 mt-1" />
      ) : (
        <div className={`text-2xl font-bold ${colorClass}`}>
          {formatFn ? formatFn(data) : data}
        </div>
      )}
    </CardContent>
  </Card>
);

// 날짜 포맷팅
const formatDate = (dateStr: JournalApiDto.JournalResponse["entryDate"] | null | undefined): string => {
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
        return format(date, "yy/MM/dd HH:mm", { locale: ko });
    } catch (e) {
        return "날짜 오류";
    }
}

// 화폐 포맷팅 (색상 포함)
const formatCurrency = (amount: number | null | undefined) => {
    if (amount === null || amount === undefined) return <span className="text-muted-foreground">-</span>;
    const color = amount > 0 ? "text-green-600" : amount < 0 ? "text-red-600" : "text-muted-foreground";
    const sign = amount > 0 ? "+" : "";
    return <span className={color}>{sign}${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>;
};

// 매매일지 카드 (모던 UI)
const JournalCard = ({
  journal,
  onView,
  onEdit,
  onDelete,
}: {
  journal: JournalApiDto.JournalSummaryResponse;
  onView: (id: number) => void;
  onEdit: (id: number) => void;
  onDelete: (id: number) => void;
}) => {
  const isLong = journal.tradeType === TradeType.LONG;
  const pnl = journal.realizedPnL;
  const isWin = pnl !== null && pnl > 0;
  const isLoss = pnl !== null && pnl < 0;

  return (
    <Card className="hover:shadow-lg transition-shadow duration-200">
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-xl font-bold">{journal.symbol}</CardTitle>
            <p className="text-sm text-muted-foreground">{journal.market}</p>
          </div>
          <div className="flex items-center gap-2">
            <Badge
              variant={isLong ? "default" : "destructive"}
              className={`flex items-center gap-1 ${isLong ? "bg-green-600 hover:bg-green-700" : "bg-red-600 hover:bg-red-700"}`}
            >
              {isLong ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
              {journal.tradeType}
            </Badge>
            <Badge variant={journal.isClosed ? "outline" : "secondary"} className={journal.isClosed ? "border-green-600 text-green-600" : ""}>
              {journal.isClosed ? "종료" : "진행중"}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between p-3 rounded-md bg-muted/50">
          <div className="text-center">
            <p className="text-xs text-muted-foreground">진입 가격</p>
            <p className="font-semibold text-sm">${journal.entryPrice.toLocaleString()}</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-muted-foreground">수량</p>
            <p className="font-semibold text-sm">{journal.quantity.toLocaleString()}</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-muted-foreground">종료 가격</p>
            <p className="font-semibold text-sm">
                {journal.exitPrice ? `$${journal.exitPrice.toLocaleString()}` : "-"}
            </p>
          </div>
        </div>

        <div className="space-y-2">
            <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-muted-foreground flex items-center gap-1.5"><CalendarDays className="h-4 w-4" /> 진입</span>
                <span className="text-sm">{formatDate(journal.entryDate)}</span>
            </div>
             <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-muted-foreground flex items-center gap-1.5"><CalendarDays className="h-4 w-4" /> 종료</span>
                <span className="text-sm">{journal.exitDate ? formatDate(journal.exitDate) : "-"}</span>
            </div>
             <div className="flex justify-between items-center pt-2 border-t">
                <span className="text-sm font-bold flex items-center gap-1.5"><DollarSign className="h-4 w-4" /> 실현 손익</span>
                <span className="text-lg font-bold">{formatCurrency(journal.realizedPnL)}</span>
            </div>
        </div>

        <div className="flex gap-2 pt-2 border-t">
          <Button variant="outline" size="sm" className="flex-1" onClick={() => onView(journal.id)}>
            <Eye className="h-4 w-4 mr-2" />
            상세보기
          </Button>
          <Button variant="outline" size="sm" className="flex-1" onClick={() => onEdit(journal.id)}>
            <Edit className="h-4 w-4 mr-2" />
            수정
          </Button>
          <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-600" onClick={() => onDelete(journal.id)}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export function Journal() {
  const dispatch = useAppDispatch();
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);

  const {
    journals,
    journalStats,
    journalFilters,
    isJournalLoading,
    isStatsLoading,
    selectedJournalDetail,
    isDetailLoading,
  } = useAppSelector((state) => state.trading);

  // 컴포넌트 마운트 시 데이터 로드
  useEffect(() => {
    dispatch(fetchJournals(journalFilters));
    dispatch(fetchJournalStats());
  }, [dispatch]); // journalFilters가 변경되면 fetchJournals가 다시 호출되어야 함

  // 필터 변경 핸들러
  const handleFilterChange = (
    key: keyof JournalApiDto.JournalFilters,
    value: any
  ) => {
    const updatedFilters = { ...journalFilters, [key]: value, page: 0 };
    dispatch(setJournalFilters(updatedFilters));
    dispatch(fetchJournals(updatedFilters));
  };

  // 날짜 범위 변경 핸들러
  useEffect(() => {
    const filters: Partial<JournalApiDto.JournalFilters> = {
        startDate: dateRange?.from ? dateRange.from.toISOString() : undefined,
        endDate: dateRange?.to ? dateRange.to.toISOString() : undefined,
        page: 0,
    };
    const updatedFilters = { ...journalFilters, ...filters };
    dispatch(setJournalFilters(updatedFilters));
    dispatch(fetchJournals(updatedFilters));
  }, [dateRange, dispatch]);

  // 모달 닫기
  const closeModals = () => {
    setIsFormModalOpen(false);
    setIsViewModalOpen(false);
    dispatch(clearSelectedJournal());
    setIsEditMode(false);
  };

  // [신규] 상세 보기 핸들러
  const handleView = (id: number) => {
    dispatch(fetchJournalById(id));
    setIsViewModalOpen(true);
  };

  // [신규] 수정 핸들러
  const handleEdit = (id: number) => {
    dispatch(fetchJournalById(id));
    setIsEditMode(true);
    setIsFormModalOpen(true);
  };

  // [신규] 생성 핸들러
  const handleCreate = () => {
    dispatch(clearSelectedJournal());
    setIsEditMode(false);
    setIsFormModalOpen(true);
  };

  // [신규] 삭제 핸들러
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

  // [신규] 폼 제출 핸들러 (생성/수정)
  const handleSubmit = async (
    formData: JournalApiDto.CreateRequest | JournalApiDto.UpdateRequest
  ) => {
    try {
      if (isEditMode && selectedJournalDetail) {
        // 수정 모드
        await dispatch(
          updateJournal({ id: selectedJournalDetail.id, data: formData })
        ).unwrap(); // .unwrap()으로 Promise 에러 캐치
      } else {
        // 생성 모드
        await dispatch(createJournal(formData as JournalApiDto.CreateRequest)).unwrap();
      }
      closeModals();
    } catch (error: any) {
      console.error("Failed to save journal:", error);
      // Thunk에서 rejectWithValue로 반환된 메시지를 사용할 수 있습니다.
      // toast.error("저장 실패", { description: error.message || "서버 오류" });
    }
  };

  const marketTypeOptions = [
    { value: MarketType.STOCK, label: "주식" },
    { value: MarketType.CRYPTO, label: "암호화폐" },
    { value: MarketType.FOREX, label: "외환" },
    { value: MarketType.FUTURES, label: "선물" },
  ];

  const tradeTypeOptions = [
    { value: TradeType.LONG, label: "매수 (Long)" },
    { value: TradeType.SHORT, label: "매도 (Short)" },
  ];

  const statusOptions = [
    { value: "false", label: "진행중" },
    { value: "true", label: "종료" },
  ];

  // 필터 초기화
  const clearFilters = () => {
    setDateRange(undefined);
    const defaultFilters: JournalApiDto.JournalFilters = {
        page: 0,
        size: 20,
        // [수정] 정렬 기준을 'entryDate'에서 'createdAt'으로 변경 (백엔드 오류 수정)
        sortBy: "createdAt",
        direction: "DESC",
    };
    dispatch(setJournalFilters(defaultFilters));
    dispatch(fetchJournals(defaultFilters));
  }

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
        <Button className="flex items-center gap-2" onClick={handleCreate}>
          <Plus className="h-4 w-4" />새 거래 기록
        </Button>
      </div>

      {/* 통계 섹션 */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="총 거래"
          data={journalStats?.totalTrades || 0}
          icon={BarChart3}
          isLoading={isStatsLoading}
        />
        <StatsCard
          title="총 실현손익"
          data={journalStats?.totalPnL || 0}
          icon={DollarSign}
          isLoading={isStatsLoading}
          colorClass={
            (journalStats?.totalPnL || 0) > 0
              ? "text-green-600"
              : (journalStats?.totalPnL || 0) < 0
              ? "text-red-600"
              : ""
          }
          formatFn={(d: number) =>
            `${d > 0 ? "+" : ""}$${d.toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}`
          }
        />
        <StatsCard
          title="승률"
          data={journalStats?.winRate || 0}
          icon={Target}
          isLoading={isStatsLoading}
          colorClass={
            (journalStats?.winRate || 0) >= 50
              ? "text-green-600"
              : "text-red-600"
          }
          formatFn={(d: number) => `${d.toFixed(1)}%`}
        />
        <StatsCard
          title="진행중"
          data={journalStats?.openTrades || 0}
          icon={Package}
          isLoading={isStatsLoading}
        />
      </div>

      {/* 필터 섹션 */}
      <Card>
        <CardHeader>
            <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                    <Filter className="h-5 w-5" />
                    필터 및 검색
                </span>
                <Button variant="ghost" size="sm" onClick={clearFilters}>
                    <X className="h-4 w-4 mr-1" />
                    초기화
                </Button>
            </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-4">
          <DatePickerWithRange date={dateRange} setDate={setDateRange} />
          
          <Select
            value={journalFilters.market}
            onValueChange={(value) => handleFilterChange("market", value)}
          >
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="시장 선택" />
            </SelectTrigger>
            <SelectContent>
                {marketTypeOptions.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
            </SelectContent>
          </Select>
          
          <Select
            value={journalFilters.tradeType}
            onValueChange={(value) => handleFilterChange("tradeType", value)}
          >
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="유형 선택" />
            </SelectTrigger>
            <SelectContent>
                {tradeTypeOptions.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
            </SelectContent>
          </Select>

          <Select
            value={journalFilters.isClosed?.toString()}
            onValueChange={(value) => handleFilterChange("isClosed", value ? value === "true" : undefined)}
          >
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="상태 선택" />
            </SelectTrigger>
            <SelectContent>
                {statusOptions.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
            </SelectContent>
          </Select>

        </CardContent>
      </Card>

      {/* 매매일지 목록 */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">
          거래 기록 ({journals.totalElements})
        </h3>

        {isJournalLoading && journals.content.length === 0 ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Skeleton className="h-80 w-full" />
            <Skeleton className="h-80 w-full" />
            <Skeleton className="h-80 w-full" />
          </div>
        ) : journals.content.length === 0 ? (
          <div className="text-center py-16 rounded-lg border border-dashed">
            <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">거래 기록이 없습니다</h3>
            <p className="text-muted-foreground mb-4">
              선택한 필터에 해당하는 거래 기록이 없거나,
              <br/>
              첫 거래를 기록하여 매매 일지를 시작해보세요.
            </p>
            <Button onClick={handleCreate}>
              <Plus className="h-4 w-4 mr-2" />
              거래 기록 추가
            </Button>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {journals.content.map((journal) => (
              <JournalCard
                key={journal.id}
                journal={journal}
                onView={handleView}
                onEdit={handleEdit}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
        {/* TODO: 페이지네이션 컴포넌트 추가 */}
      </div>

      {/* 생성/수정 모달 */}
      <Dialog open={isFormModalOpen} onOpenChange={setIsFormModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto custom-scrollbar">
          <DialogHeader>
            <DialogTitle>
              {isEditMode ? "거래 기록 수정" : "새 거래 기록"}
            </DialogTitle>
            <DialogDescription>
              매매 상세 내역을 입력해주세요.
            </DialogDescription>
          </DialogHeader>
          <JournalEntryForm
            onSubmit={handleSubmit}
            onCancel={closeModals}
            isSubmitting={isJournalLoading} // 생성/수정 시 로딩 상태
            initialData={isEditMode ? selectedJournalDetail : null}
          />
        </DialogContent>
      </Dialog>

      {/* 상세 보기 모달 */}
      <JournalViewModal
        isOpen={isViewModalOpen}
        onClose={closeModals}
        journal={selectedJournalDetail}
        isLoading={isDetailLoading}
      />
    </div>
  );
}