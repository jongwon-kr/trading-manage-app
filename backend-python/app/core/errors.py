class MarketDataError(Exception):
    """시세 계층 예외의 기반. API 에서 {code, message} + status 로 변환된다."""

    status_code = 500
    code = "MARKET_ERROR"


class SymbolNotFound(MarketDataError):
    status_code = 404
    code = "MARKET_SYMBOL_NOT_FOUND"


class BadRequest(MarketDataError):
    status_code = 422
    code = "MARKET_BAD_REQUEST"


class IntervalNotSupported(BadRequest):
    code = "INTERVAL_NOT_SUPPORTED"


class ProviderUnavailable(MarketDataError):
    """모든 공급자가 실패했거나 차단(circuit open) 상태"""

    status_code = 503
    code = "MARKET_DATA_UNAVAILABLE"


class InsufficientData(MarketDataError):
    status_code = 422
    code = "INSUFFICIENT_DATA"
