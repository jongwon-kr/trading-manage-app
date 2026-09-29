"""Kafka 분석 요청 스키마 (backend-java infrastructure/kafka/dto/AnalysisRequest.java 와 필드명 일치 필수).

결과(Redis analysis:{requestId})는 app.analysis.jobs 가 camelCase dict(schemaVersion 3)로 만든다.
"""
import json
from datetime import datetime
from enum import Enum
from typing import Any, Optional

from pydantic import BaseModel, ConfigDict, Field, field_validator

SCHEMA_VERSION = 3  # 3: 팩터 explain, config 정보 추가


class AnalysisType(str, Enum):
    TECHNICAL = "TECHNICAL"
    MARKET_TREND = "MARKET_TREND"
    STRATEGY = "STRATEGY"
    BACKTEST = "BACKTEST"
    NEWS = "NEWS"


class AnalysisRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    request_id: str = Field(..., alias='requestId')
    user_email: str = Field(..., alias='userEmail')
    analysis_type: AnalysisType = Field(..., alias='analysisType')
    symbol: Optional[str] = None
    market: Optional[str] = None
    timeframe: Optional[str] = None
    start_date: Optional[datetime] = Field(None, alias='startDate')
    end_date: Optional[datetime] = Field(None, alias='endDate')
    parameters: Optional[str] = None  # JSON 문자열 (요청별 옵션)
    requested_at: datetime = Field(..., alias='requestedAt')

    @field_validator('requested_at', 'start_date', 'end_date', mode='before')
    @classmethod
    def parse_datetime(cls, v):
        """Java LocalDateTime 배열을 Python datetime으로 변환"""
        if v is None:
            return None
        if isinstance(v, datetime):
            return v
        if isinstance(v, str):
            return datetime.fromisoformat(v.replace('Z', '+00:00'))
        if isinstance(v, list) and len(v) >= 3:
            # [year, month, day, hour, minute, second, nanosecond]
            parts = list(v) + [0] * (7 - len(v))
            return datetime(year=parts[0], month=parts[1], day=parts[2], hour=parts[3], minute=parts[4],
                            second=parts[5], microsecond=parts[6] // 1000)
        return v

    def params(self) -> dict[str, Any]:
        if not self.parameters:
            return {}
        try:
            value = json.loads(self.parameters)
            return value if isinstance(value, dict) else {}
        except json.JSONDecodeError:
            return {}
