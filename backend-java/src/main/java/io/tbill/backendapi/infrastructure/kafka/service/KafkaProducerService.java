package io.tbill.backendapi.infrastructure.kafka.service;

import io.tbill.backendapi.infrastructure.kafka.KafkaTopics;
import io.tbill.backendapi.infrastructure.kafka.dto.AnalysisRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.kafka.support.SendResult;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;

@Slf4j
@Service
@RequiredArgsConstructor
public class KafkaProducerService {

    private final KafkaTemplate<String, Object> kafkaTemplate;

    /**
     * 차트 기술적 분석 요청
     */
    public String requestChartAnalysis(String userEmail, String symbol, String market, String timeframe) {
        String requestId = UUID.randomUUID().toString();

        AnalysisRequest request = AnalysisRequest.builder()
                .requestId(requestId)
                .userEmail(userEmail)
                .analysisType("TECHNICAL")
                .symbol(symbol)
                .market(market)
                .timeframe(timeframe)
                .requestedAt(LocalDateTime.now())
                .build();

        sendMessage(KafkaTopics.CHART_ANALYSIS_REQUEST, requestId, request);
        return requestId;
    }

    /**
     * 시장 트렌드 분석 요청
     */
    public String requestMarketTrendAnalysis(String userEmail, String market) {
        String requestId = UUID.randomUUID().toString();

        AnalysisRequest request = AnalysisRequest.builder()
                .requestId(requestId)
                .userEmail(userEmail)
                .analysisType("MARKET_TREND")
                .market(market)
                .requestedAt(LocalDateTime.now())
                .build();

        sendMessage(KafkaTopics.MARKET_TREND_REQUEST, requestId, request);
        return requestId;
    }

    /**
     * 뉴스/거시경제 분석 요청
     */
    public String requestNewsAnalysis(String userEmail, String keyword) {
        String requestId = UUID.randomUUID().toString();

        AnalysisRequest request = AnalysisRequest.builder()
                .requestId(requestId)
                .userEmail(userEmail)
                .analysisType("NEWS")
                .parameters(keyword)
                .requestedAt(LocalDateTime.now())
                .build();

        sendMessage(KafkaTopics.NEWS_ANALYSIS_REQUEST, requestId, request);
        return requestId;
    }

    /**
     * 백테스팅 요청
     */
    public String requestBacktest(String userEmail, String symbol, String strategy,
                                  LocalDateTime startDate, LocalDateTime endDate) {
        String requestId = UUID.randomUUID().toString();

        AnalysisRequest request = AnalysisRequest.builder()
                .requestId(requestId)
                .userEmail(userEmail)
                .analysisType("BACKTEST")
                .symbol(symbol)
                .parameters(strategy)
                .startDate(startDate)
                .endDate(endDate)
                .requestedAt(LocalDateTime.now())
                .build();

        sendMessage(KafkaTopics.BACKTEST_REQUEST, requestId, request);
        return requestId;
    }

    /**
     * Kafka 메시지 전송
     */
    private void sendMessage(String topic, String key, Object message) {
        try {
            CompletableFuture<SendResult<String, Object>> future =
                    kafkaTemplate.send(topic, key, message);

            future.whenComplete((result, ex) -> {
                if (ex == null) {
                    log.info("Kafka 메시지 전송 성공: topic={}, key={}, offset={}",
                            topic, key, result.getRecordMetadata().offset());
                } else {
                    log.error("Kafka 메시지 전송 실패: topic={}, key={}", topic, key, ex);
                }
            });
        } catch (Exception e) {
            log.error("Kafka 메시지 전송 중 예외 발생: topic={}, key={}", topic, key, e);
        }
    }
}
