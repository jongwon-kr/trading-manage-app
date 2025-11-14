package io.tbill.backendapi.presentation.analysis.controller;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import io.tbill.backendapi.domain.analysis.AnalysisType;
import io.tbill.backendapi.global.utils.auth.AuthUtils;
import io.tbill.backendapi.infrastructure.kafka.KafkaTopics;
import io.tbill.backendapi.infrastructure.kafka.dto.AnalysisRequest;
import io.tbill.backendapi.infrastructure.kafka.service.KafkaProducerService;
import io.tbill.backendapi.infrastructure.redis.service.AnalysisResultCacheService;
import io.tbill.backendapi.presentation.analysis.dto.AnalysisApiDto; // 1번 DTO 임포트
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.Optional;
import java.util.UUID;

@Slf4j
@Tag(name = "Analysis", description = "AI 분석 API")
@RestController
@RequestMapping("/api/v1/analysis")
@RequiredArgsConstructor
public class AnalysisController {

    private final KafkaProducerService kafkaProducerService;
    private final AnalysisResultCacheService analysisResultCacheService;
    private final ObjectMapper objectMapper;

    /**
     * [수정] 500 오류 해결:
     * SecurityConfig에서 permitAll이므로, 인증되지 않은 사용자를 고려하여
     * AuthUtils 호출을 try-catch로 감쌉니다.
     */
    private String getSafeUserEmail() {
        try {
            return AuthUtils.getCurrentUserEmail();
        } catch (Exception e) {
            log.warn("인증되지 않은 사용자의 분석 요청");
            return "anonymous";
        }
    }

    @Operation(summary = "AI 기술적 분석 요청", description = "TECHNICAL 분석을 요청합니다.")
    @PostMapping("/technical") // [수정] /technical 경로 매핑
    public ResponseEntity<AnalysisApiDto.RequestIdResponse> requestTechnicalAnalysis(
            // [수정] @RequestBody -> @RequestParam
            @RequestParam String symbol,
            @RequestParam(required = false) String timeframe,
            @RequestParam(required = false) String market
    ) {
        String requestId = UUID.randomUUID().toString();
        String userEmail = getSafeUserEmail();

        AnalysisRequest kafkaRequest = AnalysisRequest.builder()
                .requestId(requestId)
                .userEmail(userEmail)
                .analysisType(AnalysisType.TECHNICAL)
                .symbol(symbol)
                .timeframe(timeframe)
                .market(market)
                .requestedAt(LocalDateTime.now())
                .build();

        kafkaProducerService.sendAnalysisRequest(KafkaTopics.CHART_ANALYSIS_REQUEST_TOPIC, kafkaRequest);

        return ResponseEntity.status(HttpStatus.CREATED)
                .body(new AnalysisApiDto.RequestIdResponse(requestId, "기술적 분석 요청이 접수되었습니다."));
    }

    @Operation(summary = "AI 시장 트렌드 분석 요청", description = "MARKET_TREND 분석을 요청합니다.")
    @PostMapping("/market-trend") // [수정] /market-trend 경로 매핑
    public ResponseEntity<AnalysisApiDto.RequestIdResponse> requestMarketTrendAnalysis(
            // [수정] @RequestBody -> @RequestParam
            @RequestParam String market
    ) {
        String requestId = UUID.randomUUID().toString();
        String userEmail = getSafeUserEmail();

        AnalysisRequest kafkaRequest = AnalysisRequest.builder()
                .requestId(requestId)
                .userEmail(userEmail)
                .analysisType(AnalysisType.MARKET_TREND)
                .market(market)
                .requestedAt(LocalDateTime.now())
                .build();

        kafkaProducerService.sendAnalysisRequest(KafkaTopics.MARKET_TREND_REQUEST_TOPIC, kafkaRequest);

        return ResponseEntity.status(HttpStatus.CREATED)
                .body(new AnalysisApiDto.RequestIdResponse(requestId, "시장 트렌드 분석 요청이 접수되었습니다."));
    }


    @Operation(summary = "AI 분석 결과 조회", description = "발급받은 requestId로 분석 결과를 폴링(Polling)합니다.")
    @GetMapping("/result/{id}") // [수정] /result/{id} 경로 매핑
    public ResponseEntity<Object> getAnalysisResult( // [수정] 반환 타입을 Object로 변경 (Processing DTO 또는 Python JSON)
                                                     @PathVariable("id") String requestId) throws JsonProcessingException {

        Optional<String> resultJsonOpt = analysisResultCacheService.getAnalysisResult(requestId);

        if (resultJsonOpt.isEmpty()) {
            // 결과가 없으면 "PROCESSING" DTO 반환
            return ResponseEntity.ok(new AnalysisApiDto.ProcessingResponse("분석이 진행 중입니다."));
        }

        // 결과가 있으면 Python이 저장한 원본 JSON(Object)을 그대로 반환
        String resultJson = resultJsonOpt.get();
        Object resultData = objectMapper.readValue(resultJson, Object.class);

        return ResponseEntity.ok(resultData);
    }
}