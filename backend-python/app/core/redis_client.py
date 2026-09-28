import redis

from app.config import settings

_client: redis.Redis | None = None


def get_redis() -> redis.Redis:
    """프로세스 전역 Redis 클라이언트 (커넥션 풀 공유). 값은 bytes 로 반환된다."""
    global _client
    if _client is None:
        _client = redis.Redis(
            host=settings.REDIS_HOST,
            port=settings.REDIS_PORT,
            password=settings.REDIS_PASSWORD or None,
            socket_timeout=5,
            socket_connect_timeout=3,
        )
    return _client


def set_redis(client: redis.Redis) -> None:
    """테스트에서 fakeredis 주입용."""
    global _client
    _client = client
