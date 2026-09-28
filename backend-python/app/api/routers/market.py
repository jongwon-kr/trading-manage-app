"""내부 시세 API (/internal/v1). Java 백엔드만 호출한다.

라이브러리(yfinance/pykrx/FDR)가 동기 블로킹이므로 모든 핸들러는 `def` 로 두어 threadpool 에서 실행한다.
"""
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, Query

from app.analysis.jobs import regime_summary
from app.api.deps import verify_internal_token
from app.core.errors import BadRequest
from app.market.models import Market
from app.market.normalize import frame_to_rows, rows_to_candles
from app.market.service import get_service

router = APIRouter(prefix="/internal/v1", dependencies=[Depends(verify_internal_token)])


def _parse_time(value: str | None, name: str) -> datetime | None:
    """'2026-01-02' 또는 ISO datetime. 시간대가 없으면 UTC 로 간주한다."""
    if not value:
        return None
    try:
        dt = datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        raise BadRequest(f"{name} 형식이 올바르지 않습니다: {value} (예: 2026-01-02 또는 2026-01-02T09:00:00Z)")
    return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)


@router.get("/symbols/search")
def search_symbols(q: str, market: Market | None = None, limit: int = Query(20, ge=1, le=50)):
    return [s.dump() for s in get_service().search(q, market, limit)]


@router.get("/symbols/{market}/{code}")
def get_symbol(market: Market, code: str):
    return get_service().get_symbol(market, code).dump()


@router.get("/candles")
def get_candles(market: Market, symbol: str, interval: str = "1d",
                from_: str | None = Query(None, alias="from"), to: str | None = None,
                limit: int = Query(300, ge=1, le=2000)):
    svc = get_service()
    df, source, delayed = svc.get_candles(market, symbol, interval, _parse_time(from_, "from"),
                                          _parse_time(to, "to"), limit)
    return {
        "symbol": svc.get_symbol(market, symbol).dump(),
        "interval": interval,
        "candles": rows_to_candles(frame_to_rows(df)),
        "source": source,
        "delayed": delayed,
    }


@router.get("/quote")
def get_quote(market: Market, symbol: str):
    return get_service().get_quote(market, symbol).dump()


@router.get("/quotes")
def get_quotes(keys: str):
    key_list = [k.strip() for k in keys.split(",") if k.strip()]
    return [q.dump() for q in get_service().get_quotes(key_list)]


@router.get("/fundamentals")
def get_fundamentals(market: Market, symbol: str):
    return get_service().get_fundamentals(market, symbol).dump()


@router.get("/overview")
def get_overview():
    data = dict(get_service().get_overview())
    try:
        data["regime"] = regime_summary()  # 시장별 국면 점수 (10분 캐시)
    except Exception:
        data["regime"] = {}
    return data


@router.get("/movers")
def get_movers(market: Market, limit: int = Query(10, ge=1, le=30)):
    return get_service().get_movers(market, limit)
