// src/pages/Dashboard.tsx
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { 
  TrendingUp, 
  BarChart3, 
  Target,
  DollarSign,
  Activity
} from "lucide-react"

export function Dashboard() {
  const metrics = {
    totalReturn: 12.5,
    todayPnL: 2.3,
    winRate: 68.3,
    totalTrades: 42,
    portfolioValue: 125000,
    monthlyTarget: 75,
  }

  return (
    <div className="space-y-6">
      {/* 상단 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">트레이딩 대시보드</h2>
          <p className="text-muted-foreground">
            오늘의 시장 상황과 포트폴리오 현황을 확인하세요
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-green-600">
            • 시장 개장
          </Badge>
          <Badge variant="secondary">
            마지막 업데이트: 방금 전
          </Badge>
        </div>
      </div>
      
      {/* 주요 지표 카드들 */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">포트폴리오 가치</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${metrics.portfolioValue.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              <span className="text-green-600">+{metrics.totalReturn}%</span> 전체 수익률
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">오늘 수익</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              +{metrics.todayPnL}%
            </div>
            <p className="text-xs text-muted-foreground">
              전일 대비 상승
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">승률</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.winRate}%</div>
            <div className="mt-2">
              <Progress value={metrics.winRate} className="h-2" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">총 거래 수</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalTrades}</div>
            <p className="text-xs text-muted-foreground">
              이번 달 기준
            </p>
          </CardContent>
        </Card>
      </div>

      {/* 상세 섹션 */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card className="col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              포트폴리오 성과
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm">월간 목표 달성</span>
                <span className="text-sm font-medium">{metrics.monthlyTarget}%</span>
              </div>
              <Progress value={metrics.monthlyTarget} className="h-3" />
              
              <div className="grid grid-cols-2 gap-4 pt-4">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">평균 수익</p>
                  <p className="text-2xl font-bold text-green-600">+4.2%</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">평균 손실</p>
                  <p className="text-2xl font-bold text-red-600">-2.1%</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>최근 거래</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[
                { symbol: 'AAPL', change: '+2.1%', time: '10:30' },
                { symbol: 'TSLA', change: '-1.5%', time: '09:45' },
                { symbol: 'MSFT', change: '+0.8%', time: '09:15' },
              ].map((trade, i) => (
                <div key={i} className="flex items-center justify-between py-1">
                  <div className="flex items-center gap-2">
                    <div className={`h-2 w-2 rounded-full ${
                      trade.change.startsWith('+') ? 'bg-green-500' : 'bg-red-500'
                    }`} />
                    <span className="font-medium">{trade.symbol}</span>
                  </div>
                  <div className="text-right">
                    <span className={`text-sm font-medium ${
                      trade.change.startsWith('+') ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {trade.change}
                    </span>
                    <p className="text-xs text-muted-foreground">{trade.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
