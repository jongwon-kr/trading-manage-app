package io.tbill.backendapi.infrastructure.kafka.dto;

import io.tbill.backendapi.domain.analysis.AnalysisType;
import lombok.Builder; // <--- @Builder 임포트
import lombok.Getter;

import java.time.LocalDateTime;

/**
 * Kafka 메시지 전송용 DTO
 * (Python의 AnalysisRequest 모델과 필드명/타입 일치)
 */
@Getter
@Builder
public class AnalysisRequest {
    private String requestId;
    private String userEmail;
    private AnalysisType analysisType;
    private String symbol;
    private String market;
    private String timeframe;
    private LocalDateTime startDate;
    private LocalDateTime endDate;
    private String parameters;
    private LocalDateTime requestedAt;
}