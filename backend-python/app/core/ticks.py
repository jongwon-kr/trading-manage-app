"""호가 단위 반올림 (KRX 통합 호가단위 2023~, Upbit KRW 마켓). US 는 0.01."""
import math

_KRX = [(2_000, 1), (5_000, 5), (20_000, 10), (50_000, 50), (200_000, 100), (500_000, 500)]
_KRX_MAX = 1_000

_UPBIT_KRW = [(0.0001, 0.00000001), (0.001, 0.0000001), (0.01, 0.000001), (0.1, 0.00001), (1, 0.0001),
              (10, 0.001), (100, 0.01), (1_000, 0.1), (10_000, 1), (100_000, 10), (500_000, 50),
              (1_000_000, 100), (2_000_000, 500)]
_UPBIT_MAX = 1_000


def tick_size(market: str, price: float) -> float:
    if market == "US_STOCK":
        return 0.01
    table, top = (_KRX, _KRX_MAX) if market == "KR_STOCK" else (_UPBIT_KRW, _UPBIT_MAX)
    for bound, tick in table:
        if price < bound:
            return tick
    return top


def round_price(market: str, price: float, mode: str = "nearest") -> float:
    """mode: nearest | down | up"""
    if price is None or price <= 0:
        return price
    tick = tick_size(market, price)
    q = price / tick
    n = math.floor(q + 1e-9) if mode == "down" else math.ceil(q - 1e-9) if mode == "up" else round(q)
    value = n * tick
    decimals = max(0, -int(math.floor(math.log10(tick)))) if tick < 1 else 0
    return round(value, decimals)
