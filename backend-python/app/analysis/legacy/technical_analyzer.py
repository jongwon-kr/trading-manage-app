import pandas as pd
import numpy as np
from typing import Dict, Any
from datetime import datetime
import logging

logger = logging.getLogger(__name__)

class TechnicalAnalyzer:
    """기술적 분석 서비스 (순수 pandas/numpy 구현)"""

    def analyze(self, symbol: str, timeframe: str) -> Dict[str, Any]:
        """기술적 지표 분석"""
        try:
            logger.info(f"기술적 분석 시작: symbol={symbol}, timeframe={timeframe}")
            
            # 차트 데이터 가져오기
            df = self._fetch_chart_data(symbol, timeframe)
            
            # 기술적 지표 계산
            indicators = {
                "rsi": self._calculate_rsi(df),
                "macd": self._calculate_macd(df),
                "moving_averages": self._calculate_moving_averages(df),
                "bollinger_bands": self._calculate_bollinger_bands(df),
                "volume_analysis": self._analyze_volume(df)
            }
            
            # 종합 판단
            recommendation = self._generate_recommendation(indicators)
            confidence = self._calculate_confidence(indicators)
            summary = self._generate_summary(indicators, recommendation)
            
            result = {
                "status": "SUCCESS",
                "indicators": indicators,
                "summary": summary,
                "recommendation": recommendation,
                "confidence": confidence,
                "analyzed_at": datetime.now().isoformat()
            }
            
            logger.info(f"기술적 분석 완료: symbol={symbol}, recommendation={recommendation}")
            return result
            
        except Exception as e:
            logger.error(f"기술적 분석 실패: symbol={symbol}, error={e}")
            return {
                "status": "FAILED",
                "error_message": str(e),
                "summary": "분석 중 오류 발생",
                "recommendation": "HOLD",
                "confidence": 0.0,
                "analyzed_at": datetime.now().isoformat()
            }

    def _fetch_chart_data(self, symbol: str, timeframe: str) -> pd.DataFrame:
        """차트 데이터 가져오기 (더미 데이터)"""
        dates = pd.date_range(end=datetime.now(), periods=100, freq='D')
        np.random.seed(42)
        
        # 실제 주가 움직임처럼 보이도록 누적합 사용
        base_price = 150
        returns = np.random.normal(0.001, 0.02, 100)
        prices = base_price * (1 + returns).cumprod()
        
        data = {
            'open': prices * np.random.uniform(0.98, 1.00, 100),
            'high': prices * np.random.uniform(1.00, 1.02, 100),
            'low': prices * np.random.uniform(0.98, 1.00, 100),
            'close': prices,
            'volume': np.random.uniform(1000000, 5000000, 100)
        }
        df = pd.DataFrame(data, index=dates)
        return df

    def _calculate_rsi(self, df: pd.DataFrame, period: int = 14) -> float:
        """RSI 계산"""
        delta = df['close'].diff()
        gain = (delta.where(delta > 0, 0)).rolling(window=period).mean()
        loss = (-delta.where(delta < 0, 0)).rolling(window=period).mean()
        
        rs = gain / loss
        rsi = 100 - (100 / (1 + rs))
        
        return float(rsi.iloc[-1])

    def _calculate_macd(self, df: pd.DataFrame) -> Dict[str, float]:
        """MACD 계산"""
        exp1 = df['close'].ewm(span=12, adjust=False).mean()
        exp2 = df['close'].ewm(span=26, adjust=False).mean()
        macd = exp1 - exp2
        signal = macd.ewm(span=9, adjust=False).mean()
        histogram = macd - signal
        
        return {
            "macd": float(macd.iloc[-1]),
            "signal": float(signal.iloc[-1]),
            "histogram": float(histogram.iloc[-1])
        }

    def _calculate_moving_averages(self, df: pd.DataFrame) -> Dict[str, float]:
        """이동평균선 계산"""
        return {
            "ma5": float(df['close'].rolling(window=5).mean().iloc[-1]),
            "ma20": float(df['close'].rolling(window=20).mean().iloc[-1]),
            "ma60": float(df['close'].rolling(window=60).mean().iloc[-1]),
            "current_price": float(df['close'].iloc[-1])
        }

    def _calculate_bollinger_bands(self, df: pd.DataFrame, period: int = 20) -> Dict[str, float]:
        """볼린저 밴드 계산"""
        sma = df['close'].rolling(window=period).mean()
        std = df['close'].rolling(window=period).std()
        upper = sma + (std * 2)
        lower = sma - (std * 2)
        
        return {
            "upper": float(upper.iloc[-1]),
            "middle": float(sma.iloc[-1]),
            "lower": float(lower.iloc[-1]),
            "current_price": float(df['close'].iloc[-1])
        }

    def _analyze_volume(self, df: pd.DataFrame) -> Dict[str, Any]:
        """거래량 분석"""
        avg_volume = df['volume'].rolling(window=20).mean().iloc[-1]
        current_volume = df['volume'].iloc[-1]
        volume_ratio = current_volume / avg_volume
        
        return {
            "current_volume": float(current_volume),
            "average_volume": float(avg_volume),
            "volume_ratio": float(volume_ratio),
            "is_high_volume": bool(volume_ratio > 1.5)
        }


    def _generate_recommendation(self, indicators: Dict[str, Any]) -> str:
        """종합 매매 추천"""
        score = 0
        
        # RSI 판단
        rsi = indicators.get("rsi", 50)
        if rsi < 30:
            score += 2
        elif rsi < 40:
            score += 1
        elif rsi > 70:
            score -= 2
        elif rsi > 60:
            score -= 1
        
        # MACD 판단
        macd = indicators.get("macd", {})
        if macd.get("histogram", 0) > 0:
            score += 1
        else:
            score -= 1
        
        # 이동평균선 판단
        ma = indicators.get("moving_averages", {})
        current = ma.get("current_price", 0)
        ma5 = ma.get("ma5", 0)
        ma20 = ma.get("ma20", 0)
        ma60 = ma.get("ma60", 0)
        
        if current > ma5 > ma20 > ma60:
            score += 2  # 정배열 (상승 추세)
        elif current < ma5 < ma20 < ma60:
            score -= 2  # 역배열 (하락 추세)
        
        if score >= 3:
            return "BUY"
        elif score <= -3:
            return "SELL"
        else:
            return "HOLD"

    def _calculate_confidence(self, indicators: Dict[str, Any]) -> float:
        """신뢰도 계산"""
        rsi = indicators.get("rsi", 50)
        
        if rsi < 30 or rsi > 70:
            return 0.85
        elif 40 <= rsi <= 60:
            return 0.45
        else:
            return 0.65

    def _generate_summary(self, indicators: Dict[str, Any], recommendation: str) -> str:
        """분석 요약 생성"""
        rsi = indicators.get("rsi", 0)
        macd = indicators.get("macd", {})
        ma = indicators.get("moving_averages", {})
        
        summary = f"기술적 분석 결과: {recommendation}\n\n"
        summary += f"- RSI: {rsi:.2f} "
        
        if rsi < 30:
            summary += "(과매도 구간)\n"
        elif rsi > 70:
            summary += "(과매수 구간)\n"
        else:
            summary += "(중립 구간)\n"
        
        summary += f"- MACD: {macd.get('macd', 0):.2f}, Signal: {macd.get('signal', 0):.2f}\n"
        summary += f"- 현재가: {ma.get('current_price', 0):.2f}\n"
        summary += f"- 이동평균선: MA5({ma.get('ma5', 0):.2f}), MA20({ma.get('ma20', 0):.2f}), MA60({ma.get('ma60', 0):.2f})"
        
        return summary
