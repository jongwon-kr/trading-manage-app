package io.tbill.backendapi.infrastructure.kafka;

import lombok.Getter;

@Getter
public final class KafkaTopics {
    // Python Consumer가 구독 중인 토픽 이름
    public static final String CHART_ANALYSIS_REQUEST_TOPIC = "chart-analysis-request";
    public static final String MARKET_TREND_REQUEST_TOPIC = "market-trend-request";
    public static final String NEWS_ANALYSIS_REQUEST_TOPIC = "news-analysis-request";
    public static final String BACKTEST_REQUEST_TOPIC = "backtest-request";

    // (참고) Python이 Java로 응답을 보낼 경우
    // public static final String ANALYSIS_RESPONSE_TOPIC = "analysis-response";
}