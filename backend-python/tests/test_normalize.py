import pandas as pd

from app.market.normalize import frame_to_rows, resample, rows_to_frame, to_ohlcv


def test_daily_bars_are_pinned_to_local_date_midnight_utc():
    idx = pd.DatetimeIndex(["2026-09-24 00:00", "2026-09-25 00:00"]).tz_localize("America/New_York")
    df = pd.DataFrame({"Open": [1, 2], "High": [1, 2], "Low": [1, 2], "Close": [1, 2], "Volume": [10, 20]}, index=idx)
    out = to_ohlcv(df, daily=True)
    # 뉴욕 9/25 00:00 은 UTC 로 04:00 이지만, 일봉은 거래일 00:00Z 로 고정되어야 한다
    assert out.index[-1] == pd.Timestamp("2026-09-25", tz="UTC")


def test_intraday_converted_to_utc_and_deduplicated():
    idx = pd.DatetimeIndex(["2026-09-25 09:30", "2026-09-25 09:30", "2026-09-25 10:30"]).tz_localize("America/New_York")
    df = pd.DataFrame({"Open": [1, 9, 2], "High": [1, 9, 2], "Low": [1, 9, 2], "Close": [1, 9, 2], "Volume": [1, 9, 2]}, index=idx)
    out = to_ohlcv(df)
    assert len(out) == 2
    assert out.iloc[0]["close"] == 9  # 중복은 마지막 값 유지
    assert str(out.index.tz) == "UTC"


def test_weekly_resample_starts_on_monday():
    idx = pd.date_range("2026-09-21", "2026-10-02", freq="B", tz="UTC")  # 월~금 2주
    df = pd.DataFrame({"open": range(10), "high": range(10), "low": range(10), "close": range(10), "volume": [1] * 10},
                      index=idx, dtype=float)
    out = resample(df, "1w")
    assert list(out.index.day_name()) == ["Monday", "Monday"]
    assert out.iloc[0]["open"] == 0 and out.iloc[0]["close"] == 4 and out.iloc[0]["volume"] == 5


def test_rows_roundtrip():
    idx = pd.date_range("2026-01-01", periods=3, freq="D", tz="UTC")
    df = pd.DataFrame({"open": [1.0, 2, 3], "high": [1.0, 2, 3], "low": [1.0, 2, 3], "close": [1.0, 2, 3],
                       "volume": [0.0, 0, 0]}, index=idx)
    back = rows_to_frame(frame_to_rows(df))
    pd.testing.assert_frame_equal(back, df, check_names=False, check_freq=False)
