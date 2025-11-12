import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useNavigate, useParams } from 'react-router-dom';

const dummyTrade = {
  id: 1,
  symbol: 'AAPL',
  type: 'BUY',
  quantity: 20,
  entryPrice: 182.32,
  exitPrice: 184.00,
  profitLoss: 33.6,
  entryDate: '2025-11-01',
  exitDate: '2025-11-03',
  notes: '단기 수익 청산'
};

const TradeDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  // 실제 DB 연동 대신 샘플
  const trade = dummyTrade;

  return (
    <div className="flex justify-center items-center min-h-[70vh]">
      <Card className="w-full max-w-md p-6">
        <CardHeader>
          <CardTitle>
            {trade.symbol} <span className={`px-2 py-1 rounded text-xs font-semibold ml-2 ${trade.type === 'BUY' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{trade.type}</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-gray-500 text-sm">수량</span>
            <span className="font-mono">{trade.quantity}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-500 text-sm">진입가</span>
            <span className="font-mono">${trade.entryPrice}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-500 text-sm">청산가</span>
            <span className="font-mono">${trade.exitPrice}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-500 text-sm">손익</span>
            <span className={`font-mono ${trade.profitLoss > 0 ? 'text-green-600' : 'text-red-600'}`}>{trade.profitLoss > 0 ? '+' : ''}{trade.profitLoss}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-500 text-sm">진입일</span>
            <span className="font-mono">{trade.entryDate}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-500 text-sm">청산일</span>
            <span className="font-mono">{trade.exitDate}</span>
          </div>
          <div className="mt-2 text-gray-500 text-sm">비고</div>
          <div className="bg-gray-100 rounded p-2 text-sm">{trade.notes}</div>
          <div className="flex gap-2 mt-4">
            <Button variant="outline" onClick={() => navigate(-1)}>목록으로</Button>
            <Button variant="destructive">삭제</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default TradeDetail;
