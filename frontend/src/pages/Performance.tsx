// src/pages/Performance.tsx
import { useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Target,
  Activity,
  AlertTriangle,
  Award,
  PieChart,
  LineChart,
} from "lucide-react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  setPerformanceMetrics,
  setMonthlyReturns,
  setSectorAnalysis,
  setStrategyPerformance,
  setRiskMetrics,
  setPerformancePeriod,
} from "@/store/slices/tradingSlice";
import {
  mockPerformanceMetrics,
  mockMonthlyReturns,
  mockSectorAnalysis,
  mockStrategyPerformance,
  mockRiskMetrics,
} from "@/mock/mock-performance-data";

export function Performance() {
  const dispatch = useAppDispatch();

  const {
    performanceMetrics,
    monthlyReturns,
    sectorAnalysis,
    strategyPerformance,
    riskMetrics,
    performancePeriod,
    benchmarkSymbol,
  } = useAppSelector((state) => state.trading);

  useEffect(() => {
    dispatch(setPerformanceMetrics(mockPerformanceMetrics));
    dispatch(setMonthlyReturns(mockMonthlyReturns));
    dispatch(setSectorAnalysis(mockSectorAnalysis));
    dispatch(setStrategyPerformance(mockStrategyPerformance));
    dispatch(setRiskMetrics(mockRiskMetrics));
  }, [dispatch]);

  const formatPercent = (value: number) => {
    return `${value > 0 ? "+" : ""}${value.toFixed(2)}%`;
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("ko-KR", {
      style: "currency",
      currency: "KRW",
      minimumFractionDigits: 0,
    }).format(amount * 1300);
  };

  const getPerformanceColor = (value: number) => {
    return value > 0
      ? "text-green-600"
      : value < 0
      ? "text-red-600"
      : "text-muted-foreground";
  };

  const MetricCard = ({
    title,
    value,
    subtitle,
    icon: Icon,
    isPercentage = false,
    isCurrency = false,
  }: {
    title: string;
    value: number;
    subtitle?: string;
    icon: any;
    isPercentage?: boolean;
    isCurrency?: boolean;
  }) => (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className={`text-2xl font-bold ${getPerformanceColor(value)}`}>
          {isCurrency
            ? formatCurrency(value)
            : isPercentage
            ? formatPercent(value)
            : value.toFixed(2)}
        </div>
        {subtitle && (
          <p className="text-xs text-muted-foreground">{subtitle}</p>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-6 w-6" />
          <div>
            <h2 className="text-3xl font-bold tracking-tight">성과 분석</h2>
            <p className="text-muted-foreground">
              포트폴리오 성과 및 위험 분석
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex gap-1">
            {(["1M", "3M", "6M", "1Y", "ALL"] as const).map((period) => (
              <Button
                key={period}
                variant={performancePeriod === period ? "default" : "outline"}
                size="sm"
                onClick={() => dispatch(setPerformancePeriod(period))}
              >
                {period}
              </Button>
            ))}
          </div>
        </div>
      </div>

      {performanceMetrics && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            title="총 수익률"
            value={performanceMetrics.totalReturn}
            subtitle={`연환산 ${performanceMetrics.annualizedReturn.toFixed(
              2
            )}%`}
            icon={TrendingUp}
            isPercentage
          />
          <MetricCard
            title="샤프 비율"
            value={performanceMetrics.sharpeRatio}
            subtitle="위험 대비 수익"
            icon={Target}
          />
          <MetricCard
            title="최대 낙폭"
            value={performanceMetrics.maxDrawdown}
            subtitle="최대 하락률"
            icon={TrendingDown}
            isPercentage
          />
          <MetricCard
            title="변동성"
            value={performanceMetrics.volatility}
            subtitle="연환산 변동성"
            icon={Activity}
            isPercentage
          />
        </div>
      )}

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">개요</TabsTrigger>
          <TabsTrigger value="returns">수익률</TabsTrigger>
          <TabsTrigger value="risk">위험 분석</TabsTrigger>
          <TabsTrigger value="sectors">섹터 분석</TabsTrigger>
          <TabsTrigger value="strategies">전략 분석</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {performanceMetrics && (
            <div className="grid gap-6 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="h-5 w-5" />
                    거래 통계
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">
                        총 거래 수
                      </p>
                      <p className="text-2xl font-bold">
                        {performanceMetrics.totalTrades}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">승률</p>
                      <p className="text-2xl font-bold text-green-600">
                        {performanceMetrics.winRate.toFixed(1)}%
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>승리 거래</span>
                      <span className="font-medium text-green-600">
                        {performanceMetrics.winningTrades}회
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>손실 거래</span>
                      <span className="font-medium text-red-600">
                        {performanceMetrics.losingTrades}회
                      </span>
                    </div>
                    <Progress
                      value={performanceMetrics.winRate}
                      className="h-2 mt-2"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">평균 수익</p>
                      <p className="text-lg font-bold text-green-600">
                        +{performanceMetrics.avgWin.toFixed(2)}%
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">평균 손실</p>
                      <p className="text-lg font-bold text-red-600">
                        {performanceMetrics.avgLoss.toFixed(2)}%
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Award className="h-5 w-5" />
                    성과 지표
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">수익 팩터</p>
                      <p className="text-2xl font-bold text-green-600">
                        {performanceMetrics.profitFactor.toFixed(2)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {performanceMetrics.profitFactor > 1.5
                          ? "우수"
                          : performanceMetrics.profitFactor > 1.0
                          ? "보통"
                          : "개선 필요"}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">
                        평균 보유기간
                      </p>
                      <p className="text-2xl font-bold">
                        {performanceMetrics.avgHoldingPeriod.toFixed(1)}일
                      </p>
                    </div>
                  </div>

                  <div className="space-y-3 pt-4 border-t">
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">
                        현재 연속
                      </span>
                      <Badge
                        variant={
                          performanceMetrics.currentStreak > 0
                            ? "default"
                            : "destructive"
                        }
                      >
                        {performanceMetrics.currentStreak > 0
                          ? `${performanceMetrics.currentStreak}승`
                          : `${Math.abs(performanceMetrics.currentStreak)}패`}
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">
                        최장 연승
                      </span>
                      <span className="font-medium text-green-600">
                        {performanceMetrics.longestWinStreak}회
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">
                        최장 연패
                      </span>
                      <span className="font-medium text-red-600">
                        {performanceMetrics.longestLossStreak}회
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">최고 거래</p>
                      <p className="font-bold text-green-600">
                        +{performanceMetrics.bestTrade.toFixed(2)}%
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">최악 거래</p>
                      <p className="font-bold text-red-600">
                        {performanceMetrics.worstTrade.toFixed(2)}%
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <LineChart className="h-5 w-5" />
                벤치마크 비교 (vs {benchmarkSymbol})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {performanceMetrics && (
                <div className="grid grid-cols-3 gap-6">
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground">포트폴리오</p>
                    <p className="text-2xl font-bold text-green-600">
                      +{performanceMetrics.totalReturn.toFixed(2)}%
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground">벤치마크</p>
                    <p className="text-2xl font-bold text-blue-600">+8.8%</p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground">알파</p>
                    <p className="text-2xl font-bold text-green-600">
                      +{performanceMetrics.alpha.toFixed(2)}%
                    </p>
                  </div>
                </div>
              )}
              <div className="mt-4 h-64 bg-muted rounded flex items-center justify-center">
                <p className="text-muted-foreground">
                  성과 차트 (차트 라이브러리 통합 예정)
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="returns" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>월별 수익률</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-6 gap-2">
                {monthlyReturns.map((month, index) => (
                  <div
                    key={index}
                    className={`p-3 rounded text-center border ${
                      month.returns > 0
                        ? "bg-green-50 border-green-200"
                        : month.returns < 0
                        ? "bg-red-50 border-red-200"
                        : "bg-muted"
                    }`}
                  >
                    <p className="text-xs text-muted-foreground">
                      {new Date(month.month).toLocaleDateString("ko-KR", {
                        month: "short",
                      })}
                    </p>
                    <p
                      className={`font-bold ${
                        month.returns > 0
                          ? "text-green-600"
                          : month.returns < 0
                          ? "text-red-600"
                          : "text-muted-foreground"
                      }`}
                    >
                      {formatPercent(month.returns)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {month.trades}거래
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="risk" className="space-y-6">
          {riskMetrics && (
            <div className="grid gap-6 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5" />
                    위험 지표
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">VaR (95%)</p>
                      <p className="text-lg font-bold text-red-600">
                        {riskMetrics.var95.toFixed(2)}%
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">VaR (99%)</p>
                      <p className="text-lg font-bold text-red-600">
                        {riskMetrics.var99.toFixed(2)}%
                      </p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">
                        기대 손실
                      </span>
                      <span className="font-medium text-red-600">
                        {riskMetrics.expectedShortfall.toFixed(2)}%
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">
                        최대 손실
                      </span>
                      <span className="font-medium text-red-600">
                        {riskMetrics.largestLoss.toFixed(2)}%
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">
                        연속 손실
                      </span>
                      <span className="font-medium">
                        {riskMetrics.maxConsecutiveLosses}회
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>드로우다운 분석</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-48 bg-muted rounded flex items-center justify-center">
                    <p className="text-muted-foreground">드로우다운 차트</p>
                  </div>
                  <div className="mt-4 space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">
                        현재 드로우다운
                      </span>
                      <span className="font-medium text-red-600">-2.1%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">
                        평균 회복 기간
                      </span>
                      <span className="font-medium">12일</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        <TabsContent value="sectors" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PieChart className="h-5 w-5" />
                섹터별 성과
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {sectorAnalysis.map((sector, index) => (
                  <div key={index} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{sector.sector}</span>
                        <Badge variant="outline">{sector.trades}거래</Badge>
                      </div>
                      <div className="text-right">
                        <span
                          className={`font-bold ${getPerformanceColor(
                            sector.returns
                          )}`}
                        >
                          {formatPercent(sector.returns)}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="flex-1">
                        <div className="flex justify-between text-sm mb-1">
                          <span>비중</span>
                          <span>{sector.allocation}%</span>
                        </div>
                        <Progress value={sector.allocation} className="h-2" />
                      </div>
                      <div className="w-20 text-right">
                        <p className="text-sm text-muted-foreground">승률</p>
                        <p className="font-medium">
                          {sector.winRate.toFixed(1)}%
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="strategies" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>전략별 성과</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {strategyPerformance.map((strategy, index) => (
                  <div key={index} className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-semibold">{strategy.strategy}</h4>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{strategy.trades}거래</Badge>
                        <Badge
                          variant={
                            strategy.winRate >= 70 ? "default" : "secondary"
                          }
                        >
                          승률 {strategy.winRate.toFixed(1)}%
                        </Badge>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">총 수익률</p>
                        <p
                          className={`font-bold ${getPerformanceColor(
                            strategy.totalReturn
                          )}`}
                        >
                          {formatPercent(strategy.totalReturn)}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">평균 수익률</p>
                        <p
                          className={`font-bold ${getPerformanceColor(
                            strategy.avgReturn
                          )}`}
                        >
                          {formatPercent(strategy.avgReturn)}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">수익 팩터</p>
                        <p className="font-bold">
                          {strategy.profitFactor.toFixed(2)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
