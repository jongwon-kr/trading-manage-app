package io.tbill.backendapi.infrastructure.kafka.dto;

import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

import java.time.LocalDateTime;

@Getter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AnalysisRequest {

    private String requestId;      // 요청 고유 ID
    private String userEmail;      // 요청 사용자
    private String analysisType;   // TECHNICAL, MARKET_TREND, NEWS, BACKTEST
    private String symbol;         // 종목 심볼
    private String market;         // 시장 타입
    private String timeframe;      // 차트 타임프레임 (1m, 5m, 1h, 1d 등)
    private LocalDateTime startDate;
    private LocalDateTime endDate;
    private String parameters;     // JSON 형태의 추가 파라미터
    private LocalDateTime requestedAt;
}
