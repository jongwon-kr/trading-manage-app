package io.tbill.backendapi.global.exception;

import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.AuthenticationException;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.util.HashMap;
import java.util.Map;

@Slf4j
@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<ErrorResponse> handleIllegalArgumentException(IllegalArgumentException e) {
        log.error("IllegalArgumentException: ", e);
        ErrorResponse errorResponse = new ErrorResponse("BAD_REQUEST", e.getMessage());
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(errorResponse);
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<Map<String, String>> handleValidationExceptions(
            MethodArgumentNotValidException ex) {
        Map<String, String> errors = new HashMap<>();
        ex.getBindingResult().getAllErrors().forEach((error) -> {
            String fieldName = ((FieldError) error).getField();
            String errorMessage = error.getDefaultMessage();
            errors.put(fieldName, errorMessage);
        });
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(errors);
    }

    /**
     * 인증 정보 없이 인증이 필요한 작업에 도달한 경우.
     * <p>
     * @RestControllerAdvice 가 ExceptionTranslationFilter 보다 먼저 예외를 잡으므로,
     * 이 핸들러가 없으면 아래 handleException 이 500 으로 삼켜버린다.
     */
    @ExceptionHandler(AuthenticationException.class)
    public ResponseEntity<ErrorResponse> handleAuthenticationException(AuthenticationException e) {
        log.warn("인증 실패: {}", e.getMessage());
        ErrorResponse errorResponse = new ErrorResponse("UNAUTHORIZED", e.getMessage());
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(errorResponse);
    }

    @ExceptionHandler(MarketException.class)
    public ResponseEntity<ErrorResponse> handleMarketException(MarketException e) {
        log.warn("MarketException [{}]: {}", e.getCode(), e.getMessage());
        return ResponseEntity.status(e.getStatus()).body(new ErrorResponse(e.getCode(), e.getMessage()));
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ErrorResponse> handleException(Exception e) {
        log.error("Unexpected exception: ", e);
        ErrorResponse errorResponse = new ErrorResponse("INTERNAL_SERVER_ERROR", "서버 오류가 발생했습니다.");
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(errorResponse);
    }

    public record ErrorResponse(String code, String message) {}
}
