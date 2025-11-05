// src/pages/Journal.tsx
import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Progress } from "@/components/ui/progress"
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
  Filter
} from "lucide-react"
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import {
  setTrades,
  setJournalStats,
  setJournalFilters,
} from '@/store/slices/tradingSlice'
import { mockTrades, mockJournalStats } from '@/lib/mock-trading-data'
import { Trade } from '@/types/trading'

export function Journal() {
  const dispatch = useAppDispatch()
  const [isNewTradeOpen, setIsNewTradeOpen] = useState(false)

  // Redux state
  const {
    trades,
    journalStats,
    journalFilters
  } = useAppSelector((state) => state.trading)

  // 컴포넌트 마운트 시 초기 데이터 로드
  useEffect(() => {
    dispatch(setTrades(mockTrades))
    dispatch(setJournalStats(mockJournalStats))
  }, [dispatch])

  // 필터링된 거래
  const filteredTrades = trades.filter(trade => {
    if (journalFilters.status !== 'all' && trade.status !== journalFilters.status) return false
    if (journalFilters.type !== 'all' && trade.type !== journalFilters.type) return false
    if (journalFilters.strategy && !trade.strategy.toLowerCase().includes(journalFilters.strategy.toLowerCase())) return false
    return true
  })

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: 'KRW',
      minimumFractionDigits: 0
    }).format(amount * 1300) // USD to KRW 환산
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('ko-KR')
  }

  const TradeCard = ({ trade }: { trade: Trade }) => (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex flex-col">
              <span className="font-semibold text-lg">{trade.symbol}</span>
              <span className="text-sm text-muted-foreground">{trade.name}</span>
            </div>
            <Badge
              variant={trade.type === 'long' ? 'default' : 'destructive'}
              className="flex items-center gap-1"
            >
              {trade.type === 'long' ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
              {trade.type.toUpperCase()}
            </Badge>
            <Badge
              variant={trade.status === 'open' ? 'secondary' :
                trade.status === 'closed' ? 'outline' : 'destructive'}
            >
              {trade.status === 'open' ? '진행중' :
                trade.status === 'closed' ? '종료' : '대기'}
            </Badge>
          </div>
          <div className="flex gap-2">
             <Button variant="ghost" size="sm" onClick={() => console.log('Edit:', trade.id)}>
              <Edit className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm">
              <Eye className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-muted-foreground">진입가격</p>
            <p className="font-semibold">{formatCurrency(trade.entryPrice)}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">
              {trade.status === 'closed' ? '청산가격' : '현재가격'}
            </p>
            <p className="font-semibold">
              {formatCurrency(trade.status === 'closed' ? trade.exitPrice! : trade.currentPrice!)}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-muted-foreground">수량</p>
            <p className="font-semibold">{trade.quantity.toLocaleString()}주</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">수익률</p>
            <p className={`font-semibold ${(trade.returnPercentage || 0) > 0 ? 'text-green-600' : 'text-red-600'
              }`}>
              {trade.returnPercentage?.toFixed(2)}%
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-muted-foreground">전략</p>
            <p className="text-sm font-medium">{trade.strategy}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">
              {trade.status === 'closed' ? '손익' : '평가손익'}
            </p>
            <p className={`font-semibold ${(trade.status === 'closed' ? trade.realizedPnL! : trade.unrealizedPnL!) > 0 ?
                'text-green-600' : 'text-red-600'
              }`}>
              {formatCurrency(trade.status === 'closed' ? trade.realizedPnL! : trade.unrealizedPnL!)}
            </p>
          </div>
        </div>

        <div>
          <p className="text-sm text-muted-foreground mb-1">사전 분석</p>
          <p className="text-sm bg-muted p-2 rounded text-muted-foreground line-clamp-2">
            {trade.preAnalysis}
          </p>
        </div>

        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>진입: {formatDate(trade.entryDate)}</span>
          {trade.exitDate && <span>청산: {formatDate(trade.exitDate)}</span>}
          <div className="flex gap-1">
            {trade.tags.slice(0, 2).map((tag, i) => (
              <Badge key={i} variant="outline" className="text-xs">
                {tag}
              </Badge>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BookOpen className="h-6 w-6" />
          <div>
            <h2 className="text-3xl font-bold tracking-tight">매매 일지</h2>
            <p className="text-muted-foreground">거래 기록과 성과 분석</p>
          </div>
        </div>
        <Dialog open={isNewTradeOpen} onOpenChange={setIsNewTradeOpen}>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              새 거래 기록
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>새 거래 기록 추가</DialogTitle>
            </DialogHeader>
            {/* 새 거래 폼은 나중에 구현 */}
            <div className="p-4 text-center text-muted-foreground">
              거래 입력 폼 구현 예정
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* 통계 카드 */}
      {journalStats && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">총 거래</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{journalStats.totalTrades}</div>
              <p className="text-xs text-muted-foreground">
                진행중 {journalStats.openTrades} | 완료 {journalStats.closedTrades}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">승률</CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{journalStats.winRate.toFixed(1)}%</div>
              <Progress value={journalStats.winRate} className="mt-2 h-2" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">총 수익</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {formatCurrency(journalStats.totalReturn)}
              </div>
              <p className="text-xs text-muted-foreground">
                최고 수익: {formatCurrency(journalStats.bestTrade)}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">연속 기록</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {journalStats.currentStreak}승
              </div>
              <p className="text-xs text-muted-foreground">
                최장 연승: {journalStats.longestWinStreak}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 필터 */}
      <div className="flex gap-4">
        <div className="flex gap-2">
          <Button
            variant={journalFilters.status === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => dispatch(setJournalFilters({ status: 'all' }))}
          >
            전체
          </Button>
          <Button
            variant={journalFilters.status === 'open' ? 'default' : 'outline'}
            size="sm"
            onClick={() => dispatch(setJournalFilters({ status: 'open' }))}
          >
            진행중
          </Button>
          <Button
            variant={journalFilters.status === 'closed' ? 'default' : 'outline'}
            size="sm"
            onClick={() => dispatch(setJournalFilters({ status: 'closed' }))}
          >
            완료
          </Button>
        </div>
        <div className="flex gap-2">
          <Button
            variant={journalFilters.type === 'long' ? 'default' : 'outline'}
            size="sm"
            onClick={() => dispatch(setJournalFilters({ type: 'long' }))}
          >
            <TrendingUp className="h-4 w-4 mr-1" />
            매수
          </Button>
          <Button
            variant={journalFilters.type === 'short' ? 'default' : 'outline'}
            size="sm"
            onClick={() => dispatch(setJournalFilters({ type: 'short' }))}
          >
            <TrendingDown className="h-4 w-4 mr-1" />
            매도
          </Button>
        </div>
        <Button variant="outline" size="sm">
          <Filter className="h-4 w-4 mr-2" />
          더 많은 필터
        </Button>
      </div>

      {/* 거래 목록 */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">
            거래 기록 ({filteredTrades.length})
          </h3>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredTrades.map((trade) => (
            <TradeCard key={trade.id} trade={trade} />
          ))}
        </div>

        {filteredTrades.length === 0 && (
          <div className="text-center py-12">
            <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">거래 기록이 없습니다</h3>
            <p className="text-muted-foreground mb-4">
              첫 거래를 기록하여 매매 일지를 시작해보세요.
            </p>
            <Button onClick={() => setIsNewTradeOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              거래 기록 추가
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
