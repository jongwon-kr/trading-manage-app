"""공급자별 캔들 DataFrame 을 공통 형식으로 정규화한다.

공통 형식: 컬럼 open/high/low/close/volume (float64), 인덱스 `time` = 봉 시작 시각(UTC, tz-aware).
일봉 이상은 거래소 현지 거래일 00:00 UTC 로 표현한다 → 브라우저 시간대와 무관하게 같은 날짜로 보인다.
"""
from datetime import datetime, timezone

import pandas as pd

COLUMNS = ["open", "high", "low", "close", "volume"]


def to_ohlcv(df: pd.DataFrame, rename: dict[str, str] | None = None, daily: bool = False) -> pd.DataFrame:
    if df is None or df.empty:
        return pd.DataFrame(columns=COLUMNS, index=pd.DatetimeIndex([], tz="UTC", name="time"))
    out = df.rename(columns=rename or {c: c.lower() for c in df.columns})
    for c in COLUMNS:
        if c not in out.columns:
            out[c] = 0.0 if c == "volume" else float("nan")
    out = out[COLUMNS].astype("float64")

    idx = pd.DatetimeIndex(out.index)
    if daily:
        # 현지 날짜만 취해 00:00 UTC 로 고정
        dates = idx.tz_localize(None) if idx.tz is not None else idx
        idx = pd.DatetimeIndex(dates.normalize()).tz_localize("UTC")
    else:
        idx = idx.tz_localize("UTC") if idx.tz is None else idx.tz_convert("UTC")
    out.index = idx.rename("time")

    out = out[~out.index.duplicated(keep="last")].sort_index()
    out = out.dropna(subset=["close"])
    out["volume"] = out["volume"].fillna(0.0)
    return out


def resample(df: pd.DataFrame, interval: str) -> pd.DataFrame:
    """일봉 → 주봉(월요일 시작)/월봉(1일 시작), 1시간봉 → 4시간봉."""
    rule = {"1w": "W-MON", "1M": "MS", "4h": "4h"}[interval]
    kw = {"label": "left", "closed": "left"} if interval == "1w" else {}
    agg = df.resample(rule, **kw).agg(
        {"open": "first", "high": "max", "low": "min", "close": "last", "volume": "sum"})
    return agg.dropna(subset=["close"])


def frame_to_rows(df: pd.DataFrame) -> list[list[float]]:
    """캐시 저장용 컴팩트 표현 [[epochSec, o, h, l, c, v], ...]"""
    ts = (df.index.asi8 // 1_000_000_000).tolist()
    vals = df[COLUMNS].to_numpy().tolist()
    return [[t, *v] for t, v in zip(ts, vals)]


def rows_to_frame(rows: list[list[float]]) -> pd.DataFrame:
    if not rows:
        return to_ohlcv(pd.DataFrame())
    df = pd.DataFrame(rows, columns=["time", *COLUMNS])
    df.index = pd.to_datetime(df.pop("time"), unit="s", utc=True).rename("time")
    return df.astype("float64")


def rows_to_candles(rows: list[list[float]]) -> list[dict]:
    """API 응답 형식 (lightweight-charts 와 동일한 필드명)"""
    return [{"time": int(r[0]), "open": r[1], "high": r[2], "low": r[3], "close": r[4], "volume": r[5]}
            for r in rows]


def now_ms() -> int:
    return int(datetime.now(timezone.utc).timestamp() * 1000)
