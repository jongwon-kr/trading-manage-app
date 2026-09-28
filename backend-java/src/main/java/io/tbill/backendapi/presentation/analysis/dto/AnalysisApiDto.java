package io.tbill.backendapi.presentation.analysis.dto;

import io.tbill.backendapi.domain.market.entity.InstrumentMarket;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import java.util.HashMap;
import java.util.Map;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
public class AnalysisApiDto {

    /**
     * POST /technical, POST /market-trend 응답
     * (Frontend: AnalysisRequestIdResponse)
     */
    @Getter
    @AllArgsConstructor
    public static class RequestIdResponse {
        private String requestId;
        private String message;
    }

    /**
     * GET /result/{id} "처리 중" 응답
     * (Frontend: AnalysisProcessingResponse)
     */
    @Getter
    @AllArgsConstructor
    public static class ProcessingResponse {
        private final String status = "PROCESSING";
        private String message;
    }

    /**
     * GET /result/{id} "성공" 응답 (Python 원본 반환)
     * (Frontend: AnalysisResultData)
     * Java는 이 DTO를 직접 사용하지 않고, Python이 저장한 JSON(Object)을 반환합니다.
     */

    /**
     * POST /strategy 요청 본문
     */
    public record StrategyRequest(
            @NotNull(message = "market 은 필수입니다.") InstrumentMarket market,
            @NotBlank(message = "symbol 은 필수입니다.") String symbol,
            String interval,
            @Positive(message = "accountEquity 는 양수여야 합니다.") Double accountEquity,
            @DecimalMin(value = "0.001", message = "riskPct 는 0.1% 이상이어야 합니다.")
            @DecimalMax(value = "0.05", message = "riskPct 는 5% 이하여야 합니다.") Double riskPct
    ) {
        /** Python 으로 전달할 옵션 (AnalysisRequest.parameters JSON) */
        public Map<String, Object> toParameters() {
            Map<String, Object> params = new HashMap<>();
            params.put("interval", interval == null || interval.isBlank() ? "1d" : interval);
            if (accountEquity != null) params.put("accountEquity", accountEquity);
            if (riskPct != null) params.put("riskPct", riskPct);
            return params;
        }
    }
}
