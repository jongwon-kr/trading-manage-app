"""사용자 전략 설정(StrategyConfig) — 모델 v1 의 모든 가중치·파라미터·밴드·임계값을 바꿀 수 있다.

- 요청에는 전체 설정이나 바꿀 부분만(diff) 담을 수 있다. parse_config 가 기본값에 깊은 병합한 뒤 검증한다.
- 검증 실패는 ConfigError(422) 로, errors=[{path, msg}] 에 필드 경로(camelCase)를 담는다.
- config_hash 는 정규화된 설정의 지문이다. 캐시 키와 커뮤니티 성과 검증(백테스트 결과 ↔ 전략)에 쓴다.
"""
import copy
import hashlib
import json
import math
from functools import lru_cache

from pydantic import BaseModel, ConfigDict, ValidationError
from pydantic.alias_generators import to_camel

from app.analysis.model.catalog import (DEFAULT_GROUP_WEIGHTS, DEFAULT_SUBGROUP_WEIGHTS, FACTOR_BY_KEY, FACTORS,
                                        GROUP_LABELS)
from app.core.errors import BadRequest

MAX_BAND_POINTS = 8
MAX_WEIGHT = 10.0


class ConfigError(BadRequest):
    code = "STRATEGY_CONFIG_INVALID"

    def __init__(self, errors: list[dict]):
        self.errors = errors
        first = errors[0] if errors else {"path": "", "msg": "잘못된 설정"}
        suffix = f" 외 {len(errors) - 1}건" if len(errors) > 1 else ""
        super().__init__(f"전략 설정 오류: {first['path']} — {first['msg']}{suffix}")


class _Model(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True, extra="forbid")


class Band(_Model):
    xs: list[float]
    ys: list[float]


class FactorConfig(_Model):
    enabled: bool = True
    weight: float
    params: dict[str, float] = {}
    bands: dict[str, Band] = {}


class SignalConfig(_Model):
    strong_buy: float = 75
    buy: float = 60
    sell: float = 40
    strong_sell: float = 25


class GateConfig(_Model):
    enabled: bool = True
    threshold: float = -0.5  # 시장 국면 점수(-1~1)가 이보다 낮으면 매수 신호를 관망으로


class RiskConfig(_Model):
    stop_atr_stock: float = 2.0
    stop_atr_crypto: float = 2.5
    target1_r: float = 1.5
    target2_r: float = 3.0
    max_position_stock: float = 0.25
    max_position_crypto: float = 0.10


class StrategyConfig(_Model):
    group_weights: dict[str, dict[str, float]]
    subgroup_weights: dict[str, float]
    factors: dict[str, FactorConfig]
    signal: SignalConfig = SignalConfig()
    gate: GateConfig = GateConfig()
    risk: RiskConfig = RiskConfig()

    # ------------------------------------------------------------ 조회 도우미
    def factor(self, key: str) -> FactorConfig:
        return self.factors[key]

    def param(self, key: str, name: str) -> float:
        return self.factors[key].params[name]

    def iparam(self, key: str, name: str) -> int:
        return int(round(self.factors[key].params[name]))

    def band(self, key: str, name: str) -> tuple[list[float], list[float]]:
        b = self.factors[key].bands[name]
        return b.xs, b.ys

    def stop_atr(self, market: str) -> float:
        return self.risk.stop_atr_crypto if market == "CRYPTO" else self.risk.stop_atr_stock

    def max_position(self, market: str) -> float:
        return self.risk.max_position_crypto if market == "CRYPTO" else self.risk.max_position_stock

    def dump(self) -> dict:
        return self.model_dump(by_alias=True)


@lru_cache(maxsize=1)
def _default_dump() -> dict:
    factors = {}
    for f in FACTORS:
        factors[f.key] = {
            "enabled": True, "weight": f.weight,
            "params": {p.key: float(p.default) for p in f.params},
            "bands": {b.name: {"xs": list(b.xs), "ys": list(b.ys)} for b in f.bands},
        }
    return StrategyConfig.model_validate({
        "groupWeights": copy.deepcopy(DEFAULT_GROUP_WEIGHTS),
        "subgroupWeights": dict(DEFAULT_SUBGROUP_WEIGHTS),
        "factors": factors,
    }).dump()


def default_config() -> StrategyConfig:
    return StrategyConfig.model_validate(copy.deepcopy(_default_dump()))


def _merge(base: dict, patch: dict) -> dict:
    """dict 는 재귀 병합, 그 외(리스트 포함)는 통째로 교체"""
    out = dict(base)
    for k, v in patch.items():
        out[k] = _merge(base[k], v) if isinstance(v, dict) and isinstance(base.get(k), dict) else v
    return out


def parse_config(data: dict | None) -> StrategyConfig:
    if not data:
        return default_config()
    if not isinstance(data, dict):
        raise ConfigError([{"path": "", "msg": "설정은 JSON 객체여야 합니다."}])
    try:
        cfg = StrategyConfig.model_validate(_merge(_default_dump(), data))
    except ValidationError as e:
        raise ConfigError([{"path": ".".join(str(p) for p in err["loc"]), "msg": _pydantic_msg(err)}
                           for err in e.errors()]) from None
    errors = validate(cfg)
    if errors:
        raise ConfigError(errors)
    return cfg


def _pydantic_msg(err: dict) -> str:
    t = err.get("type", "")
    if t == "extra_forbidden":
        return "알 수 없는 항목입니다."
    if t.endswith("_parsing") or t.endswith("_type"):
        return "형식이 올바르지 않습니다."
    if t == "missing":
        return "필수 항목입니다."
    return err.get("msg", "잘못된 값")


def validate(cfg: StrategyConfig) -> list[dict]:
    """의미 검증. 반환: [{path, msg}] (빈 리스트면 통과)"""
    errs: list[dict] = []

    def err(path: str, msg: str) -> None:
        errs.append({"path": path, "msg": msg})

    def num_ok(v: float) -> bool:
        return isinstance(v, (int, float)) and math.isfinite(v)

    # 그룹 가중치
    for market in DEFAULT_GROUP_WEIGHTS:
        weights = cfg.group_weights.get(market)
        if weights is None:
            err(f"groupWeights.{market}", "필수 항목입니다.")
            continue
        for g, w in weights.items():
            if g not in GROUP_LABELS:
                err(f"groupWeights.{market}.{g}", "알 수 없는 그룹입니다.")
            elif not num_ok(w) or not 0 <= w <= MAX_WEIGHT:
                err(f"groupWeights.{market}.{g}", f"0 이상 {MAX_WEIGHT:g} 이하여야 합니다.")
        if sum(w for w in weights.values() if num_ok(w)) <= 0:
            err(f"groupWeights.{market}", "적어도 한 그룹의 비중은 0보다 커야 합니다.")
    for market in cfg.group_weights:
        if market not in DEFAULT_GROUP_WEIGHTS:
            err(f"groupWeights.{market}", "알 수 없는 시장입니다.")
    for sub, w in cfg.subgroup_weights.items():
        if sub not in DEFAULT_SUBGROUP_WEIGHTS:
            err(f"subgroupWeights.{sub}", "알 수 없는 하위 그룹입니다.")
        elif not num_ok(w) or not 0 <= w <= MAX_WEIGHT:
            err(f"subgroupWeights.{sub}", f"0 이상 {MAX_WEIGHT:g} 이하여야 합니다.")

    # 팩터
    active = 0
    for key, fc in cfg.factors.items():
        spec = FACTOR_BY_KEY.get(key)
        base = f"factors.{key}"
        if spec is None:
            err(base, "알 수 없는 팩터입니다.")
            continue
        if not num_ok(fc.weight) or not 0 <= fc.weight <= MAX_WEIGHT:
            err(f"{base}.weight", f"0 이상 {MAX_WEIGHT:g} 이하여야 합니다.")
        elif fc.enabled and fc.weight > 0:
            active += 1
        pspecs = {p.key: p for p in spec.params}
        for name, v in fc.params.items():
            p = pspecs.get(name)
            path = f"{base}.params.{name}"
            if p is None:
                err(path, "알 수 없는 파라미터입니다.")
            elif not num_ok(v) or not p.min <= v <= p.max:
                err(path, f"{p.min:g} ~ {p.max:g} 범위여야 합니다.")
            elif p.integer and not float(v).is_integer():
                err(path, "정수여야 합니다.")
        for small, large in spec.ordered:
            if small in fc.params and large in fc.params and not fc.params[small] < fc.params[large]:
                err(f"{base}.params.{large}", f"{pspecs[small].label}보다 커야 합니다.")
        bnames = {b.name for b in spec.bands}
        for name, band in fc.bands.items():
            path = f"{base}.bands.{name}"
            if name not in bnames:
                err(path, "알 수 없는 밴드입니다.")
                continue
            errs.extend(_band_errors(path, band))
    if active == 0:
        err("factors", "사용하는 팩터가 하나 이상 있어야 합니다.")

    # 신호·게이트·리스크
    s = cfg.signal
    if not all(num_ok(v) for v in (s.strong_sell, s.sell, s.buy, s.strong_buy)) or \
            not 0 <= s.strong_sell < s.sell < s.buy < s.strong_buy <= 100:
        err("signal", "0 ≤ 강한 매도 < 매도 < 매수 < 강한 매수 ≤ 100 이어야 합니다.")
    if not num_ok(cfg.gate.threshold) or not -1 <= cfg.gate.threshold <= 1:
        err("gate.threshold", "-1 ~ 1 범위여야 합니다.")
    r = cfg.risk
    for name, v, lo, hi in (("stopAtrStock", r.stop_atr_stock, 0.1, 10), ("stopAtrCrypto", r.stop_atr_crypto, 0.1, 10),
                            ("target1R", r.target1_r, 0.1, 20), ("target2R", r.target2_r, 0.1, 20),
                            ("maxPositionStock", r.max_position_stock, 0.01, 1),
                            ("maxPositionCrypto", r.max_position_crypto, 0.01, 1)):
        if not num_ok(v) or not lo <= v <= hi:
            err(f"risk.{name}", f"{lo:g} ~ {hi:g} 범위여야 합니다.")
    if num_ok(r.target1_r) and num_ok(r.target2_r) and r.target1_r > r.target2_r:
        err("risk.target2R", "1차 목표보다 크거나 같아야 합니다.")
    return errs


def _band_errors(path: str, band: Band) -> list[dict]:
    out = []
    xs, ys = band.xs, band.ys
    if not 2 <= len(xs) <= MAX_BAND_POINTS:
        out.append({"path": f"{path}.xs", "msg": f"점은 2~{MAX_BAND_POINTS}개여야 합니다."})
    if len(xs) != len(ys):
        out.append({"path": f"{path}.ys", "msg": "x 와 점수 개수가 같아야 합니다."})
    if not all(math.isfinite(x) for x in xs) or any(b <= a for a, b in zip(xs, xs[1:])):
        out.append({"path": f"{path}.xs", "msg": "x 값은 유한한 수이고 순서대로 커져야 합니다."})
    if not all(math.isfinite(y) and -1 <= y <= 1 for y in ys):
        out.append({"path": f"{path}.ys", "msg": "점수는 -1 ~ 1 범위여야 합니다."})
    return out


def config_hash(cfg: StrategyConfig) -> str:
    canonical = json.dumps(cfg.dump(), sort_keys=True, separators=(",", ":"), ensure_ascii=False)
    return hashlib.sha1(canonical.encode("utf-8")).hexdigest()[:12]


@lru_cache(maxsize=1)
def default_hash() -> str:
    return config_hash(default_config())


def config_info(cfg: StrategyConfig, name: str | None = None) -> dict:
    h = config_hash(cfg)
    return {"hash": h, "isDefault": h == default_hash(), "name": name}
