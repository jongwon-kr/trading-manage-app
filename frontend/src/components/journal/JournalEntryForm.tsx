import { useState } from 'react'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select'
import { TradingJournalEditor } from '@/components/editor/TradingJournalEditor'
import { Save, X } from 'lucide-react'
// [추가] 타입 임포트
import { MarketType, TradeType } from '@/types/journal.types'


// [수정] 폼 데이터 타입 (BE DTO와 맞춤)
export interface JournalFormData {
  symbol: string
  market: MarketType
  entryPrice: string
  stopLossPrice: string
  realizedPnl: string // (참고) 생성 폼에서는 사용하지 않음
  reasoning: string
  type: 'long' | 'short' // (참고) BE는 'LONG' | 'SHORT'
  quantity: string
}

interface JournalEntryFormProps {
  onSubmit: (data: JournalFormData) => void
  onCancel: () => void
  initialData?: Partial<JournalFormData>
}

export function JournalEntryForm({ 
  onSubmit, 
  onCancel, 
  initialData 
}: JournalEntryFormProps) {
  const [formData, setFormData] = useState<JournalFormData>({
    symbol: initialData?.symbol || '',
    market: initialData?.market || MarketType.STOCK, // [수정] Enum 사용
    entryPrice: initialData?.entryPrice || '',
    stopLossPrice: initialData?.stopLossPrice || '',
    realizedPnl: initialData?.realizedPnl || '',
    reasoning: initialData?.reasoning || '',
    type: initialData?.type || 'long', // [수정] 기본값
    quantity: initialData?.quantity || '',
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit(formData)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* 기본 정보 섹션 */}
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="symbol">종목 코드 *</Label>
            <Input
              id="symbol"
              placeholder="예: AAPL, TSLA"
              value={formData.symbol}
              onChange={(e) => setFormData({ ...formData, symbol: e.target.value })}
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="market">시장 *</Label>
            <Select
              value={formData.market}
              onValueChange={(value) => setFormData({ ...formData, market: value as MarketType })} // [수정]
            >
              <SelectTrigger id="market">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={MarketType.STOCK}>미국/한국 주식</SelectItem>
                <SelectItem value={MarketType.CRYPTO}>암호화폐</SelectItem>
                <SelectItem value={MarketType.FOREX}>외환</SelectItem>
                <SelectItem value={MarketType.FUTURES}>선물</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="type">거래 유형 *</Label>
            <Select
              value={formData.type}
              onValueChange={(value: 'long' | 'short') => 
                setFormData({ ...formData, type: value })
              }
            >
              <SelectTrigger id="type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="long">매수 (Long)</SelectItem>
                <SelectItem value="short">매도 (Short)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="quantity">수량 *</Label>
            <Input
              id="quantity"
              type="number"
              placeholder="100"
              value={formData.quantity}
              onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
              required
            />
          </div>
        </div>
      </div>

      {/* 가격 정보 섹션 */}
      <div className="space-y-4">
        <h3 className="font-semibold text-sm">가격 정보</h3>
        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="entryPrice">진입 가격 *</Label>
            <Input
              id="entryPrice"
              type="number"
              step="0.01"
              placeholder="150.50"
              value={formData.entryPrice}
              onChange={(e) => setFormData({ ...formData, entryPrice: e.target.value })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="stopLossPrice">손절 가격</Label>
            <Input
              id="stopLossPrice"
              type="number"
              step="0.01"
              placeholder="145.00"
              value={formData.stopLossPrice}
              onChange={(e) => setFormData({ ...formData, stopLossPrice: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="realizedPnl">실현 손익</Label>
            <Input
              id="realizedPnl"
              type="number"
              step="0.01"
              placeholder="500.00"
              value={formData.realizedPnl}
              onChange={(e) => setFormData({ ...formData, realizedPnl: e.target.value })}
              disabled // [수정] 생성 시에는 비활성화
            />
          </div>
        </div>
      </div>

      {/* 진입 근거 섹션 */}
      <div className="space-y-2">
        <Label>진입 근거 *</Label>
        <TradingJournalEditor
          content={formData.reasoning}
          onChange={(content) => setFormData({ ...formData, reasoning: content })}
          placeholder="매매 근거, 차트 분석, 시장 상황 등을 자유롭게 작성하세요..."
        />
        <p className="text-xs text-muted-foreground">
          마크다운 형식으로 저장되며, 이미지를 삽입할 수 있습니다.
        </p>
      </div>

      {/* 버튼 */}
      <div className="flex justify-end gap-3 pt-4 border-t">
        <Button type="button" variant="outline" onClick={onCancel}>
          <X className="h-4 w-4 mr-2" />
          취소
        </Button>
        <Button type="submit">
          <Save className="h-4 w-4 mr-2" />
          저장
        </Button>
      </div>
    </form>
  )
}