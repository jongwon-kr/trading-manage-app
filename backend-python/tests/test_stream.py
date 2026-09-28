import json

import orjson

from app.stream.upbit_ws import ALIVE_KEY, BREADTH_KEY, UpbitStreamer


def _tick(code: str, price: float, change: str) -> bytes:
    return json.dumps({"type": "ticker", "code": code, "trade_price": price, "prev_closing_price": 100.0,
                       "change": change, "signed_change_price": price - 100, "signed_change_rate": (price - 100) / 100,
                       "acc_trade_volume": 5.0, "acc_trade_volume_24h": 9.0, "acc_trade_price_24h": 1e6,
                       "trade_timestamp": 1790576167252}).encode()


def test_flush_writes_snapshot_publishes_changed_only_and_breadth(fake_redis):
    s = UpbitStreamer()
    pubsub = fake_redis.pubsub()
    pubsub.psubscribe("market:tick:*")
    pubsub.get_message(timeout=1)  # 구독 확인 메시지

    s.handle_message(_tick("KRW-BTC", 101, "RISE"))
    s.handle_message(_tick("KRW-BTC", 102, "RISE"))  # 같은 종목은 마지막 값만
    s.handle_message(_tick("KRW-ETH", 99, "FALL"))
    assert s.flush() == 2

    snap = orjson.loads(fake_redis.get("quote:CRYPTO:KRW-BTC"))
    assert snap["price"] == 102 and snap["source"] == "upbit-ws" and snap["key"] == "CRYPTO:KRW-BTC"
    assert snap["accTradeVolume"] == 5.0
    channels = {pubsub.get_message(timeout=1)["channel"] for _ in range(2)}
    assert channels == {b"market:tick:CRYPTO:KRW-BTC", b"market:tick:CRYPTO:KRW-ETH"}
    assert orjson.loads(fake_redis.get(BREADTH_KEY))["advanceRatio"] == 0.5
    assert fake_redis.get(ALIVE_KEY) == b"1"

    # 변화가 없으면 발행하지 않는다
    assert s.flush() == 0


def test_ignores_non_ticker_messages():
    s = UpbitStreamer()
    s.handle_message(b'{"status":"UP"}')
    assert not s.dirty
