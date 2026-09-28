import logging
from typing import Callable, TypeVar

import httpx
import pandas as pd

from app.core.errors import MarketDataError, ProviderUnavailable
from app.core.ratelimit import CircuitBreaker, RateLimiter

logger = logging.getLogger(__name__)
T = TypeVar("T")

USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140 Safari/537.36"


class Provider:
    """공급자 공통: 호출 간격 제한 + 서킷브레이커 + (필요 시) 공용 httpx 클라이언트"""

    name = "base"
    min_interval = 0.1

    def __init__(self):
        self.limiter = RateLimiter(self.min_interval)
        self.breaker = CircuitBreaker()
        self._http: httpx.Client | None = None

    @property
    def http(self) -> httpx.Client:
        if self._http is None:
            self._http = httpx.Client(timeout=10, headers={"User-Agent": USER_AGENT})
        return self._http

    def get_json(self, url: str, **params):
        self.limiter.wait()
        res = self.http.get(url, params=params or None)
        res.raise_for_status()
        return res.json()


def first_success(attempts: list[tuple[Provider, Callable[[], T]]], what: str) -> tuple[T, str]:
    """폴백 체인: 앞 공급자부터 시도하고 성공한 결과와 공급자 이름을 반환한다.

    - 서킷이 열린 공급자는 건너뛴다.
    - 빈 DataFrame/빈 리스트는 '다음 공급자 시도' 로 취급하되, 전부 비면 빈 결과를 반환한다.
    - MarketDataError(심볼 없음 등 도메인 오류)는 폴백하지 않고 그대로 전파한다.
    """
    empty: tuple[T, str] | None = None
    errors: list[str] = []
    for provider, fn in attempts:
        if provider.breaker.is_open():
            errors.append(f"{provider.name}: circuit open")
            continue
        try:
            value = fn()
        except MarketDataError:
            raise
        except Exception as e:
            provider.breaker.record_failure()
            errors.append(f"{provider.name}: {type(e).__name__}: {e}")
            logger.warning(f"공급자 실패, 다음으로 폴백: {what} / {provider.name}: {e}")
            continue
        provider.breaker.record_success()
        if _is_empty(value):
            empty = empty or (value, provider.name)
            continue
        return value, provider.name
    if empty is not None:
        return empty
    raise ProviderUnavailable(f"{what} 조회 실패 ({'; '.join(errors) or '공급자 없음'})")


def _is_empty(value) -> bool:
    if value is None:
        return True
    if isinstance(value, pd.DataFrame):
        return value.empty
    if isinstance(value, (list, dict)):
        return len(value) == 0
    return False


def parse_number(value) -> float | None:
    """'273,000' / '-12,500' / '12.22배' / '0.61%' / '22,292원' → float"""
    if value is None:
        return None
    if isinstance(value, (int, float)):
        return float(value)
    s = str(value).strip().replace(",", "")
    for suffix in ("배", "%", "원"):
        s = s.removesuffix(suffix)
    try:
        return float(s)
    except ValueError:
        return None


def parse_korean_amount(value: str | None) -> float | None:
    """'4조 2,655억' → 4.2655e12"""
    if not value:
        return None
    units = {"조": 1e12, "억": 1e8, "만": 1e4}
    total, num = 0.0, ""
    for ch in str(value).replace(",", "").replace(" ", ""):
        if ch in units:
            total += float(num or 0) * units[ch]
            num = ""
        elif ch.isdigit() or ch == ".":
            num += ch
    if num:
        total += float(num)
    return total or None
