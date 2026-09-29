"""카탈로그 + 설정(config) → Factor 생성 도우미. 화면 설명(explain)도 여기서 만든다."""
from app.analysis.model.catalog import FACTOR_BY_KEY, fill
from app.analysis.model.config import StrategyConfig
from app.analysis.scoring.primitives import Factor, Score, interp


def band_score(cfg: StrategyConfig, key: str, name: str, x):
    xs, ys = cfg.band(key, name)
    return interp(x, xs, ys)


def is_active(cfg: StrategyConfig, key: str) -> bool:
    spec = FACTOR_BY_KEY[key]
    fc = cfg.factor(key)
    sub_w = cfg.subgroup_weights.get(spec.sub_group, 1.0) if spec.sub_group else 1.0
    return fc.enabled and fc.weight * sub_w > 0


def make_factor(cfg: StrategyConfig, key: str, score: Score, raw: dict, band_x: dict[str, float | None],
                note: str = "") -> Factor:
    """band_x: 이번 계산에 쓰인 밴드별 입력값(마지막 시점). 설명 패널에서 곡선 위 현재 위치로 표시한다."""
    spec = FACTOR_BY_KEY[key]
    fc = cfg.factor(key)
    params = fc.params
    sub_w = cfg.subgroup_weights.get(spec.sub_group) if spec.sub_group else None
    bands = []
    for b in spec.bands:
        if b.name not in band_x:
            continue
        xs, ys = cfg.band(key, b.name)
        x = band_x[b.name]
        bands.append({"name": b.name, "label": fill(b.label, params), "unit": b.unit, "xs": xs, "ys": ys,
                      "x": x, "y": None if x is None else round(interp(x, xs, ys), 6)})
    explain = {
        "description": fill(spec.description, params),
        "formula": fill(spec.formula, params),
        "rules": [fill(r, params) for r in spec.rules],
        "params": [{"key": p.key, "label": p.label, "value": params[p.key]} for p in spec.params],
        "inputs": [{"key": i.key, "label": fill(i.label, params), "unit": i.unit, "value": raw.get(i.key)}
                   for i in spec.inputs if i.key in raw],
        "bands": bands,
        "weightPath": {"subGroup": spec.sub_group, "subgroupWeight": sub_w, "factorWeight": fc.weight},
    }
    weight = fc.weight * (sub_w if sub_w is not None else 1.0)
    return Factor(key=key, label=fill(spec.label, params), weight=weight, score=score, raw=raw,
                  sub_group=spec.sub_group, note=note, explain=explain)
