// 차트 보조지표 표시 설정 (localStorage 'chart.indicators' 에 저장)
export interface IndicatorSettings {
  ma20: boolean;
  ma60: boolean;
  ma120: boolean;
  bb: boolean;
  volume: boolean;
  rsi: boolean;
  macd: boolean;
}

export const DEFAULT_INDICATORS: IndicatorSettings = {
  ma20: true,
  ma60: true,
  ma120: false,
  bb: false,
  volume: true,
  rsi: true,
  macd: false,
};
