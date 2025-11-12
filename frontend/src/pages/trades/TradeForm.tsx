import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

const TradeForm = () => {
  const navigate = useNavigate();
  const [symbol, setSymbol] = useState('');
  const [type, setType] = useState<'BUY' | 'SELL'>('BUY');
  const [quantity, setQuantity] = useState('');
  const [entryPrice, setEntryPrice] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!symbol || !quantity || !entryPrice) {
      setError('모든 필드를 입력해주세요.');
      return;
    }
    // TODO: thunk 호출 및 성공 시 이동
    navigate('/trades');
  };

  return (
    <div className="flex justify-center items-center min-h-[70vh]">
      <Card className="w-full max-w-md p-6">
        <CardHeader>
          <CardTitle>거래 기록 추가</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              placeholder="종목 코드 (예: AAPL)"
              value={symbol}
              onChange={e => setSymbol(e.target.value)}
              required
            />
            <div className="flex gap-3">
              <Button
                type="button"
                variant={type === 'BUY' ? undefined : 'outline'}
                className="w-1/2"
                onClick={() => setType('BUY')}
              >
                매수
              </Button>
              <Button
                type="button"
                variant={type === 'SELL' ? undefined : 'outline'}
                className="w-1/2"
                onClick={() => setType('SELL')}
              >
                매도
              </Button>
            </div>
            <Input
              type="number"
              placeholder="수량"
              value={quantity}
              onChange={e => setQuantity(e.target.value)}
              required
              min={1}
            />
            <Input
              type="number"
              placeholder="진입가"
              value={entryPrice}
              onChange={e => setEntryPrice(e.target.value)}
              required
              min={0}
              step="0.01"
            />
            {error && <div className="text-sm text-red-500 text-center">{error}</div>}
            <Button type="submit" className="w-full mt-3">등록</Button>
            <Button type="button" variant="outline" className="w-full" onClick={() => navigate(-1)}>취소</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default TradeForm;
