"""정량 전략 점수 모델 v1 — 모델 버전과 설정으로 바꿀 수 없는 상수."""

MODEL_VERSION = "v1"

# 그룹·팩터 가중치, 밴드, 지표 기간, 신호 임계값, 게이트, 리스크 배수의 기본값은
# app/analysis/model/catalog.py · config.py 로 옮겼다 (사용자 전략 설정으로 바꿀 수 있음).

MIN_BARS = 60

# 리스크 플랜 (요청별 riskPct 가 없을 때)
DEFAULT_RISK_PCT = 0.01
