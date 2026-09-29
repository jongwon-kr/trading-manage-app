"""분석 모델 내부 API (/internal/v1/analysis). Java 가 방법론 페이지·전략 편집기·프리셋 저장 검증에 쓴다."""
from fastapi import APIRouter, Body, Depends

from app.analysis.model.catalog import DEFAULT_GROUP_WEIGHTS, catalog_dict
from app.analysis.model.config import config_hash, default_config, default_hash, parse_config
from app.analysis.scoring.weights import MIN_BARS, MODEL_VERSION
from app.api.deps import verify_internal_token

router = APIRouter(prefix="/internal/v1/analysis", dependencies=[Depends(verify_internal_token)])


@router.get("/model")
def get_model():
    """카탈로그(팩터 설명·파라미터·밴드 기본값) + 기본 설정"""
    return {"modelVersion": MODEL_VERSION, "minBars": MIN_BARS, "markets": list(DEFAULT_GROUP_WEIGHTS),
            **catalog_dict(), "defaultConfig": default_config().dump(), "defaultHash": default_hash()}


@router.post("/config/validate")
def validate_config(config: dict = Body(...)):
    """부분 설정을 기본값과 병합·검증한다. 실패 시 422 {code, message, errors[{path, msg}]}"""
    cfg = parse_config(config)
    return {"config": cfg.dump(), "hash": config_hash(cfg), "isDefault": config_hash(cfg) == default_hash()}
