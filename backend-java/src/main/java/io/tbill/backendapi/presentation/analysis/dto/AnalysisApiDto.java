package io.tbill.backendapi.presentation.analysis.dto;

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
}