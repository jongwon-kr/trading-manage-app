"""정량 전략 점수 모델 v1 — 모든 가중치·임계값은 여기서만 바꾼다."""

MODEL_VERSION = "v1"

# 시장별 그룹 가중치 (코인은 재무 데이터가 없어 기본적 분석 0)
GROUP_WEIGHTS = {
    "KR_STOCK": {"technical": 0.50, "fundamental": 0.25, "regime": 0.25},
    "US_STOCK": {"technical": 0.50, "fundamental": 0.25, "regime": 0.25},
    "CRYPTO": {"technical": 0.65, "fundamental": 0.0, "regime": 0.35},
}

GROUP_LABELS = {"technical": "기술적 분석", "fundamental": "기본적 분석", "regime": "시장 국면"}

# 기술적 분석: 하위 그룹 가중치 × 하위 그룹 내 팩터 가중치
TECHNICAL_SUBGROUPS = {"trend": 0.40, "momentum": 0.30, "volatility": 0.15, "volume": 0.15}
TECHNICAL_FACTORS = {
    "ma_alignment": ("trend", 0.35, "이동평균 배열"),
    "ma20_slope": ("trend", 0.20, "20일선 기울기"),
    "adx_direction": ("trend", 0.25, "ADX 추세 강도"),
    "relative_strength": ("trend", 0.20, "벤치마크 대비 상대강도(60일)"),
    "rsi": ("momentum", 0.35, "RSI(14)"),
    "macd_hist": ("momentum", 0.35, "MACD 히스토그램"),
    "roc20": ("momentum", 0.30, "20일 변화율(변동성 정규화)"),
    "bb_pctb": ("volatility", 0.50, "볼린저 %B"),
    "atr_regime": ("volatility", 0.50, "변동성(ATR) 수준"),
    "obv_flow": ("volume", 0.50, "OBV 자금 흐름"),
    "volume_surge": ("volume", 0.50, "거래량 급증×방향"),
}

FUNDAMENTAL_FACTORS = {
    "valuation": (0.30, "밸류에이션(PER·PBR)"),
    "profitability": (0.25, "수익성(ROE·영업이익률)"),
    "growth": (0.25, "성장성(EPS·매출)"),
    "health": (0.10, "재무건전성(부채비율)"),
    "dividend": (0.10, "배당"),
}

REGIME_FACTORS = {
    "index_trend": (0.50, "지수 추세"),
    "volatility_regime": (0.30, "변동성 국면"),
    "breadth_sentiment": (0.20, "시장 폭·심리"),
}

# 신호 구간 (0~100 점수)
STRONG_BUY = 75
BUY = 60
SELL = 40
STRONG_SELL = 25

# 게이트: 시장 국면 점수(-1~1)가 이보다 낮으면 매수 신호를 보류(HOLD)
REGIME_RISK_OFF = -0.5
MIN_BARS = 60

# 리스크 플랜
STOP_ATR_MULT = {"KR_STOCK": 2.0, "US_STOCK": 2.0, "CRYPTO": 2.5}
MAX_POSITION = {"KR_STOCK": 0.25, "US_STOCK": 0.25, "CRYPTO": 0.10}
DEFAULT_RISK_PCT = 0.01
