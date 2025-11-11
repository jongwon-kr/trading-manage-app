package io.tbill.backendapi.presentation.analysis.controller;

import io.tbill.backendapi.global.utils.auth.AuthUtils;
import io.tbill.backendapi.infrastructure.kafka.service.KafkaProducerService;
import io.tbill.backendapi.infrastructure.redis.service.AnalysisResultCacheService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

@Slf4j
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/analysis")
public class AnalysisController {

    private final KafkaProducerService kafkaProducerService;
    private final AnalysisResultCacheService analysisResultCacheService;

    /**
     * 차트 기술적 분석 요청
     */
    @PostMapping("/technical")
    public ResponseEntity<Map<String, String>> requestTechnicalAnalysis(
            @RequestParam String symbol,
            @RequestParam(defaultValue = "STOCK") String market,
            @RequestParam(defaultValue = "1d") String timeframe
    ) {
        log.info("기술적 분석 요청: symbol={}, market={}, timeframe={}", symbol, market, timeframe);

        String userEmail = AuthUtils.getCurrentUserEmail();
        String requestId = kafkaProducerService.requestChartAnalysis(
                userEmail, symbol, market, timeframe);

        Map<String, String> response = new HashMap<>();
        response.put("requestId", requestId);
        response.put("message", "분석 요청이 접수되었습니다.");

        return ResponseEntity.accepted().body(response);
    }

    /**
     * 시장 트렌드 분석 요청
     */
    @PostMapping("/market-trend")
    public ResponseEntity<Map<String, String>> requestMarketTrendAnalysis(
            @RequestParam(defaultValue = "STOCK") String market
    ) {
        log.info("시장 트렌드 분석 요청: market={}", market);

        String userEmail = AuthUtils.getCurrentUserEmail();
        String requestId = kafkaProducerService.requestMarketTrendAnalysis(userEmail, market);

        Map<String, String> response = new HashMap<>();
        response.put("requestId", requestId);
        response.put("message", "시장 트렌드 분석 요청이 접수되었습니다.");

        return ResponseEntity.accepted().body(response);
    }

    /**
     * 분석 결과 조회
     */
    @GetMapping("/result/{requestId}")
    public ResponseEntity<Map<String, Object>> getAnalysisResult(@PathVariable String requestId) {
        log.info("분석 결과 조회: requestId={}", requestId);

        if (analysisResultCacheService.existsAnalysisResult(requestId)) {
            Optional<Map> result = analysisResultCacheService.getAnalysisResult(requestId, Map.class);

            if (result.isPresent()) {
                return ResponseEntity.ok((Map<String, Object>) result.get());
            }
        }

        Map<String, Object> response = new HashMap<>();
        response.put("status", "PROCESSING");
        response.put("message", "분석이 진행 중입니다.");

        return ResponseEntity.accepted().body(response);
    }
}
