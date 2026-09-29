package io.tbill.backendapi.presentation.analysis.controller;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.tbill.backendapi.domain.analysis.AnalysisType;
import io.tbill.backendapi.domain.market.entity.InstrumentMarket;
import io.tbill.backendapi.domain.strategy.dto.StrategyPresetDto;
import io.tbill.backendapi.domain.strategy.service.StrategyPresetService;
import io.tbill.backendapi.infrastructure.client.python.PythonMarketClient;
import io.tbill.backendapi.infrastructure.kafka.KafkaTopics;
import io.tbill.backendapi.infrastructure.kafka.dto.AnalysisRequest;
import io.tbill.backendapi.infrastructure.kafka.service.KafkaProducerService;
import io.tbill.backendapi.infrastructure.redis.service.AnalysisResultCacheService;
import io.tbill.backendapi.presentation.analysis.dto.AnalysisApiDto;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AnalysisControllerTest {

    @Mock
    private KafkaProducerService kafkaProducerService;
    @Mock
    private AnalysisResultCacheService analysisResultCacheService;
    @Mock
    private PythonMarketClient pythonMarketClient;
    @Mock
    private StrategyPresetService strategyPresetService;

    private final ObjectMapper objectMapper = new ObjectMapper();
    private AnalysisController controller;

    @BeforeEach
    void setUp() {
        controller = new AnalysisController(kafkaProducerService, analysisResultCacheService, objectMapper, pythonMarketClient,
                strategyPresetService);
    }

    @Test
    @DisplayName("전략 분석 요청은 STRATEGY 토픽으로 옵션(JSON)과 함께 발행된다")
    void requestStrategy() throws Exception {
        var body = new AnalysisApiDto.StrategyRequest(InstrumentMarket.KR_STOCK, " 005930 ", null, 10_000_000d, 0.02,
                null, null);

        ResponseEntity<AnalysisApiDto.RequestIdResponse> res = controller.requestStrategyAnalysis(body);

        assertThat(res.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        ArgumentCaptor<AnalysisRequest> captor = ArgumentCaptor.forClass(AnalysisRequest.class);
        verify(kafkaProducerService).sendAnalysisRequest(eq(KafkaTopics.STRATEGY_ANALYSIS_REQUEST_TOPIC), captor.capture());
        AnalysisRequest sent = captor.getValue();
        assertThat(sent.getRequestId()).isEqualTo(res.getBody().getRequestId());
        assertThat(sent.getAnalysisType()).isEqualTo(AnalysisType.STRATEGY);
        assertThat(sent.getMarket()).isEqualTo("KR_STOCK");
        assertThat(sent.getSymbol()).isEqualTo("005930");
        assertThat(sent.getUserEmail()).isEqualTo("anonymous"); // 인증 정보 없음
        Map<String, Object> params = objectMapper.readValue(sent.getParameters(), new TypeReference<>() {});
        assertThat(params).containsEntry("interval", "1d").containsEntry("riskPct", 0.02)
                .containsEntry("accountEquity", 1.0E7);
    }

    @Test
    @DisplayName("백테스트 요청은 기간을 LocalDateTime 으로, 지정한 파라미터만 전달한다")
    void requestBacktest() throws Exception {
        var body = new AnalysisApiDto.BacktestRequest(InstrumentMarket.CRYPTO, "KRW-BTC",
                java.time.LocalDate.of(2024, 1, 1), java.time.LocalDate.of(2025, 1, 1),
                65d, null, null, null, null, null, null, null, null, null);

        controller.requestBacktest(body);

        ArgumentCaptor<AnalysisRequest> captor = ArgumentCaptor.forClass(AnalysisRequest.class);
        verify(kafkaProducerService).sendAnalysisRequest(eq(KafkaTopics.BACKTEST_REQUEST_TOPIC), captor.capture());
        AnalysisRequest sent = captor.getValue();
        assertThat(sent.getAnalysisType()).isEqualTo(AnalysisType.BACKTEST);
        assertThat(sent.getStartDate()).isEqualTo(java.time.LocalDateTime.of(2024, 1, 1, 0, 0));
        Map<String, Object> params = objectMapper.readValue(sent.getParameters(), new TypeReference<>() {});
        assertThat(params).containsOnlyKeys("buyThreshold");
    }

    @Test
    @DisplayName("백테스트 시작일이 종료일 이후면 400(IllegalArgumentException)")
    void backtestInvalidRange() {
        var body = new AnalysisApiDto.BacktestRequest(InstrumentMarket.CRYPTO, "KRW-BTC",
                java.time.LocalDate.of(2025, 1, 1), java.time.LocalDate.of(2024, 1, 1),
                null, null, null, null, null, null, null, null, null, null);
        org.assertj.core.api.Assertions.assertThatThrownBy(() -> controller.requestBacktest(body))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    @DisplayName("presetId 로 요청하면 본인 프리셋 설정과 이름을 파라미터에 싣는다")
    void strategyWithPreset() throws Exception {
        var auth = new org.springframework.security.authentication.UsernamePasswordAuthenticationToken(
                "me@example.com", null, java.util.List.of());
        org.springframework.security.core.context.SecurityContextHolder.getContext().setAuthentication(auth);
        try {
            var config = objectMapper.readTree("{\"factors\":{\"rsi\":{\"weight\":0.5}}}");
            when(strategyPresetService.resolveConfig(7L, "me@example.com"))
                    .thenReturn(new StrategyPresetDto.ResolvedConfig("RSI 강화", "abc", config));
            var body = new AnalysisApiDto.StrategyRequest(InstrumentMarket.KR_STOCK, "005930", null, null, null, 7L, null);

            controller.requestStrategyAnalysis(body);

            ArgumentCaptor<AnalysisRequest> captor = ArgumentCaptor.forClass(AnalysisRequest.class);
            verify(kafkaProducerService).sendAnalysisRequest(eq(KafkaTopics.STRATEGY_ANALYSIS_REQUEST_TOPIC), captor.capture());
            var params = objectMapper.readTree(captor.getValue().getParameters());
            assertThat(params.get("presetName").asText()).isEqualTo("RSI 강화");
            assertThat(params.at("/config/factors/rsi/weight").asDouble()).isEqualTo(0.5);
        } finally {
            org.springframework.security.core.context.SecurityContextHolder.clearContext();
        }
    }

    @Test
    @DisplayName("로그인 없이 presetId 를 보내면 인증 예외(401), presetId 와 config 를 함께 보내면 400")
    void presetRequiresAuthAndIsExclusive() throws Exception {
        var anonymous = new AnalysisApiDto.StrategyRequest(InstrumentMarket.KR_STOCK, "005930", null, null, null, 7L, null);
        org.assertj.core.api.Assertions.assertThatThrownBy(() -> controller.requestStrategyAnalysis(anonymous))
                .isInstanceOf(org.springframework.security.core.AuthenticationException.class);

        var both = new AnalysisApiDto.StrategyRequest(InstrumentMarket.KR_STOCK, "005930", null, null, null, 7L,
                objectMapper.readTree("{}"));
        org.assertj.core.api.Assertions.assertThatThrownBy(() -> controller.requestStrategyAnalysis(both))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    @DisplayName("저장 전 config 는 동기 검증해 정규화된 설정을 싣는다")
    void backtestWithInlineConfig() throws Exception {
        var inline = objectMapper.readTree("{\"gate\":{\"enabled\":false}}");
        when(pythonMarketClient.validateStrategyConfig(inline)).thenReturn(objectMapper.readTree(
                "{\"config\":{\"gate\":{\"enabled\":false,\"threshold\":-0.5}},\"hash\":\"h\",\"isDefault\":false}"));
        var body = new AnalysisApiDto.BacktestRequest(InstrumentMarket.US_STOCK, "AAPL", null, null,
                null, null, null, null, null, null, null, null, null, inline);

        controller.requestBacktest(body);

        ArgumentCaptor<AnalysisRequest> captor = ArgumentCaptor.forClass(AnalysisRequest.class);
        verify(kafkaProducerService).sendAnalysisRequest(eq(KafkaTopics.BACKTEST_REQUEST_TOPIC), captor.capture());
        var params = objectMapper.readTree(captor.getValue().getParameters());
        assertThat(params.at("/config/gate/threshold").asDouble()).isEqualTo(-0.5);
    }

    @Test
    @DisplayName("결과가 없으면 PROCESSING, 있으면 Python JSON 그대로 반환")
    void getResult() throws Exception {
        when(analysisResultCacheService.getAnalysisResult("a")).thenReturn(Optional.empty());
        when(analysisResultCacheService.getAnalysisResult("b"))
                .thenReturn(Optional.of("{\"status\":\"SUCCESS\",\"score\":63.4}"));

        assertThat(controller.getAnalysisResult("a").getBody())
                .isInstanceOf(AnalysisApiDto.ProcessingResponse.class);
        @SuppressWarnings("unchecked")
        Map<String, Object> result = (Map<String, Object>) controller.getAnalysisResult("b").getBody();
        assertThat(result).containsEntry("score", 63.4);
    }
}
