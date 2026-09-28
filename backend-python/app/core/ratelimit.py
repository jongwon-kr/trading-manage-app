import threading
import time
from collections import deque


class RateLimiter:
    """공급자별 최소 호출 간격 보장 (프로세스 내, 스레드 안전)"""

    def __init__(self, min_interval_sec: float):
        self.min_interval = min_interval_sec
        self._lock = threading.Lock()
        self._next_at = 0.0

    def wait(self) -> None:
        with self._lock:
            now = time.monotonic()
            if now < self._next_at:
                time.sleep(self._next_at - now)
                now = self._next_at
            self._next_at = now + self.min_interval


class CircuitBreaker:
    """window 초 안에 threshold 회 실패하면 cooldown 초 동안 호출을 건너뛴다."""

    def __init__(self, threshold: int = 5, window_sec: float = 60, cooldown_sec: float = 300):
        self.threshold = threshold
        self.window = window_sec
        self.cooldown = cooldown_sec
        self._failures: deque[float] = deque()
        self._open_until = 0.0
        self._lock = threading.Lock()

    def is_open(self) -> bool:
        return time.monotonic() < self._open_until

    def record_success(self) -> None:
        with self._lock:
            self._failures.clear()

    def record_failure(self) -> None:
        with self._lock:
            now = time.monotonic()
            self._failures.append(now)
            while self._failures and now - self._failures[0] > self.window:
                self._failures.popleft()
            if len(self._failures) >= self.threshold:
                self._open_until = now + self.cooldown
                self._failures.clear()
