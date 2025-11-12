import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';

const TradesList = () => {
  // TODO: 실제 데이터 연동 fetch 후 map 등으로 교체
  const dummyTrades = [
    { id: 1, symbol: 'AAPL', type: 'BUY', entryPrice: 182.32, profitLoss: 342.1, entryDate: '2025-11-01' },
    { id: 2, symbol: 'TSLA', type: 'SELL', entryPrice: 241.68, profitLoss: -151.2, entryDate: '2025-11-05' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between pb-2">
        <h2 className="text-2xl font-bold tracking-tight">매매일지</h2>
        <Button asChild>
          <Link to="/trades/new">새 거래 기록</Link>
        </Button>
      </div>
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {dummyTrades.map(trade => (
          <Card key={trade.id} className="hover:shadow-lg transition">
            <CardHeader>
              <CardTitle>
                <span className="mr-2 font-medium">{trade.symbol}</span>
                <span className={`px-2 py-1 rounded text-xs font-semibold ml-2 ${trade.type === 'BUY' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{trade.type}</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex justify-between items-center mb-1">
                <span className="text-gray-500 text-sm">진입가</span>
                <span className="font-mono">${trade.entryPrice}</span>
              </div>
              <div className="flex justify-between items-center mb-1">
                <span className="text-gray-500 text-sm">손익</span>
                <span className={`font-mono ${trade.profitLoss > 0 ? 'text-green-600' : 'text-red-600'}`}>{trade.profitLoss > 0 ? '+' : ''}{trade.profitLoss}</span>
              </div>
              <div className="flex justify-between items-center mb-1">
                <span className="text-gray-500 text-sm">거래일</span>
                <span className="font-mono">{trade.entryDate}</span>
              </div>
              <Button asChild variant="outline" size="sm" className="mt-3 w-full">
                <Link to={`/trades/${trade.id}`}>상세 보기</Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default TradesList;
