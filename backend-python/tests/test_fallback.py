import pandas as pd
import pytest

from app.core.errors import ProviderUnavailable, SymbolNotFound
from app.market.providers.base import Provider, first_success, parse_korean_amount, parse_number


class P(Provider):
    def __init__(self, name):
        super().__init__()
        self.name = name


def boom():
    raise RuntimeError("down")


def test_falls_back_to_next_provider_and_reports_source():
    a, b = P("a"), P("b")
    value, source = first_success([(a, boom), (b, lambda: [1])], "x")
    assert value == [1] and source == "b"


def test_empty_result_tries_next_but_is_returned_if_all_empty():
    a, b = P("a"), P("b")
    value, source = first_success([(a, lambda: pd.DataFrame()), (b, lambda: pd.DataFrame())], "x")
    assert value.empty and source == "a"


def test_all_fail_raises_provider_unavailable():
    with pytest.raises(ProviderUnavailable):
        first_success([(P("a"), boom)], "x")


def test_domain_errors_are_not_swallowed():
    def not_found():
        raise SymbolNotFound("no")
    with pytest.raises(SymbolNotFound):
        first_success([(P("a"), not_found), (P("b"), lambda: [1])], "x")


def test_circuit_opens_after_repeated_failures():
    a, b = P("a"), P("b")
    for _ in range(5):
        first_success([(a, boom), (b, lambda: [1])], "x")
    calls = []
    first_success([(a, lambda: calls.append(1) or [1]), (b, lambda: [2])], "x")
    assert calls == []  # 서킷이 열려 a 는 호출되지 않음


def test_number_parsers():
    assert parse_number("273,000") == 273000
    assert parse_number("-12,500") == -12500
    assert parse_number("12.22배") == 12.22
    assert parse_number("0.61%") == 0.61
    assert parse_number("-") is None
    assert parse_korean_amount("4조 2,655억") == pytest.approx(4.2655e12)
    assert parse_korean_amount("1,593조 1,109억") == pytest.approx(1.5931109e15)
