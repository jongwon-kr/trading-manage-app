import redis
import json
from typing import Optional, Any
from config import settings
import logging

logger = logging.getLogger(__name__)

class RedisService:
    def __init__(self):
        self.redis_client = redis.Redis(
            host=settings.REDIS_HOST,
            port=settings.REDIS_PORT,
            password=settings.REDIS_PASSWORD if settings.REDIS_PASSWORD else None,
            decode_responses=True
        )
        logger.info(f"Redis 연결 성공: {settings.REDIS_HOST}:{settings.REDIS_PORT}")

    def save_analysis_result(self, request_id: str, result: dict) -> bool:
        """분석 결과를 Redis에 저장"""
        try:
            key = f"analysis:{request_id}"
            value = json.dumps(result)
            self.redis_client.setex(key, settings.ANALYSIS_RESULT_TTL, value)
            logger.info(f"분석 결과 저장 완료: {request_id}")
            return True
        except Exception as e:
            logger.error(f"분석 결과 저장 실패: {request_id}, error: {e}")
            return False

    def get_analysis_result(self, request_id: str) -> Optional[dict]:
        """분석 결과를 Redis에서 조회"""
        try:
            key = f"analysis:{request_id}"
            value = self.redis_client.get(key)
            if value:
                return json.loads(value)
            return None
        except Exception as e:
            logger.error(f"분석 결과 조회 실패: {request_id}, error: {e}")
            return None

    def delete_analysis_result(self, request_id: str) -> bool:
        """분석 결과를 Redis에서 삭제"""
        try:
            key = f"analysis:{request_id}"
            self.redis_client.delete(key)
            logger.info(f"분석 결과 삭제 완료: {request_id}")
            return True
        except Exception as e:
            logger.error(f"분석 결과 삭제 실패: {request_id}, error: {e}")
            return False

    def exists(self, request_id: str) -> bool:
        """분석 결과 존재 여부 확인"""
        try:
            key = f"analysis:{request_id}"
            return self.redis_client.exists(key) > 0
        except Exception as e:
            logger.error(f"분석 결과 존재 확인 실패: {request_id}, error: {e}")
            return False
