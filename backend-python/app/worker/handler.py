import json
import logging
from datetime import datetime, timezone

from app.analysis.jobs import infer_market, run_market_trend, run_strategy
from app.analysis.schemas import SCHEMA_VERSION, AnalysisRequest, AnalysisType
from app.config import settings
from app.core.errors import BadRequest, MarketDataError
from app.core.redis_client import get_redis
from app.market.models import Market

logger = logging.getLogger(__name__)


class AnalysisHandler:
    """Kafka 분석 요청 → 분석 실행 → Redis analysis:{requestId} 에 결과 기록.

    상태: RUNNING(처리 시작) → SUCCESS | FAILED. Java 는 키가 없으면 PROCESSING 으로 응답한다.
    어떤 경우에도(요청 파싱 실패 포함) FAILED 를 기록해 클라이언트가 무한 대기하지 않게 한다.
    """

    def handle_analysis_request(self, message: dict):
        request_id = str(message.get("requestId") or "unknown")
        analysis_type = message.get("analysisType")
        try:
            request = AnalysisRequest(**message)
        except Exception as e:
            logger.warning(f"잘못된 분석 요청: {request_id}: {e}")
            self._save(request_id, self._envelope(request_id, analysis_type, "FAILED",
                                                  errorMessage=f"잘못된 분석 요청입니다: {e}"))
            return

        rid, rtype = request.request_id, request.analysis_type.value
        logger.info(f"분석 요청 처리 시작: request_id={rid}, type={rtype}, symbol={request.symbol}")
        self._save(rid, self._envelope(rid, rtype, "RUNNING"))
        try:
            result = self._dispatch(request)
            self._save(rid, {**self._envelope(rid, rtype, "SUCCESS"), **result})
            logger.info(f"분석 요청 처리 완료: request_id={rid}")
        except MarketDataError as e:
            logger.warning(f"분석 실패: request_id={rid}: {e}")
            self._save(rid, self._envelope(rid, rtype, "FAILED", errorMessage=str(e)))
        except Exception as e:
            logger.error(f"분석 처리 중 오류: request_id={rid}: {e}", exc_info=True)
            self._save(rid, self._envelope(rid, rtype, "FAILED", errorMessage="분석 처리 중 오류가 발생했습니다."))

    def _dispatch(self, request: AnalysisRequest) -> dict:
        t = request.analysis_type
        params = request.params()
        if t in (AnalysisType.TECHNICAL, AnalysisType.STRATEGY):
            if not request.symbol:
                raise BadRequest("종목(symbol)이 필요합니다.")
            market = infer_market(request.market, request.symbol)
            params.setdefault("interval", request.timeframe or "1d")
            include = ("technical",) if t == AnalysisType.TECHNICAL else ("technical", "fundamental", "regime")
            return run_strategy(market, request.symbol, params, include)
        if t == AnalysisType.MARKET_TREND:
            if request.market not in Market.__members__:
                raise BadRequest(f"시장 코드가 올바르지 않습니다: {request.market} (KR_STOCK | US_STOCK | CRYPTO)")
            return run_market_trend(Market(request.market))
        if t == AnalysisType.BACKTEST:
            from app.analysis.backtest import run_backtest_request  # 백테스트 모듈은 필요할 때만 로드
            return run_backtest_request(request, params, self._progress(request.request_id))
        raise BadRequest(f"지원하지 않는 분석 유형입니다: {t.value}")

    def _progress(self, request_id: str):
        def report(pct: float, message: str = "") -> None:
            self._save(request_id, self._envelope(request_id, AnalysisType.BACKTEST.value, "RUNNING",
                                                  progress=round(pct, 2), message=message))
        return report

    @staticmethod
    def _envelope(request_id: str, analysis_type, status: str, **extra) -> dict:
        return {"schemaVersion": SCHEMA_VERSION, "requestId": request_id, "analysisType": analysis_type,
                "status": status, "analyzedAt": datetime.now(timezone.utc).isoformat(), **extra}

    def _save(self, request_id: str, result: dict) -> None:
        """분석 결과를 Redis analysis:{requestId} 에 저장 (Java AnalysisResultCacheService 가 조회)"""
        ttl = settings.BACKTEST_RESULT_TTL if result.get("analysisType") == "BACKTEST" else settings.ANALYSIS_RESULT_TTL
        try:
            get_redis().set(f"analysis:{request_id}", json.dumps(result, ensure_ascii=False), ex=ttl)
        except Exception as e:
            logger.error(f"분석 결과 저장 실패: {request_id}, error: {e}")
