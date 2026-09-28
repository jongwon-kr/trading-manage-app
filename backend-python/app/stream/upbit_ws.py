"""Upbit 실시간 시세 스트리머.

KRW 전 종목(약 250~300개) ticker 를 한 연결로 구독하고, 종목별 최신 tick 을 모아 1초마다
  SET     quote:CRYPTO:{code}         (최신 시세 스냅샷, EX 120)
  PUBLISH market:tick:CRYPTO:{code}   (Java SSE 허브가 구독)
로 내보낸다. 수요 추적 없이 전 종목을 구독하므로 구독/해지 경합이 없고 첫 tick 지연도 없다.
반드시 1개 프로세스만 실행해야 한다 (중복 실행 시 tick 이 두 번 발행됨).
"""
import asyncio
import json
import logging
import time
import uuid

import orjson
import websockets

from app.core.redis_client import get_redis
from app.market.providers.upbit_provider import UpbitProvider, ticker_to_quote

logger = logging.getLogger(__name__)

WS_URL = "wss://api.upbit.com/websocket/v1"
FLUSH_SEC = 1.0
SNAPSHOT_TTL = 120
ALIVE_KEY = "stream:upbit:alive"
BREADTH_KEY = "regime:crypto:breadth"
MARKET_REFRESH_SEC = 6 * 3600
SOURCE = "upbit-ws"


class UpbitStreamer:
    def __init__(self):
        self.upbit = UpbitProvider()
        self.latest: dict[str, dict] = {}  # code → 마지막 tick (전 종목, breadth 계산용)
        self.dirty: set[str] = set()  # 마지막 flush 이후 바뀐 종목

    def handle_message(self, raw: bytes | str) -> None:
        msg = json.loads(raw)
        code = msg.get("code")
        if msg.get("type") != "ticker" or not code:
            return
        self.latest[code] = msg
        self.dirty.add(code)

    def flush(self) -> int:
        """바뀐 종목만 Redis 에 기록·발행. 발행 건수를 반환."""
        r = get_redis()
        pipe = r.pipeline(transaction=False)
        codes, self.dirty = self.dirty, set()
        for code in codes:
            payload = orjson.dumps(ticker_to_quote(self.latest[code], SOURCE).dump())
            pipe.set(f"quote:CRYPTO:{code}", payload, ex=SNAPSHOT_TTL)
            pipe.publish(f"market:tick:CRYPTO:{code}", payload)
        pipe.set(ALIVE_KEY, b"1", ex=30)
        if self.latest:
            rising = sum(1 for t in self.latest.values() if t.get("change") == "RISE")
            pipe.set(BREADTH_KEY, orjson.dumps({"advanceRatio": rising / len(self.latest),
                                                "count": len(self.latest), "ts": int(time.time() * 1000)}),
                     ex=SNAPSHOT_TTL)
        pipe.execute()
        return len(codes)

    async def run_forever(self) -> None:
        backoff = 1.0
        while True:
            try:
                codes = [m["market"] for m in self.upbit.markets()]
                logger.info(f"Upbit WebSocket 연결: KRW {len(codes)}개 종목 구독")
                await self._session(codes)
                backoff = 1.0  # 정상 종료(주기적 재구독)면 즉시 재연결
            except asyncio.CancelledError:
                raise
            except Exception as e:
                logger.warning(f"Upbit WebSocket 오류, {backoff:.0f}초 후 재연결: {e}")
                await asyncio.sleep(backoff)
                backoff = min(backoff * 2, 30.0)

    async def _session(self, codes: list[str]) -> None:
        started = time.monotonic()
        async with websockets.connect(WS_URL, ping_interval=30, ping_timeout=20, max_size=2**22) as ws:
            await ws.send(json.dumps([{"ticket": str(uuid.uuid4())},
                                      {"type": "ticker", "codes": codes}, {"format": "DEFAULT"}]))
            next_flush = time.monotonic() + FLUSH_SEC
            while time.monotonic() - started < MARKET_REFRESH_SEC:  # 신규 상장 반영을 위해 주기적으로 재구독
                timeout = max(next_flush - time.monotonic(), 0.01)
                try:
                    self.handle_message(await asyncio.wait_for(ws.recv(), timeout))
                except asyncio.TimeoutError:
                    pass
                if time.monotonic() >= next_flush:
                    try:
                        self.flush()
                    except Exception as e:
                        logger.warning(f"Redis 기록 실패 (계속 진행): {e}")
                    next_flush = time.monotonic() + FLUSH_SEC
