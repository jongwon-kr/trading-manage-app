// src/pages/Analysis.tsx
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
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { 
  setMarketData, 
  setPreMarketAnalysis, 
  addToWatchlist, 
  removeFromWatchlist,
  updateStockPrice 
} from '@/store/slices/tradingSlice'
import { mockPreMarketAnalysis, mockMarketData } from '@/mock/mock-data'
import { MarketData } from '@/types/analysis'

export function Analysis() {
  const dispatch = useAppDispatch()
  const [searchTerm, setSearchTerm] = useState('')

  // Redux state에서 데이터 가져오기
  const { 
    marketData, 
    preMarketAnalysis, 
    watchlist, 
    isLoading, 
    lastUpdate 
  } = useAppSelector((state) => state.trading)

  // 컴포넌트 마운트 시 초기 데이터 로드
  useEffect(() => {
    dispatch(setMarketData(mockMarketData))
    dispatch(setPreMarketAnalysis(mockPreMarketAnalysis))
  }, [dispatch])

  // 실시간 데이터 시뮬레이션
  useEffect(() => {
    if (marketData.length === 0) return

    const interval = setInterval(() => {
      // Redux action으로 데이터 업데이트
      marketData.forEach((stock) => {
        const priceChange = (Math.random() - 0.5) * 2
        const newPrice = Math.max(0.01, stock.currentPrice + priceChange)
        const newChange = stock.change + (Math.random() - 0.5) * 0.5
        const newChangePercent = stock.changePercent + (Math.random() - 0.5) * 0.2
        
        dispatch(updateStockPrice({
          symbol: stock.symbol,
          price: newPrice,
          change: newChange,
          changePercent: newChangePercent
        }))
      })
    }, 5000)

    return () => clearInterval(interval)
  }, [dispatch, marketData])

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

  const handleAddToWatchlist = (symbol: string) => {
    dispatch(addToWatchlist(symbol))
  }

  const handleRemoveFromWatchlist = (symbol: string) => {
    dispatch(removeFromWatchlist(symbol))
  }

  const isInWatchlist = (symbol: string) => {
    return watchlist.includes(symbol)
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
      
      <Button 
        variant="ghost" 
        size="sm" 
        className="ml-3"
        onClick={(e) => {
          e.stopPropagation()
          if (isInWatchlist(stock.symbol)) {
            handleRemoveFromWatchlist(stock.symbol)
          } else {
            handleAddToWatchlist(stock.symbol)
          }
        }}
      >
        <Star className={`h-4 w-4 ${isInWatchlist(stock.symbol) ? 'fill-yellow-400 text-yellow-400' : ''}`} />
      </Button>
    </div>
  )

  // 분석 데이터 (Redux state 또는 기본값 사용)
  const analysisData = preMarketAnalysis || mockPreMarketAnalysis

  // 필터링된 데이터
  const filteredData = marketData.filter(stock => 
    stock.symbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
    stock.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const topGainers = filteredData.filter(d => d.changePercent > 0)
    .sort((a, b) => b.changePercent - a.changePercent)
    .slice(0, 3)

  const topLosers = filteredData.filter(d => d.changePercent < 0)
    .sort((a, b) => a.changePercent - b.changePercent)
    .slice(0, 3)

  const mostActive = filteredData
    .sort((a, b) => b.volume - a.volume)
    .slice(0, 3)

  const watchlistStocks = filteredData.filter(stock => watchlist.includes(stock.symbol))

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
            {lastUpdate ? new Date(lastUpdate).toLocaleTimeString('ko-KR') : '09:30 - 16:00 EST'}
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

      {/* 로딩 상태 */}
      {isLoading && (
        <div className="flex items-center justify-center h-32">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="text-muted-foreground mt-2">데이터를 불러오는 중...</p>
          </div>
        </div>
      )}

      {/* 메인 분석 탭 */}
      {!isLoading && (
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">시장 개요</TabsTrigger>
            <TabsTrigger value="gainers">
              상승 종목 ({topGainers.length})
            </TabsTrigger>
            <TabsTrigger value="losers">
              하락 종목 ({topLosers.length})
            </TabsTrigger>
            <TabsTrigger value="watchlist">
              관심 종목 ({watchlistStocks.length})
            </TabsTrigger>
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
                  {topGainers.length > 0 ? (
                    topGainers.map((stock) => (
                      <StockRow key={stock.symbol} stock={stock} />
                    ))
                  ) : (
                    <p className="text-muted-foreground text-center py-4">
                      상승 종목이 없습니다.
                    </p>
                  )}
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
                  {topLosers.length > 0 ? (
                    topLosers.map((stock) => (
                      <StockRow key={stock.symbol} stock={stock} />
                    ))
                  ) : (
                    <p className="text-muted-foreground text-center py-4">
                      하락 종목이 없습니다.
                    </p>
                  )}
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
                  {mostActive.length > 0 ? (
                    mostActive.map((stock) => (
                      <StockRow key={stock.symbol} stock={stock} />
                    ))
                  ) : (
                    <p className="text-muted-foreground text-center py-4">
                      데이터가 없습니다.
                    </p>
                  )}
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
                  {filteredData
                    .filter(stock => stock.changePercent > 0)
                    .sort((a, b) => b.changePercent - a.changePercent)
                    .map((stock) => (
                      <StockRow key={stock.symbol} stock={stock} />
                    ))}
                  {filteredData.filter(stock => stock.changePercent > 0).length === 0 && (
                    <p className="text-muted-foreground text-center py-8">
                      상승 종목이 없습니다.
                    </p>
                  )}
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
                  {filteredData
                    .filter(stock => stock.changePercent < 0)
                    .sort((a, b) => a.changePercent - b.changePercent)
                    .map((stock) => (
                      <StockRow key={stock.symbol} stock={stock} />
                    ))}
                  {filteredData.filter(stock => stock.changePercent < 0).length === 0 && (
                    <p className="text-muted-foreground text-center py-8">
                      하락 종목이 없습니다.
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="watchlist" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  관심 종목
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{watchlistStocks.length}개 종목</Badge>
                    <Button variant="outline" size="sm">
                      + 추가
                    </Button>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-1">
                  {watchlistStocks.length > 0 ? (
                    watchlistStocks.map((stock) => (
                      <StockRow key={stock.symbol} stock={stock} />
                    ))
                  ) : (
                    <div className="text-center py-8">
                      <Star className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
                      <p className="text-muted-foreground">관심 종목을 추가해보세요.</p>
                      <p className="text-sm text-muted-foreground">
                        종목 옆의 별표 아이콘을 클릭하여 추가할 수 있습니다.
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  )
}
