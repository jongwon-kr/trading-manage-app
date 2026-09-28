"""점수 계산 공통 부품.

팩터 점수 s ∈ [-1, +1] (−1 강한 약세 ~ +1 강한 강세).
그룹 점수 = Σ(w·s) / Σw  (사용 가능한 팩터만) , 커버리지 = Σw(사용 가능) / Σw(전체)
"""
from dataclasses import dataclass, field

import numpy as np
import pandas as pd

Score = pd.Series | float | None


def interp(x, xs: list[float], ys: list[float]):
    """구간 선형 보간 (양 끝은 끝값으로 고정). Series 는 NaN 을 유지한다."""
    if isinstance(x, pd.Series):
        vals = x.to_numpy(dtype=float)
        out = np.interp(vals, xs, ys)
        out[np.isnan(vals)] = np.nan
        return pd.Series(out, index=x.index)
    if x is None or (isinstance(x, float) and np.isnan(x)):
        return None
    return float(np.interp(x, xs, ys))


def clip_lin(x, scale: float):
    """x/scale 을 [-1, 1] 로 자른다."""
    if isinstance(x, pd.Series):
        return (x / scale).clip(-1, 1)
    if x is None or (isinstance(x, float) and np.isnan(x)):
        return None
    return float(np.clip(x / scale, -1, 1))


@dataclass
class Factor:
    key: str
    label: str
    weight: float  # 그룹 내 가중치
    score: Score  # Series(시계열) | float(단일 시점) | None(데이터 없음)
    raw: dict = field(default_factory=dict)  # 표시용 원시값 (마지막 시점)
    sub_group: str | None = None
    note: str = ""

    def value_at(self, i: int = -1) -> float | None:
        if self.score is None:
            return None
        if isinstance(self.score, pd.Series):
            if len(self.score) == 0:
                return None
            v = self.score.iloc[i]
            return None if pd.isna(v) else float(v)
        return None if np.isnan(self.score) else float(self.score)


def group_series(factors: list[Factor], index: pd.Index) -> tuple[pd.Series, pd.Series]:
    """시계열 그룹 점수와 커버리지 (백테스트용). 단일 값 팩터는 전 구간 상수로 취급한다."""
    total_w = sum(f.weight for f in factors) or 1.0
    num = pd.Series(0.0, index=index)
    den = pd.Series(0.0, index=index)
    for f in factors:
        if f.score is None:
            continue
        s = f.score.reindex(index) if isinstance(f.score, pd.Series) else pd.Series(f.score, index=index)
        ok = s.notna()
        num += (s.fillna(0) * f.weight).where(ok, 0.0)
        den += pd.Series(f.weight, index=index).where(ok, 0.0)
    score = (num / den).where(den > 0)
    return score, den / total_w


def group_point(factors: list[Factor]) -> tuple[float | None, float]:
    """마지막 시점 그룹 점수와 커버리지"""
    total_w = sum(f.weight for f in factors) or 1.0
    avail = [(f.weight, v) for f in factors if (v := f.value_at()) is not None]
    if not avail:
        return None, 0.0
    w = sum(a for a, _ in avail)
    return sum(a * v for a, v in avail) / w, w / total_w
