package io.tbill.backendapi.global.exception;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.databind.JsonNode;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.AuthenticationException;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.context.request.async.AsyncRequestNotUsableException;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;

import java.io.IOException;
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

    /** @PreAuthorize(hasRole('ADMIN')) 등 권한 부족. 없으면 아래 handleException 이 500 으로 응답한다. */
    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<ErrorResponse> handleAccessDenied(AccessDeniedException e) {
        log.warn("권한 없음: {}", e.getMessage());
        return ResponseEntity.status(HttpStatus.FORBIDDEN).body(new ErrorResponse("FORBIDDEN", "권한이 없습니다."));
    }

    /**
     * 잘못된 쿼리 파라미터(enum 값 오류 등)·필수 파라미터 누락은 400.
     * 없으면 아래 handleException 이 500 으로 응답한다.
     */
    @ExceptionHandler({MethodArgumentTypeMismatchException.class, MissingServletRequestParameterException.class})
    public ResponseEntity<ErrorResponse> handleBadRequestParameter(Exception e) {
        log.warn("잘못된 요청 파라미터: {}", e.getMessage());
        String message = e instanceof MethodArgumentTypeMismatchException mismatch
                ? "파라미터 '" + mismatch.getName() + "' 값이 올바르지 않습니다: " + mismatch.getValue()
                : "필수 파라미터가 없습니다: " + ((MissingServletRequestParameterException) e).getParameterName();
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(new ErrorResponse("BAD_REQUEST", message));
    }

    @ExceptionHandler(MarketException.class)
    public ResponseEntity<ErrorResponse> handleMarketException(MarketException e) {
        log.warn("MarketException [{}]: {}", e.getCode(), e.getMessage());
        // Content-Type 을 명시해 SSE 요청(Accept: text/event-stream)에서도 JSON 오류 본문을 쓸 수 있게 한다
        return ResponseEntity.status(e.getStatus())
                .contentType(MediaType.APPLICATION_JSON)
                .body(new ErrorResponse(e.getCode(), e.getMessage(), e.getErrors()));
    }

    /** 요청 본문 JSON 이 깨졌거나 타입이 맞지 않는 경우 (없으면 500) */
    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<ErrorResponse> handleNotReadable(HttpMessageNotReadableException e) {
        log.warn("읽을 수 없는 요청 본문: {}", e.getMostSpecificCause().getMessage());
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(new ErrorResponse("BAD_REQUEST", "요청 본문 형식이 올바르지 않습니다."));
    }

    /**
     * SSE 클라이언트가 연결을 끊은 뒤 쓰기를 시도한 경우. 응답을 쓸 수 없으므로 아무것도 반환하지 않는다.
     * (없으면 아래 handleException 이 text/event-stream 응답에 JSON 을 쓰려다 추가 오류를 낸다)
     */
    @ExceptionHandler(AsyncRequestNotUsableException.class)
    public void handleAsyncRequestNotUsable(AsyncRequestNotUsableException e) {
        log.debug("비동기 응답 연결 종료: {}", e.getMessage());
    }

    /**
     * SSE 전송 중 클라이언트 연결이 끊기면 비동기 디스패치로 IOException 이 올라온다 (Connection reset / Broken pipe).
     * 끊긴 연결에는 응답을 쓸 수 없으므로 null 을 반환하고, 그 밖의 IO 오류만 500 으로 처리한다.
     */
    @ExceptionHandler(IOException.class)
    public ResponseEntity<ErrorResponse> handleIOException(IOException e) {
        String message = String.valueOf(e.getMessage());
        if (message.contains("Connection reset") || message.contains("Broken pipe")
                || e.getClass().getSimpleName().equals("ClientAbortException")) {
            log.debug("클라이언트 연결 종료: {}", message);
            return null;
        }
        return handleException(e);
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ErrorResponse> handleException(Exception e) {
        log.error("Unexpected exception: ", e);
        ErrorResponse errorResponse = new ErrorResponse("INTERNAL_SERVER_ERROR", "서버 오류가 발생했습니다.");
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(errorResponse);
    }

    @JsonInclude(JsonInclude.Include.NON_NULL)
    public record ErrorResponse(String code, String message, JsonNode errors) {
        public ErrorResponse(String code, String message) {
            this(code, message, null);
        }
    }
}
