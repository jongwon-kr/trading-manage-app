package io.tbill.backendapi.global.exception;

import lombok.Getter;
import org.springframework.http.HttpStatus;

/**
 * 시세/분석 연동 중 발생하는 예외. code 와 HTTP 상태를 함께 담아 GlobalExceptionHandler 가 그대로 응답한다.
 */
@Getter
public class MarketException extends RuntimeException {

    private final String code;
    private final HttpStatus status;

    public MarketException(String code, HttpStatus status, String message) {
        super(message);
        this.code = code;
        this.status = status;
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
