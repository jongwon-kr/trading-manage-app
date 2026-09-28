from pydantic import BaseModel, Field, field_validator
from typing import Optional, Dict, Any, Union
from datetime import datetime
from enum import Enum

class AnalysisType(str, Enum):
    TECHNICAL = "TECHNICAL"
    MARKET_TREND = "MARKET_TREND"
    NEWS = "NEWS"
    BACKTEST = "BACKTEST"

class AnalysisRequest(BaseModel):
    request_id: str = Field(..., alias='requestId')
    user_email: str = Field(..., alias='userEmail')
    analysis_type: AnalysisType = Field(..., alias='analysisType')
    symbol: Optional[str] = None
    market: Optional[str] = None
    timeframe: Optional[str] = None
    start_date: Optional[datetime] = Field(None, alias='startDate')
    end_date: Optional[datetime] = Field(None, alias='endDate')
    parameters: Optional[str] = None
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
        if isinstance(v, list) and len(v) >= 6:
            # [year, month, day, hour, minute, second, nanosecond]
            return datetime(
                year=v[0],
                month=v[1],
                day=v[2],
                hour=v[3],
                minute=v[4],
                second=v[5],
                microsecond=v[6] // 1000 if len(v) > 6 else 0
            )
        return v
    
    class Config:
        populate_by_name = True
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }

class TechnicalIndicators(BaseModel):
    rsi: Optional[float] = None
    macd: Optional[Dict[str, float]] = None
    moving_averages: Optional[Dict[str, float]] = Field(None, alias='movingAverages')
    bollinger_bands: Optional[Dict[str, float]] = Field(None, alias='bollingerBands')
    volume_analysis: Optional[Dict[str, Any]] = Field(None, alias='volumeAnalysis')
    
    class Config:
        populate_by_name = True

class AnalysisResult(BaseModel):
    request_id: str = Field(..., alias='requestId')
    analysis_type: AnalysisType = Field(..., alias='analysisType')
    symbol: Optional[str] = None
    status: str
    indicators: Optional[TechnicalIndicators] = None
    summary: str
    recommendation: str
    confidence: float
    analyzed_at: datetime = Field(..., alias='analyzedAt')
    error_message: Optional[str] = Field(None, alias='errorMessage')
    
    class Config:
        populate_by_name = True
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }
