import logging
from datetime import datetime
from models.schemas import AnalysisRequest, AnalysisResult, AnalysisType, TechnicalIndicators
from services.technical_analyzer import TechnicalAnalyzer
from services.market_analyzer import MarketAnalyzer  # MarketAnalyzer 임포트
from services.redis_service import RedisService

logger = logging.getLogger(__name__)

class AnalysisHandler:
    """분석 요청 처리 핸들러"""
    
    def __init__(self):
        self.technical_analyzer = TechnicalAnalyzer()
        self.market_analyzer = MarketAnalyzer()  # MarketAnalyzer 초기화
        self.redis_service = RedisService()
        logger.info("AnalysisHandler 초기화 완료")

    def handle_analysis_request(self, message: dict):
        """
        분석 요청 처리
        
        Args:
            message: Kafka 메시지 (dict)
        """
        request_id = message.get("requestId", "unknown")
        analysis_type = message.get("analysisType", AnalysisType.TECHNICAL)

        try:
            # 메시지 파싱
            request = AnalysisRequest(**message)
            logger.info(f"분석 요청 처리 시작: request_id={request.request_id}, type={request.analysis_type}")
            
            # 분석 타입에 따라 처리
            if request.analysis_type == AnalysisType.TECHNICAL:
                result = self._handle_technical_analysis(request)
            elif request.analysis_type == AnalysisType.MARKET_TREND:
                result = self._handle_market_trend_analysis(request)
            elif request.analysis_type == AnalysisType.NEWS:
                result = self._handle_news_analysis(request)
            elif request.analysis_type == AnalysisType.BACKTEST:
                result = self._handle_backtest(request)
            else:
                raise ValueError(f"지원하지 않는 분석 타입: {request.analysis_type}")
            
            # Redis에 결과 저장
            self.redis_service.save_analysis_result(
                request.request_id,
                result.model_dump(mode='json')
            )
            
            logger.info(f"분석 요청 처리 완료: request_id={request.request_id}")
            
        except Exception as e:
            logger.error(f"분석 요청 처리 실패: {e}", exc_info=True)
            
            # 실패 결과 저장
            error_result = AnalysisResult(
                request_id=request_id,
                analysis_type=analysis_type,
                status="FAILED",
                summary="분석 처리 중 오류 발생",
                recommendation="HOLD",
                confidence=0.0,
                analyzed_at=datetime.now(),
                error_message=str(e)
            )
            
            self.redis_service.save_analysis_result(
                request_id,
                error_result.model_dump(mode='json')
            )

    def _handle_technical_analysis(self, request: AnalysisRequest) -> AnalysisResult:
        """기술적 분석 처리"""
        if not request.symbol:
            raise ValueError("기술적 분석을 위해서는 'symbol' 필드가 필요합니다.")
            
        analysis_data = self.technical_analyzer.analyze(
            request.symbol,
            request.timeframe or "1d"
        )
        
        return AnalysisResult(
            request_id=request.request_id,
            analysis_type=AnalysisType.TECHNICAL,
            symbol=request.symbol,
            status=analysis_data["status"],
            indicators=TechnicalIndicators(**analysis_data.get("indicators", {})), # 중첩 모델 변환
            summary=analysis_data["summary"],
            recommendation=analysis_data["recommendation"],
            confidence=analysis_data["confidence"],
            analyzed_at=datetime.fromisoformat(analysis_data.get("analyzed_at", datetime.now().isoformat())),
            error_message=analysis_data.get("error_message")
        )

    def _handle_market_trend_analysis(self, request: AnalysisRequest) -> AnalysisResult:
        """시장 트렌드 분석 처리 (수정됨)"""
        
        if not request.market:
            raise ValueError("시장 트렌드 분석을 위해서는 'market' 필드가 필요합니다.")
            
        # 실제 MarketAnalyzer 호출
        analysis_data = self.market_analyzer.analyze_market_trend(
            market=request.market
        )
        
        # MarketAnalyzer의 결과(dict)를 AnalysisResult 모델로 변환
        return AnalysisResult(
            request_id=request.request_id,
            analysis_type=AnalysisType.MARKET_TREND,
            market=request.market,
            status=analysis_data["status"],
            summary=analysis_data.get("summary", "분석 요약 없음"),
            recommendation=analysis_data.get("recommendation", "HOLD"),
            confidence=analysis_data.get("confidence", 0.5),
            analyzed_at=datetime.fromisoformat(analysis_data.get("analyzed_at", datetime.now().isoformat())),
            error_message=analysis_data.get("error_message")
        )

    def _handle_news_analysis(self, request: AnalysisRequest) -> AnalysisResult:
        """뉴스/거시경제 분석 처리 (구현 예정)"""
        return AnalysisResult(
            request_id=request.request_id,
            analysis_type=AnalysisType.NEWS,
            status="SUCCESS",
            summary="뉴스 분석 (구현 예정)",
            recommendation="HOLD",
            confidence=0.5,
            analyzed_at=datetime.now()
        )

    def _handle_backtest(self, request: AnalysisRequest) -> AnalysisResult:
        """백테스팅 처리 (구현 예정)"""
        return AnalysisResult(
            request_id=request.request_id,
            analysis_type=AnalysisType.BACKTEST,
            symbol=request.symbol,
            status="SUCCESS",
            summary="백테스팅 (구현 예정)",
            recommendation="HOLD",
            confidence=0.5,
            analyzed_at=datetime.now()
        )