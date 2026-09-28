from fastapi import APIRouter

from app.core.redis_client import get_redis

router = APIRouter()


@router.get("/health")
def health() -> dict:
    """프로세스/Redis 상태 확인 (k8s probe 용, 인증 없음)"""
    try:
        redis_ok = bool(get_redis().ping())
    except Exception:
        redis_ok = False
    return {"status": "UP" if redis_ok else "DEGRADED", "redis": redis_ok}
