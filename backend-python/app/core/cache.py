import logging
import time
from typing import Any, Callable

import orjson

from app.core.redis_client import get_redis

logger = logging.getLogger(__name__)

_LOCK_MS = 15_000
_WAIT_SEC = 3.0


def get_or_load(key: str, ttl: int, loader: Callable[[], Any]) -> Any:
    """Redis 캐시 조회 → 없으면 loader 실행 후 저장.

    같은 키를 여러 요청이 동시에 채우지 않도록 SET NX 락(single-flight)을 건다.
    락을 못 잡은 요청은 최대 3초간 캐시가 채워지기를 기다린 뒤, 그래도 없으면 직접 로드한다.
    Redis 장애 시에는 캐시 없이 loader 결과를 그대로 반환한다.
    """
    try:
        r = get_redis()
        raw = r.get(key)
        if raw is not None:
            return orjson.loads(raw)
        lock_key = f"lock:{key}"
        if not r.set(lock_key, b"1", nx=True, px=_LOCK_MS):
            deadline = time.monotonic() + _WAIT_SEC
            while time.monotonic() < deadline:
                time.sleep(0.1)
                raw = r.get(key)
                if raw is not None:
                    return orjson.loads(raw)
    except Exception as e:
        logger.warning(f"캐시 조회 실패, 캐시 없이 진행: key={key}, error={e}")
        return loader()

    try:
        value = loader()
        if value is not None:
            r.set(key, orjson.dumps(value, option=orjson.OPT_SERIALIZE_NUMPY), ex=ttl)
        return value
    finally:
        try:
            r.delete(lock_key)
        except Exception:
            pass


def get_json(key: str) -> Any | None:
    try:
        raw = get_redis().get(key)
        return orjson.loads(raw) if raw is not None else None
    except Exception:
        return None


def set_json(key: str, value: Any, ttl: int) -> None:
    try:
        get_redis().set(key, orjson.dumps(value, option=orjson.OPT_SERIALIZE_NUMPY), ex=ttl)
    except Exception as e:
        logger.warning(f"캐시 저장 실패: key={key}, error={e}")
