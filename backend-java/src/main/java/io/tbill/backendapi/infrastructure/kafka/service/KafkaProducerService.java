package io.tbill.backendapi.infrastructure.kafka.service;

import io.tbill.backendapi.infrastructure.kafka.dto.AnalysisRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.kafka.support.SendResult;
import org.springframework.stereotype.Service;

import java.util.concurrent.CompletableFuture;

@Slf4j
@Service
@RequiredArgsConstructor
public class KafkaProducerService {

    // KafkaProducerConfig에 의해 String, JSON(AnalysisRequest) Serializer로 자동 구성됨
    private final KafkaTemplate<String, AnalysisRequest> kafkaTemplate;

    /**
     * 분석 요청 메시지를 Kafka 토픽으로 전송
     *
     * @param topic   전송할 토픽 (KafkaTopics 클래스 상수 사용)
     * @param request 전송할 메시지 (AnalysisRequest DTO)
     */
    public void sendAnalysisRequest(String topic, AnalysisRequest request) {
        // requestId를 Kafka 메시지 Key로 사용하여 동일한 ID의 메시지가 동일 파티션으로 가도록 보장
        String key = request.getRequestId();

        CompletableFuture<SendResult<String, AnalysisRequest>> future =
                kafkaTemplate.send(topic, key, request);

        // 비동기 전송 결과 로깅
        future.whenComplete((result, ex) -> {
            if (ex != null) {
                log.error("Kafka 메시지 전송 실패: topic={}, key={}, error={}",
                        topic, key, ex.getMessage());
            } else {
                log.info("Kafka 메시지 전송 성공: topic={}, key={}, offset={}",
                        topic, key, result.getRecordMetadata().offset());
            }
        });
    }
}