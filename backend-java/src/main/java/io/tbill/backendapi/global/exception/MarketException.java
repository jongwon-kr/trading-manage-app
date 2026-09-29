package io.tbill.backendapi.global.exception;

import com.fasterxml.jackson.databind.JsonNode;
import lombok.Getter;
import org.springframework.http.HttpStatus;

/**
 * 시세/분석 연동 중 발생하는 예외. code 와 HTTP 상태를 함께 담아 GlobalExceptionHandler 가 그대로 응답한다.
 */
@Getter
public class MarketException extends RuntimeException {

    private final String code;
    private final HttpStatus status;
    /** 필드별 오류 목록 [{path, msg}] (전략 설정 검증 실패 시), 없으면 null */
    private final JsonNode errors;

    public MarketException(String code, HttpStatus status, String message) {
        this(code, status, message, null);
    }

    public MarketException(String code, HttpStatus status, String message, JsonNode errors) {
        super(message);
        this.code = code;
        this.status = status;
        this.errors = errors;
    }

    public static MarketException symbolNotFound(String message) {
        return new MarketException("MARKET_SYMBOL_NOT_FOUND", HttpStatus.NOT_FOUND, message);
    }

    public static MarketException badRequest(String message) {
        return new MarketException("MARKET_BAD_REQUEST", HttpStatus.BAD_REQUEST, message);
    }

    public static MarketException unavailable(String message) {
        return new MarketException("MARKET_DATA_UNAVAILABLE", HttpStatus.SERVICE_UNAVAILABLE, message);
    }
}
