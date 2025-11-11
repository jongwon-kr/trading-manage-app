package io.tbill.backendapi.presentation.journal.dto;

import com.fasterxml.jackson.databind.ObjectMapper;
import io.tbill.backendapi.domain.journal.dto.JournalDto;
import io.tbill.backendapi.domain.journal.entity.MarketType;
import jakarta.validation.constraints.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

public class JournalApiDto {

    private static final ObjectMapper objectMapper = new ObjectMapper();

    /**
     * 매매 이유 DTO
     */
    @Getter
    @Setter
    @NoArgsConstructor
    public static class ReasoningDto {
        private String markdown;
        private List<String> images;
    }

    /**
     * 매매일지 생성 요청
     */
    @Getter
    @Setter
    @NoArgsConstructor
    public static class CreateRequest {
        @NotNull(message = "시장 타입은 필수입니다")
        private MarketType market;

        @NotBlank(message = "심볼은 필수입니다")
        @Size(max = 20, message = "심볼은 20자 이하여야 합니다")
        private String symbol;

        @NotNull(message = "진입가는 필수입니다")
        @DecimalMin(value = "0.0", inclusive = false, message = "진입가는 0보다 커야 합니다")
        private BigDecimal entryPrice;

        @DecimalMin(value = "0.0", inclusive = false, message = "손절가는 0보다 커야 합니다")
        private BigDecimal stopLossPrice;

        private ReasoningDto reasoning;

        public JournalDto.CreateCommand toCommand(String authorEmail) {
            String reasoningJson = null;
            try {
                if (this.reasoning != null) {
                    reasoningJson = objectMapper.writeValueAsString(this.reasoning);
                }
            } catch (Exception e) {
                throw new RuntimeException("Reasoning DTO to JSON 변환 실패", e);
            }

            return JournalDto.CreateCommand.builder()
                    .authorEmail(authorEmail)
                    .market(this.market)
                    .symbol(this.symbol)
                    .entryPrice(this.entryPrice)
                    .stopLossPrice(this.stopLossPrice)
                    .reasoning(reasoningJson)
                    .build();
        }
    }

    /**
     * 매매일지 수정 요청 (새로 추가)
     */
    @Getter
    @Setter
    @NoArgsConstructor
    public static class UpdateRequest {
        @DecimalMin(value = "0.0", inclusive = false, message = "진입가는 0보다 커야 합니다")
        private BigDecimal entryPrice;

        @DecimalMin(value = "0.0", inclusive = false, message = "손절가는 0보다 커야 합니다")
        private BigDecimal stopLossPrice;

        private BigDecimal realizedPnL; // 손익 입력

        private ReasoningDto reasoning;

        public JournalDto.UpdateCommand toCommand(Long id, String authorEmail) {
            String reasoningJson = null;
            try {
                if (this.reasoning != null) {
                    reasoningJson = objectMapper.writeValueAsString(this.reasoning);
                }
            } catch (Exception e) {
                throw new RuntimeException("Reasoning DTO to JSON 변환 실패", e);
            }

            return JournalDto.UpdateCommand.builder()
                    .id(id)
                    .authorEmail(authorEmail)
                    .entryPrice(this.entryPrice)
                    .stopLossPrice(this.stopLossPrice)
                    .realizedPnL(this.realizedPnL)
                    .reasoning(reasoningJson)
                    .build();
        }
    }

    /**
     * 매매일지 검색 요청 (새로 추가)
     */
    @Getter
    @Setter
    @NoArgsConstructor
    public static class SearchRequest {
        private MarketType market;
        private String symbol;
        private LocalDateTime startDate;
        private LocalDateTime endDate;
        private Boolean isClosed;

        public JournalDto.SearchCondition toSearchCondition(String authorEmail) {
            return JournalDto.SearchCondition.builder()
                    .authorEmail(authorEmail)
                    .market(this.market)
                    .symbol(this.symbol)
                    .startDate(this.startDate)
                    .endDate(this.endDate)
                    .isClosed(this.isClosed)
                    .build();
        }
    }

    /**
     * 매매일지 상세 응답
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
        private final ReasoningDto reasoning;
        private final LocalDateTime createdAt;
        private final LocalDateTime updatedAt;

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

            ReasoningDto reasoningDto = null;
            if (info.getReasoning() != null) {
                try {
                    reasoningDto = objectMapper.readValue(info.getReasoning(), ReasoningDto.class);
                } catch (Exception e) {
                    // 로깅 처리
                }
            }
            this.reasoning = reasoningDto;
        }
    }

    /**
     * 매매일지 목록 응답 (새로 추가 - 경량화)
     */
    @Getter
    public static class JournalSummaryResponse {
        private final Long id;
        private final MarketType market;
        private final String symbol;
        private final BigDecimal entryPrice;
        private final BigDecimal realizedPnL;
        private final LocalDateTime createdAt;
        private final Boolean isClosed;

        public JournalSummaryResponse(JournalDto.JournalSummary summary) {
            this.id = summary.getId();
            this.market = summary.getMarket();
            this.symbol = summary.getSymbol();
            this.entryPrice = summary.getEntryPrice();
            this.realizedPnL = summary.getRealizedPnL();
            this.createdAt = summary.getCreatedAt();
            this.isClosed = summary.getIsClosed();
        }
    }

    /**
     * 통계 응답 (새로 추가)
     */
    @Getter
    public static class StatisticsResponse {
        private final BigDecimal totalPnL;
        private final Long totalTrades;
        private final Long closedTrades;
        private final Long openTrades;
        private final BigDecimal winRate;

        public StatisticsResponse(JournalDto.Statistics statistics) {
            this.totalPnL = statistics.getTotalPnL();
            this.totalTrades = statistics.getTotalTrades();
            this.closedTrades = statistics.getClosedTrades();
            this.openTrades = statistics.getOpenTrades();
            this.winRate = statistics.getWinRate();
        }
    }
}
