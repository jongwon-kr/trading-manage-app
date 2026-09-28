import json

from app.worker.handler import AnalysisHandler


def test_handler_parses_java_localdatetime_array_and_saves_result(fake_redis):
    message = {
        "requestId": "req-1",
        "userEmail": "a@b.c",
        "analysisType": "TECHNICAL",
        "symbol": "AAPL",
        "timeframe": "1d",
        "requestedAt": [2026, 9, 28, 10, 0, 0, 123456789],
    }
    AnalysisHandler().handle_analysis_request(message)

    saved = json.loads(fake_redis.get("analysis:req-1"))
    assert saved["status"] == "SUCCESS"
    assert fake_redis.ttl("analysis:req-1") > 0
