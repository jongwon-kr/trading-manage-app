from datetime import datetime, time
from zoneinfo import ZoneInfo

from app.market.models import Market

SEOUL = ZoneInfo("Asia/Seoul")
NEW_YORK = ZoneInfo("America/New_York")

# 정규장 시간 (공휴일은 고려하지 않음 — 휴장일에는 OPEN 으로 보일 수 있으나 캐시 TTL 에만 영향)
_SESSIONS = {
    Market.KR_STOCK: (SEOUL, time(9, 0), time(15, 30)),
    Market.US_STOCK: (NEW_YORK, time(9, 30), time(16, 0)),
}


def is_market_open(market: Market, now: datetime | None = None) -> bool:
    if market == Market.CRYPTO:
        return True
    tz, start, end = _SESSIONS[market]
    local = (now or datetime.now(tz)).astimezone(tz)
    return local.weekday() < 5 and start <= local.time() <= end


def market_status(market: Market, now: datetime | None = None) -> str:
    return "OPEN" if is_market_open(market, now) else "CLOSED"


def market_timezone(market: Market) -> ZoneInfo:
    return NEW_YORK if market == Market.US_STOCK else SEOUL
