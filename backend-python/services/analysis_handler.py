import logging
from datetime import datetime
from models import AnalysisRequest, AnalysisResult, AnalysisType
from services.technical_analyzer import TechnicalAnalyzer
from services.redis_service import RedisService

logger = logging.getLogger(__name__)

class AnalysisHandler:
    """분석 요청 처리 핸들러"""
    
    def __init__(self):
        self.technical_analyzer = TechnicalAnalyzer()
        self.redis_service = RedisService()
        logger.info("AnalysisHandler 초기화 완료")

    def handle_analysis_request(self, message: dict):
        """
        분석 요청 처리
        
        Args:
            message: Kafka 메시지 (dict)
        """
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
                request_id=message.get("request_id", "unknown"),
                analysis_type=message.get("analysis_type", "TECHNICAL"),
                status="FAILED",
                summary="분석 처리 중 오류 발생",
                recommendation="HOLD",
                confidence=0.0,
                analyzed_at=datetime.now(),
                error_message=str(e)
            )
            
            self.redis_service.save_analysis_result(
                message.get("request_id", "unknown"),
                error_result.model_dump(mode='json')
            )

    def _handle_technical_analysis(self, request: AnalysisRequest) -> AnalysisResult:
        """기술적 분석 처리"""
        analysis_data = self.technical_analyzer.analyze(
            request.symbol,
            request.timeframe or "1d"
        )
        
        return AnalysisResult(
            request_id=request.request_id,
            analysis_type=AnalysisType.TECHNICAL,
            symbol=request.symbol,
            status=analysis_data["status"],
            indicators=analysis_data.get("indicators"),
            summary=analysis_data["summary"],
            recommendation=analysis_data["recommendation"],
            confidence=analysis_data["confidence"],
            analyzed_at=datetime.now()
        )

    def _handle_market_trend_analysis(self, request: AnalysisRequest) -> AnalysisResult:
        """시장 트렌드 분석 처리 (구현 예정)"""
        return AnalysisResult(
            request_id=request.request_id,
            analysis_type=AnalysisType.MARKET_TREND,
            status="SUCCESS",
            summary="시장 트렌드 분석 (구현 예정)",
            recommendation="HOLD",
            confidence=0.5,
            analyzed_at=datetime.now()
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
