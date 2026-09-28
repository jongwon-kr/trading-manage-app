package io.tbill.backendapi.domain.analysis;

/**
 * 분석 서비스 타입
 */
public enum AnalysisType {
    TECHNICAL,
    MARKET_TREND,
    STRATEGY,      // 기본적·기술적·시장국면 종합 정량 전략
    NEWS,
    BACKTEST
}