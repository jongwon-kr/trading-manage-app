import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  TrendingUp, 
  TrendingDown, 
  Search, 
  Filter,
  Zap,
  BarChart3,
  Eye,
  Star,
  Volume2,
  Clock
} from "lucide-react"
import { mockPreMarketAnalysis, mockMarketData } from '@/lib/mock-data'
import { MarketData, PreMarketAnalysis } from '@/types/analysis'

export function Analysis() {
  const [analysisData, setAnalysisData] = useState<PreMarketAnalysis>(mockPreMarketAnalysis)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedSector, setSelectedSector] = useState<string>('all')

  // 실시간 데이터 시뮬레이션
  useEffect(() => {
    const interval = setInterval(() => {
      setAnalysisData(prev => ({
        ...prev,
        topGainers: prev.topGainers.map(stock => ({
          ...stock,
          currentPrice: stock.currentPrice + (Math.random() - 0.5) * 2,
          change: stock.change + (Math.random() - 0.5) * 0.5,
          changePercent: stock.changePercent + (Math.random() - 0.5) * 0.1,
        }))
      }))
    }, 5000)

    return () => clearInterval(interval)
  }, [])

  const formatNumber = (num: number, decimals = 2) => {
    return num.toFixed(decimals)
  }

  const formatCurrency = (num: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(num)
  }

  const formatVolume = (volume: number) => {
    if (volume >= 1000000) {
      return (volume / 1000000).toFixed(1) + 'M'
    }
    if (volume >= 1000) {
      return (volume / 1000).toFixed(0) + 'K'
    }
    return volume.toString()
  }

  const StockRow = ({ stock }: { stock: MarketData }) => (
    <div className="flex items-center justify-between p-3 hover:bg-muted/50 rounded-lg transition-colors cursor-pointer">
      <div className="flex items-center gap-3 flex-1">
        <div className="flex flex-col">
          <span className="font-semibold">{stock.symbol}</span>
          <span className="text-xs text-muted-foreground">{stock.sector}</span>
        </div>
        <div className="flex flex-col">
          <span className="text-sm font-medium">{stock.name}</span>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Volume2 className="h-3 w-3" />
            <span>{formatVolume(stock.volume)}</span>
            <span>({((stock.volume / stock.avgVolume - 1) * 100).toFixed(0)}%)</span>
          </div>
        </div>
      </div>
      
      <div className="text-right">
        <div className="font-semibold">{formatCurrency(stock.currentPrice)}</div>
        <div className={`flex items-center gap-1 text-sm ${
          stock.changePercent > 0 ? 'text-green-600' : 'text-red-600'
        }`}>
          {stock.changePercent > 0 ? (
            <TrendingUp className="h-3 w-3" />
          ) : (
            <TrendingDown className="h-3 w-3" />
          )}
          <span>{formatNumber(stock.change, 2)} ({formatNumber(stock.changePercent)}%)</span>
        </div>
      </div>
      
      <Button variant="ghost" size="sm" className="ml-3">
        <Star className="h-4 w-4" />
      </Button>
    </div>
  )

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Eye className="h-6 w-6" />
          <div>
            <h2 className="text-3xl font-bold tracking-tight">사전 분석</h2>
            <p className="text-muted-foreground">실시간 시장 분석과 종목 스크리닝</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="flex items-center gap-1">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            실시간 업데이트
          </Badge>
          <Badge variant="outline">
            <Clock className="h-3 w-3 mr-1" />
            09:30 - 16:00 EST
          </Badge>
        </div>
      </div>

      {/* 시장 개요 */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              시장 트렌드
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Badge 
                variant={analysisData.marketOverview.trend === 'bullish' ? 'default' : 'secondary'}
                className={analysisData.marketOverview.trend === 'bullish' ? 'bg-green-500' : ''}
              >
                {analysisData.marketOverview.trend === 'bullish' ? '강세장' : 
                 analysisData.marketOverview.trend === 'bearish' ? '약세장' : '보합'}
              </Badge>
              <span className="text-2xl font-bold text-green-600">+1.2%</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">S&P 500 기준</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Zap className="h-4 w-4" />
              시장 변동성
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-2xl font-bold">
                  {analysisData.marketOverview.volatility === 'high' ? '높음' : 
                   analysisData.marketOverview.volatility === 'medium' ? '보통' : '낮음'}
                </span>
                <span className="text-sm text-muted-foreground">VIX 18.5</span>
              </div>
              <Progress 
                value={analysisData.marketOverview.volatility === 'high' ? 75 : 
                       analysisData.marketOverview.volatility === 'medium' ? 45 : 25} 
                className="h-2" 
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Volume2 className="h-4 w-4" />
              거래량 수준
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-2xl font-bold text-blue-600">
                  {analysisData.marketOverview.volume === 'high' ? '높음' : 
                   analysisData.marketOverview.volume === 'normal' ? '보통' : '낮음'}
                </span>
                <span className="text-sm text-muted-foreground">+15%</span>
              </div>
              <Progress 
                value={analysisData.marketOverview.volume === 'high' ? 85 : 
                       analysisData.marketOverview.volume === 'normal' ? 50 : 25} 
                className="h-2" 
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 검색 및 필터 */}
      <div className="flex gap-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="종목명 또는 심볼 검색..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>
        <Button variant="outline" className="flex items-center gap-2">
          <Filter className="h-4 w-4" />
          필터
        </Button>
      </div>

      {/* 메인 분석 탭 */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">시장 개요</TabsTrigger>
          <TabsTrigger value="gainers">상승 종목</TabsTrigger>
          <TabsTrigger value="losers">하락 종목</TabsTrigger>
          <TabsTrigger value="watchlist">관심 종목</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-6 lg:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-green-500" />
                  최대 상승 종목
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {analysisData.topGainers.map((stock) => (
                  <StockRow key={stock.symbol} stock={stock} />
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingDown className="h-5 w-5 text-red-500" />
                  최대 하락 종목
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {analysisData.topLosers.map((stock) => (
                  <StockRow key={stock.symbol} stock={stock} />
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-blue-500" />
                  거래량 급증 종목
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {analysisData.mostActive.map((stock) => (
                  <StockRow key={stock.symbol} stock={stock} />
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="gainers" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>상승 종목 리스트</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-1">
                {mockMarketData
                  .filter(stock => stock.changePercent > 0)
                  .sort((a, b) => b.changePercent - a.changePercent)
                  .map((stock) => (
                    <StockRow key={stock.symbol} stock={stock} />
                  ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="losers" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>하락 종목 리스트</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-1">
                {mockMarketData
                  .filter(stock => stock.changePercent < 0)
                  .sort((a, b) => a.changePercent - b.changePercent)
                  .map((stock) => (
                    <StockRow key={stock.symbol} stock={stock} />
                  ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="watchlist" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                관심 종목
                <Button variant="outline" size="sm">
                  + 추가
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-1">
                {analysisData.watchlist.map((stock) => (
                  <StockRow key={stock.symbol} stock={stock} />
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
