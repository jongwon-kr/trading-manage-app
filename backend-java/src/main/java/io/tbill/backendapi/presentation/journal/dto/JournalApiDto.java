package io.tbill.backendapi.presentation.journal.dto;

import com.fasterxml.jackson.databind.ObjectMapper;
import io.tbill.backendapi.domain.journal.dto.JournalDto;
import io.tbill.backendapi.domain.journal.entity.MarketType;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

public class JournalApiDto {

    // (Helper) ObjectMapper 주입을 위한 정적 내부 클래스
    // Controller에서 이 DTO를 사용할 때 ObjectMapper를 주입받아 사용
    private static final ObjectMapper objectMapper = new ObjectMapper();

    /**
     * 매매 이유(Reasoning)를 객체로 받기 위한 내부 DTO
     */
    @Getter
    @Setter
    public static class ReasoningDto {
        private String markdown;
        private List<String> images;
    }

    /**
     * [POST] /api/journals (매매일지 생성 요청)
     */
    @Getter
    @Setter
    public static class CreateRequest {
        // Validation 어노테이션(@NotBlank, @NotNull) 추가 필요
        private MarketType market;
        private String symbol;
        private BigDecimal entryPrice;
        private BigDecimal stopLossPrice;

        // API 스펙 상 JSON 객체(markdown, images)로 받음
        private ReasoningDto reasoning;

        // Presentation DTO -> Domain DTO(Command)
        public JournalDto.CreateCommand toCommand(String authorEmail) {
            String reasoningJson = null;
            try {
                // 객체를 JSON 문자열로 변환하여 Service에 전달
                if (this.reasoning != null) {
                    reasoningJson = objectMapper.writeValueAsString(this.reasoning);
                }
            } catch (Exception e) {
                // (개선) 로깅 및 예외 처리
                throw new RuntimeException("Reasoning DTO to JSON 변환 실패");
            }

            return JournalDto.CreateCommand.builder()
                    .authorEmail(authorEmail) // Controller에서 인증 정보 주입
                    .market(this.market)
                    .symbol(this.symbol)
                    .entryPrice(this.entryPrice)
                    .stopLossPrice(this.stopLossPrice)
                    .reasoning(reasoningJson)
                    .build();
        }
    }

    /**
     * API 응답 DTO (상세 조회, 목록 조회 공통 사용)
     */
    @Getter
    public static class JournalResponse {
        private final Long id;
        private final String authorEmail;
        private final MarketType market;
        private final String symbol;
        private final BigDecimal entryPrice;
        private final BigDecimal stopLossPrice;
        private final BigDecimal realizedPnL;

        // JSON 문자열을 다시 객체로 변환하여 응답
        private final ReasoningDto reasoning;

        private final LocalDateTime createdAt;
        private final LocalDateTime updatedAt;

        // Domain DTO(Info) -> Presentation DTO(Response)
        public JournalResponse(JournalDto.JournalInfo info) {
            this.id = info.getId();
            this.authorEmail = info.getAuthorEmail();
            this.market = info.getMarket();
            this.symbol = info.getSymbol();
            this.entryPrice = info.getEntryPrice();
            this.stopLossPrice = info.getStopLossPrice();
            this.realizedPnL = info.getRealizedPnL();
            this.createdAt = info.getCreatedAt();
            this.updatedAt = info.getUpdatedAt();

            // JSON 문자열 -> 객체 변환
            ReasoningDto reasoningDto = null;
            if (info.getReasoning() != null) {
                try {
                    reasoningDto = objectMapper.readValue(info.getReasoning(), ReasoningDto.class);
                } catch (Exception e) {
                    // (개선) 로깅
                }
            }
            this.reasoning = reasoningDto;
        }
    }
}