from fastapi import APIRouter

from app.core.redis_client import get_redis

router = APIRouter()


@router.get("/health")
def health() -> dict:
    """프로세스/Redis 상태 확인 (k8s probe 용, 인증 없음)"""
    try:
        r = get_redis()
        redis_ok = bool(r.ping())
        streamer_alive = bool(r.exists("stream:upbit:alive"))
    except Exception:
        redis_ok = streamer_alive = False
    return {"status": "UP" if redis_ok else "DEGRADED", "redis": redis_ok, "streamerAlive": streamer_alive}
