package io.tbill.backendapi.infrastructure.client.python;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.tbill.backendapi.domain.market.dto.MarketDto;
import io.tbill.backendapi.domain.market.entity.InstrumentMarket;
import io.tbill.backendapi.global.exception.MarketException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.client.ClientHttpResponse;
import org.springframework.stereotype.Component;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestClient;
import org.springframework.web.util.UriBuilder;

import java.io.IOException;
import java.net.URI;
import java.util.List;
import java.util.Optional;
import java.util.function.Function;

/**
 * backend-python 시세 내부 API(/internal/v1) 클라이언트.
 * Python 오류 응답 {code, message} 를 MarketException 으로 변환한다.
 */
@Slf4j
@Component
public class PythonMarketClient {

    private final RestClient restClient;
    private final ObjectMapper objectMapper;

    public PythonMarketClient(RestClient pythonMarketRestClient, ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
        this.restClient = pythonMarketRestClient.mutate()
                .defaultStatusHandler(HttpStatusCode::isError, (request, response) -> {
                    throw toMarketException(response);
                })
                .build();
    }

    public List<MarketDto.SymbolInfo> searchSymbols(String q, InstrumentMarket market, int limit) {
        return get(uri -> uri.path("/internal/v1/symbols/search")
                        .queryParam("q", q)
                        .queryParamIfPresent("market", Optional.ofNullable(market))
                        .queryParam("limit", limit)
                        .build(),
                new ParameterizedTypeReference<>() {});
    }

    public MarketDto.SymbolInfo getSymbol(InstrumentMarket market, String code) {
        return get(uri -> uri.path("/internal/v1/symbols/{market}/{code}").build(market, code),
                new ParameterizedTypeReference<>() {});
    }

    public MarketDto.CandleSeriesInfo getCandles(InstrumentMarket market, String symbol, String interval,
                                                 String from, String to, int limit) {
        return get(uri -> uri.path("/internal/v1/candles")
                        .queryParam("market", market)
                        .queryParam("symbol", symbol)
                        .queryParam("interval", interval)
                        .queryParamIfPresent("from", Optional.ofNullable(from))
                        .queryParamIfPresent("to", Optional.ofNullable(to))
                        .queryParam("limit", limit)
                        .build(),
                new ParameterizedTypeReference<>() {});
    }

    public MarketDto.QuoteInfo getQuote(InstrumentMarket market, String symbol) {
        return get(uri -> uri.path("/internal/v1/quote")
                        .queryParam("market", market)
                        .queryParam("symbol", symbol)
                        .build(),
                new ParameterizedTypeReference<>() {});
    }

    public List<MarketDto.QuoteInfo> getQuotes(List<String> keys) {
        return get(uri -> uri.path("/internal/v1/quotes")
                        .queryParam("keys", String.join(",", keys))
                        .build(),
                new ParameterizedTypeReference<>() {});
    }

    public MarketDto.FundamentalsInfo getFundamentals(InstrumentMarket market, String symbol) {
        return get(uri -> uri.path("/internal/v1/fundamentals")
                        .queryParam("market", market)
                        .queryParam("symbol", symbol)
                        .build(),
                new ParameterizedTypeReference<>() {});
    }

    /** 지수·심리지표 구성이 자주 바뀌므로 JSON 그대로 전달 */
    public JsonNode getOverview() {
        return get(uri -> uri.path("/internal/v1/overview").build(), new ParameterizedTypeReference<>() {});
    }

    public MarketDto.MoversInfo getMovers(InstrumentMarket market, int limit) {
        return get(uri -> uri.path("/internal/v1/movers")
                        .queryParam("market", market)
                        .queryParam("limit", limit)
                        .build(),
                new ParameterizedTypeReference<>() {});
    }

    /** 섹터 로테이션·주도 섹터·업종/테마·코인 카테고리 (구성이 자주 바뀌므로 JSON 그대로) */
    public JsonNode getTrends(InstrumentMarket market) {
        return get(uri -> uri.path("/internal/v1/trends").queryParam("market", market).build(),
                new ParameterizedTypeReference<>() {});
    }

    /** 업종·테마·섹터 구성 종목. kind: industry|theme|sector */
    public JsonNode getTrendGroup(InstrumentMarket market, String kind, String groupId) {
        return get(uri -> uri.path("/internal/v1/trends/groups/{market}/{kind}/{id}").build(market, kind, groupId),
                new ParameterizedTypeReference<>() {});
    }

    /** 규칙 기반 시장 브리핑. date(YYYY-MM-DD) 가 없으면 오늘 */
    public JsonNode getBriefing(InstrumentMarket market, String date) {
        return get(uri -> uri.path("/internal/v1/briefing").queryParam("market", market)
                        .queryParamIfPresent("date", Optional.ofNullable(date)).build(),
                new ParameterizedTypeReference<>() {});
    }

    public JsonNode getBriefingDates(InstrumentMarket market) {
        return get(uri -> uri.path("/internal/v1/briefing/dates").queryParam("market", market).build(),
                new ParameterizedTypeReference<>() {});
    }

    /** 분석 모델 카탈로그(팩터 설명·파라미터·밴드 기본값) + 기본 전략 설정 */
    public JsonNode getAnalysisModel() {
        return get(uri -> uri.path("/internal/v1/analysis/model").build(), new ParameterizedTypeReference<>() {});
    }

    /**
     * 전략 설정(부분 설정 가능)을 기본값과 병합·검증한다. 반환: {config, hash, isDefault}.
     * 검증 실패는 400 MarketException(STRATEGY_CONFIG_INVALID, errors[{path, msg}]).
     */
    public JsonNode validateStrategyConfig(JsonNode config) {
        try {
            return restClient.post().uri("/internal/v1/analysis/config/validate")
                    .body(config).retrieve().body(JsonNode.class);
        } catch (ResourceAccessException e) {
            log.error("Python 분석 API 연결 실패: {}", e.getMessage());
            throw MarketException.unavailable("분석 서비스에 연결할 수 없습니다.");
        }
    }

    private <T> T get(Function<UriBuilder, URI> uri, ParameterizedTypeReference<T> type) {
        try {
            return restClient.get().uri(uri).retrieve().body(type);
        } catch (ResourceAccessException e) {
            log.error("Python 시세 API 연결 실패: {}", e.getMessage());
            throw MarketException.unavailable("시세 서비스에 연결할 수 없습니다.");
        }
    }

    private MarketException toMarketException(ClientHttpResponse response) throws IOException {
        HttpStatusCode status = response.getStatusCode();
        String code = null;
        String message = null;
        JsonNode errors = null;
        try {
            JsonNode body = objectMapper.readTree(response.getBody());
            code = body.path("code").asText(null);
            message = body.path("message").asText(null);
            errors = body.has("errors") ? body.get("errors") : null;
        } catch (Exception ignored) {
            // 본문이 JSON 이 아니면 상태 코드로만 판단
        }

        if (status.value() == 401) {
            // 내부 토큰 불일치는 사용자 요청 문제가 아니라 설정 오류
            log.error("Python 시세 API 내부 토큰 인증 실패 — PYTHON_INTERNAL_TOKEN 설정을 확인하세요.");
            return MarketException.unavailable("시세 서비스 설정 오류입니다.");
        }
        if (status.value() == 404) {
            return new MarketException(code != null ? code : "MARKET_SYMBOL_NOT_FOUND", HttpStatus.NOT_FOUND,
                    message != null ? message : "종목을 찾을 수 없습니다.");
        }
        if (status.is4xxClientError()) {
            return new MarketException(code != null ? code : "MARKET_BAD_REQUEST", HttpStatus.BAD_REQUEST,
                    message != null ? message : "잘못된 시세 요청입니다.", errors);
        }
        return new MarketException(code != null ? code : "MARKET_DATA_UNAVAILABLE", HttpStatus.SERVICE_UNAVAILABLE,
                message != null ? message : "시세 데이터를 가져오지 못했습니다.");
    }
}
