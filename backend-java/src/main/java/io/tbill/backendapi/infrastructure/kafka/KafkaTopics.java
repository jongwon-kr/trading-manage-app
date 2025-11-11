package io.tbill.backendapi.infrastructure.kafka;

public class KafkaTopics {

    // 분석 요청 Topics
    public static final String CHART_ANALYSIS_REQUEST = "chart-analysis-request";
    public static final String MARKET_TREND_REQUEST = "market-trend-request";
    public static final String NEWS_ANALYSIS_REQUEST = "news-analysis-request";
    public static final String BACKTEST_REQUEST = "backtest-request";

    // 분석 응답 Topic
    public static final String ANALYSIS_RESPONSE = "analysis-response";

    private KafkaTopics() {
        throw new IllegalStateException("Constants class");
    }
}
