import React, { useState, useEffect } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TradingJournalEditor } from "@/components/editor/TradingJournalEditor";
import { DatePicker } from "@/components/journal/JournalDatePicker";
import { Save, X, Loader2 } from "lucide-react";
import { MarketType, TradeType, JournalApiDto } from "@/types/journal.types";
import { parseISO } from "date-fns";

export interface JournalFormData {
  symbol: string;
  market: MarketType;
  tradeType: TradeType;
  quantity: string;
  entryDate: Date | undefined;
  entryPrice: string;
  stopLossPrice: string;
  exitDate: Date | undefined;
  exitPrice: string;
  realizedPnL: string;
  reasoning: string;
}

interface JournalEntryFormProps {
  onSubmit: (data: JournalApiDto.CreateRequest | JournalApiDto.UpdateRequest) => void;
  onCancel: () => void;
  isSubmitting: boolean;
  initialData?: JournalApiDto.JournalResponse | null; // 상세 응답 DTO
}

// LocalDateTime (배열 또는 문자열)을 Date 객체로 변환
const parseDate = (dateStr: JournalApiDto.JournalResponse["entryDate"] | null | undefined): Date | undefined => {
  if (!dateStr) return undefined;
  try {
    if (typeof dateStr === "string") {
      return parseISO(dateStr);
    }
    if (Array.isArray(dateStr)) {
      // [YYYY, MM, DD, HH, MM, SS]
      return new Date(dateStr[0], dateStr[1] - 1, dateStr[2], dateStr[3], dateStr[4], dateStr[5]);
    }
  } catch (e) {
    console.error("Invalid date format:", dateStr);
    return undefined;
  }
  return undefined;
}

export function JournalEntryForm({
  onSubmit,
  onCancel,
  isSubmitting,
  initialData,
}: JournalEntryFormProps) {
  const [formData, setFormData] = useState<JournalFormData>({
    symbol: "",
    market: MarketType.STOCK,
    tradeType: TradeType.LONG,
    quantity: "",
    entryDate: new Date(),
    entryPrice: "",
    stopLossPrice: "",
    exitDate: undefined,
    exitPrice: "",
    realizedPnL: "",
    reasoning: "",
  });

  // initialData가 있으면 폼 상태를 채웁니다 (수정 모드)
  useEffect(() => {
    if (initialData) {
      setFormData({
        symbol: initialData.symbol || "",
        market: initialData.market || MarketType.STOCK,
        tradeType: initialData.tradeType || TradeType.LONG,
        quantity: initialData.quantity?.toString() || "",
        entryDate: parseDate(initialData.entryDate),
        entryPrice: initialData.entryPrice?.toString() || "",
        stopLossPrice: initialData.stopLossPrice?.toString() || "",
        exitDate: parseDate(initialData.exitDate),
        exitPrice: initialData.exitPrice?.toString() || "",
        realizedPnL: initialData.realizedPnL?.toString() || "",
        reasoning: initialData.reasoning?.markdown || "",
      });
    } else {
      // 생성 모드일 때 폼 초기화
      setFormData({
        symbol: "",
        market: MarketType.STOCK,
        tradeType: TradeType.LONG,
        quantity: "",
        entryDate: new Date(),
        entryPrice: "",
        stopLossPrice: "",
        exitDate: undefined,
        exitPrice: "",
        realizedPnL: "",
        reasoning: "",
      });
    }
  }, [initialData]);

  const handleChange = (field: keyof JournalFormData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.entryDate) {
        alert("진입 날짜를 입력해주세요.");
        return;
    }

    // 폼 데이터를 API DTO로 변환
    const apiData = {
      symbol: formData.symbol,
      market: formData.market,
      tradeType: formData.tradeType,
      quantity: parseFloat(formData.quantity) || 0,
      entryPrice: parseFloat(formData.entryPrice) || 0,
      entryDate: formData.entryDate.toISOString(),
      stopLossPrice: formData.stopLossPrice ? parseFloat(formData.stopLossPrice) : undefined,
      exitPrice: formData.exitPrice ? parseFloat(formData.exitPrice) : undefined,
      exitDate: formData.exitDate ? formData.exitDate.toISOString() : undefined,
      realizedPnL: formData.realizedPnL ? parseFloat(formData.realizedPnL) : undefined,
      reasoning: {
        markdown: formData.reasoning,
        images: [], // TODO: 이미지 업로드 구현시 추가
      },
    };

    onSubmit(apiData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* 좌측: 기본 정보 */}
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="symbol">종목 코드 *</Label>
            <Input
              id="symbol"
              placeholder="예: AAPL, TSLA"
              value={formData.symbol}
              onChange={(e) => handleChange("symbol", e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="market">시장 *</Label>
              <Select
                value={formData.market}
                onValueChange={(value) => handleChange("market", value as MarketType)}
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
            <div className="space-y-2">
              <Label htmlFor="tradeType">거래 유형 *</Label>
              <Select
                value={formData.tradeType}
                onValueChange={(value) => handleChange("tradeType", value as TradeType)}
              >
                <SelectTrigger id="tradeType">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={TradeType.LONG}>매수 (Long)</SelectItem>
                  <SelectItem value={TradeType.SHORT}>매도 (Short)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="quantity">수량 *</Label>
            <Input
              id="quantity"
              type="number"
              placeholder="100"
              value={formData.quantity}
              onChange={(e) => handleChange("quantity", e.target.value)}
              required
            />
          </div>
        </div>
        
        {/* 우측: 날짜 및 가격 정보 */}
        <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="entryDate">진입 날짜 *</Label>
                    <DatePicker 
                        date={formData.entryDate}
                        setDate={(date) => handleChange("entryDate", date)}
                    />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="entryPrice">진입 가격 *</Label>
                    <Input
                        id="entryPrice"
                        type="number"
                        step="0.01"
                        placeholder="150.50"
                        value={formData.entryPrice}
                        onChange={(e) => handleChange("entryPrice", e.target.value)}
                        required
                    />
                </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="exitDate">종료 날짜</Label>
                    <DatePicker 
                        date={formData.exitDate}
                        setDate={(date) => handleChange("exitDate", date)}
                        placeholder="거래 종료 시 선택"
                    />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="exitPrice">종료 가격</Label>
                    <Input
                        id="exitPrice"
                        type="number"
                        step="0.01"
                        placeholder="160.00"
                        value={formData.exitPrice}
                        onChange={(e) => handleChange("exitPrice", e.target.value)}
                    />
                </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
                 <div className="space-y-2">
                    <Label htmlFor="stopLossPrice">손절 가격</Label>
                    <Input
                        id="stopLossPrice"
                        type="number"
                        step="0.01"
                        placeholder="145.00"
                        value={formData.stopLossPrice}
                        onChange={(e) => handleChange("stopLossPrice", e.target.value)}
                    />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="realizedPnL">실현 손익 (USD)</Label>
                    <Input
                        id="realizedPnL"
                        type="number"
                        step="0.01"
                        placeholder="500.00"
                        value={formData.realizedPnL}
                        onChange={(e) => handleChange("realizedPnL", e.target.value)}
                    />
                </div>
            </div>
        </div>
      </div>

      {/* 진입 근거 섹션 */}
      <div className="space-y-2">
        <Label>매매 근거 및 분석 *</Label>
        <TradingJournalEditor
          content={formData.reasoning}
          onChange={(content) => handleChange("reasoning", content)}
          placeholder="매매 근거, 차트 분석, 시장 상황 등을 자유롭게 작성하세요..."
        />
        <p className="text-xs text-muted-foreground">
          마크다운(HTML) 형식으로 저장되며, 이미지를 삽입할 수 있습니다.
        </p>
      </div>

      {/* 버튼 */}
      <div className="flex justify-end gap-3 pt-4 border-t">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
          <X className="h-4 w-4 mr-2" />
          취소
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          저장
        </Button>
      </div>
    </form>
  );
}