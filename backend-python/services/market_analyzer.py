import logging
from typing import Dict, Any
from datetime import datetime, timedelta
import pandas as pd
import numpy as np

logger = logging.getLogger(__name__)

class MarketAnalyzer:
    """시장 트렌드 분석 서비스"""

    def analyze_market_trend(self, market: str) -> Dict[str, Any]:
        """
        시장 전체 트렌드 분석
        
        Args:
            market: 시장 타입 (STOCK, CRYPTO, FOREX)
        
        Returns:
            시장 트렌드 분석 결과
        """
        try:
            logger.info(f"시장 트렌드 분석 시작: market={market}")
            
            # 시장 데이터 가져오기
            market_data = self._fetch_market_data(market)
            
            # 트렌드 분석
            trend = self._analyze_trend(market_data)
            volatility = self._calculate_volatility(market_data)
            sentiment = self._analyze_sentiment(market_data)
            
            # 종합 판단
            recommendation = self._generate_market_recommendation(trend, volatility, sentiment)
            confidence = self._calculate_market_confidence(trend, volatility, sentiment)
            summary = self._generate_market_summary(market, trend, volatility, sentiment)
            
            result = {
                "status": "SUCCESS",
                "market": market,
                "trend": trend,
                "volatility": volatility,
                "sentiment": sentiment,
                "summary": summary,
                "recommendation": recommendation,
                "confidence": confidence,
                "analyzed_at": datetime.now().isoformat()
            }
            
            logger.info(f"시장 트렌드 분석 완료: market={market}, trend={trend}")
            return result
            
        except Exception as e:
            logger.error(f"시장 트렌드 분석 실패: market={market}, error={e}")
            return {
                "status": "FAILED",
                "error_message": str(e),
                "analyzed_at": datetime.now().isoformat()
            }

    def _fetch_market_data(self, market: str) -> pd.DataFrame:
        """시장 데이터 가져오기"""
        # TODO: 실제 시장 지수 데이터 가져오기
        # STOCK: S&P500, NASDAQ
        # CRYPTO: BTC Dominance, Total Market Cap
        # FOREX: DXY (달러 인덱스)
        
        # 임시 더미 데이터
        dates = pd.date_range(end=datetime.now(), periods=100, freq='D')
        data = {
            'price': np.random.uniform(4000, 5000, 100),
            'volume': np.random.uniform(1000000, 5000000, 100)
        }
        df = pd.DataFrame(data, index=dates)
        return df

    def _analyze_trend(self, df: pd.DataFrame) -> str:
        """트렌드 판단"""
        # 단순 이동평균 크로스오버로 트렌드 판단
        ma20 = df['price'].rolling(window=20).mean().iloc[-1]
        ma60 = df['price'].rolling(window=60).mean().iloc[-1]
        current_price = df['price'].iloc[-1]
        
        if current_price > ma20 > ma60:
            return "UPTREND"  # 상승 추세
        elif current_price < ma20 < ma60:
            return "DOWNTREND"  # 하락 추세
        else:
            return "SIDEWAYS"  # 횡보

    def _calculate_volatility(self, df: pd.DataFrame) -> Dict[str, float]:
        """변동성 계산"""
        returns = df['price'].pct_change()
        volatility = returns.std() * np.sqrt(252)  # 연간 변동성
        
        # ATR (Average True Range) 계산
        high = df['price'] * 1.02  # 임시
        low = df['price'] * 0.98   # 임시
        close = df['price']
        
        tr1 = high - low
        tr = tr1.rolling(window=14).mean()
        atr = tr.iloc[-1]
        
        return {
            "annual_volatility": float(volatility),
            "atr": float(atr),
            "is_high_volatility": volatility > 0.3
        }

    def _analyze_sentiment(self, df: pd.DataFrame) -> Dict[str, Any]:
        """시장 심리 분석"""
        # 가격 변화율로 간단한 심리 판단
        recent_returns = df['price'].pct_change(periods=5).iloc[-1]
        
        if recent_returns > 0.05:
            sentiment = "BULLISH"  # 강세
            score = 0.8
        elif recent_returns < -0.05:
            sentiment = "BEARISH"  # 약세
            score = 0.2
        else:
            sentiment = "NEUTRAL"  # 중립
            score = 0.5
        
        return {
            "sentiment": sentiment,
            "score": float(score),
            "recent_change": float(recent_returns)
        }

    def _generate_market_recommendation(self, trend: str, volatility: Dict, 
                                       sentiment: Dict) -> str:
        """시장 전체 추천"""
        score = 0
        
        # 트렌드 점수
        if trend == "UPTREND":
            score += 2
        elif trend == "DOWNTREND":
            score -= 2
        
        # 심리 점수
        if sentiment["sentiment"] == "BULLISH":
            score += 1
        elif sentiment["sentiment"] == "BEARISH":
            score -= 1
        
        # 변동성 고려 (변동성이 높으면 중립 성향)
        if volatility["is_high_volatility"]:
            score = score * 0.7
        
        if score >= 2:
            return "BUY"
        elif score <= -2:
            return "SELL"
        else:
            return "HOLD"

    def _calculate_market_confidence(self, trend: str, volatility: Dict, 
                                    sentiment: Dict) -> float:
        """신뢰도 계산"""
        confidence = 0.5
        
        # 트렌드와 심리가 일치하면 신뢰도 상승
        if (trend == "UPTREND" and sentiment["sentiment"] == "BULLISH") or \
           (trend == "DOWNTREND" and sentiment["sentiment"] == "BEARISH"):
            confidence += 0.3
        
        # 변동성이 낮으면 신뢰도 상승
        if not volatility["is_high_volatility"]:
            confidence += 0.1
        
        return min(confidence, 0.95)

    def _generate_market_summary(self, market: str, trend: str, 
                                volatility: Dict, sentiment: Dict) -> str:
        """시장 분석 요약"""
        summary = f"{market} 시장 트렌드 분석\n\n"
        summary += f"- 전체 트렌드: {trend}\n"
        summary += f"- 시장 심리: {sentiment['sentiment']} (스코어: {sentiment['score']:.2f})\n"
        summary += f"- 연간 변동성: {volatility['annual_volatility']:.2%}\n"
        
        if volatility["is_high_volatility"]:
            summary += "- 현재 시장은 높은 변동성을 보이고 있어 주의가 필요합니다."
        else:
            summary += "- 시장 변동성은 안정적인 수준입니다."
        
        return summary
