import logging
import sys
import threading
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

from app.api.routers import health, market
from app.core.errors import MarketDataError
from app.market.service import get_service

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)],
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(_: FastAPI):
    # 심볼 마스터는 첫 요청 지연을 줄이기 위해 백그라운드로 미리 적재한다
    threading.Thread(target=get_service().symbols.warm_up, daemon=True, name="symbol-warmup").start()
    yield


app = FastAPI(title="tbill market data (internal)", docs_url="/docs", lifespan=lifespan)
app.include_router(health.router)
app.include_router(market.router)


@app.exception_handler(MarketDataError)
def handle_market_error(_: Request, e: MarketDataError):
    if e.status_code >= 500:
        logger.warning(f"{e.code}: {e}")
    return JSONResponse(status_code=e.status_code, content={"code": e.code, "message": str(e)})


@app.exception_handler(RequestValidationError)
def handle_validation_error(_: Request, e: RequestValidationError):
    first = e.errors()[0] if e.errors() else {}
    loc = ".".join(str(x) for x in first.get("loc", []) if x not in ("query", "path"))
    return JSONResponse(status_code=422, content={"code": "MARKET_BAD_REQUEST",
                                                  "message": f"잘못된 요청 파라미터: {loc} ({first.get('msg', '')})"})
