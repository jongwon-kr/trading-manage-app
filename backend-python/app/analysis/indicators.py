"""기술적 지표 (직접 구현, pandas Series → Series).

- 모든 함수는 입력과 같은 인덱스의 Series 를 반환하고, 계산 불가 구간은 NaN.
- 라이브 점수(마지막 값)와 백테스트(전체 시계열)가 같은 함수를 쓰므로 두 결과가 항상 일치한다.
- 공식은 frontend/src/lib/indicators.ts 와 동일하다: RSI·ATR·ADX 는 Wilder 평활(첫 값은 SMA),
  EMA 는 adjust=False (첫 값은 SMA), 볼린저 밴드는 모집단 표준편차(ddof=0).
"""
import numpy as np
import pandas as pd


def _seeded_smooth(s: pd.Series, n: int, alpha: float) -> pd.Series:
    """첫 n 개 유효값의 평균으로 시작해 y_t = α·x_t + (1-α)·y_{t-1} 로 평활한다."""
    values = s.to_numpy(dtype=float)
    out = np.full(len(values), np.nan)
    valid = ~np.isnan(values)
    # 연속 유효값이 n 개 쌓이는 첫 위치 찾기
    run = 0
    start = -1
    for i, ok in enumerate(valid):
        run = run + 1 if ok else 0
        if run == n:
            start = i
            break
    if start < 0:
        return pd.Series(out, index=s.index)
    prev = values[start - n + 1:start + 1].mean()
    out[start] = prev
    for i in range(start + 1, len(values)):
        x = values[i]
        if np.isnan(x):
            out[i] = prev
            continue
        prev = alpha * x + (1 - alpha) * prev
        out[i] = prev
    return pd.Series(out, index=s.index)


def sma(s: pd.Series, n: int) -> pd.Series:
    return s.rolling(n, min_periods=n).mean()


def ema(s: pd.Series, n: int) -> pd.Series:
    return _seeded_smooth(s, n, 2 / (n + 1))


def wilder(s: pd.Series, n: int) -> pd.Series:
    return _seeded_smooth(s, n, 1 / n)


def rsi(close: pd.Series, n: int = 14) -> pd.Series:
    delta = close.diff()
    gain = wilder(delta.clip(lower=0), n)
    loss = wilder((-delta).clip(lower=0), n)
    rs = gain / loss
    out = 100 - 100 / (1 + rs)
    return out.where(loss != 0, 100.0).where(gain.notna())


def macd(close: pd.Series, fast: int = 12, slow: int = 26, signal: int = 9) -> pd.DataFrame:
    line = ema(close, fast) - ema(close, slow)
    sig = ema(line, signal)
    return pd.DataFrame({"macd": line, "signal": sig, "hist": line - sig})


def true_range(df: pd.DataFrame) -> pd.Series:
    prev_close = df["close"].shift(1)
    tr = pd.concat([df["high"] - df["low"], (df["high"] - prev_close).abs(), (df["low"] - prev_close).abs()],
                   axis=1).max(axis=1)
    tr.iloc[0] = df["high"].iloc[0] - df["low"].iloc[0]
    return tr


def atr(df: pd.DataFrame, n: int = 14) -> pd.Series:
    return wilder(true_range(df), n)


def adx(df: pd.DataFrame, n: int = 14) -> pd.DataFrame:
    """ADX, +DI, -DI (Wilder)"""
    up = df["high"].diff()
    down = -df["low"].diff()
    plus_dm = pd.Series(np.where((up > down) & (up > 0), up, 0.0), index=df.index)
    minus_dm = pd.Series(np.where((down > up) & (down > 0), down, 0.0), index=df.index)
    plus_dm.iloc[0] = minus_dm.iloc[0] = np.nan
    tr = true_range(df)
    tr.iloc[0] = np.nan
    s_tr = wilder(tr, n)
    plus_di = 100 * wilder(plus_dm, n) / s_tr
    minus_di = 100 * wilder(minus_dm, n) / s_tr
    di_sum = plus_di + minus_di
    dx = (100 * (plus_di - minus_di).abs() / di_sum).where(di_sum > 0, 0.0).where(di_sum.notna())
    return pd.DataFrame({"adx": wilder(dx, n), "plus_di": plus_di, "minus_di": minus_di})


def bollinger(close: pd.Series, n: int = 20, k: float = 2.0) -> pd.DataFrame:
    mid = sma(close, n)
    sd = close.rolling(n, min_periods=n).std(ddof=0)
    upper = mid + k * sd
    lower = mid - k * sd
    width = upper - lower
    return pd.DataFrame({
        "mid": mid, "upper": upper, "lower": lower,
        "pct_b": ((close - lower) / width).where(width > 0),
        "bandwidth": (width / mid).where(mid != 0),
    })


def roc(close: pd.Series, n: int) -> pd.Series:
    return close / close.shift(n) - 1


def obv(df: pd.DataFrame) -> pd.Series:
    direction = np.sign(df["close"].diff()).fillna(0.0)
    return (direction * df["volume"]).cumsum()


def realized_vol(close: pd.Series, n: int = 20, periods_per_year: int = 252) -> pd.Series:
    """로그수익률 표준편차 × √연환산"""
    return np.log(close).diff().rolling(n, min_periods=n).std() * np.sqrt(periods_per_year)


def rolling_pct_rank(s: pd.Series, window: int, min_periods: int | None = None) -> pd.Series:
    """각 시점 값이 직전 window 기간 안에서 차지하는 백분위 (0~1)"""
    return s.rolling(window, min_periods=min_periods or window // 2).apply(
        lambda x: np.mean(x <= x[-1]), raw=True)
