import hmac

from fastapi import Header

from app.config import settings
from app.core.errors import MarketDataError


class Unauthorized(MarketDataError):
    status_code = 401
    code = "UNAUTHORIZED"


def verify_internal_token(x_internal_token: str | None = Header(default=None)) -> None:
    """Java 백엔드만 호출할 수 있도록 공유 토큰을 검증한다."""
    if not x_internal_token or not hmac.compare_digest(x_internal_token, settings.INTERNAL_TOKEN):
        raise Unauthorized("내부 토큰이 올바르지 않습니다.")
