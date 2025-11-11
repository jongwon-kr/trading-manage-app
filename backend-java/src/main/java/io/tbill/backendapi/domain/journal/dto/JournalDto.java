package io.tbill.backendapi.domain.journal.dto;

import io.tbill.backendapi.domain.journal.entity.Journal;
import io.tbill.backendapi.domain.journal.entity.MarketType;
import lombok.Builder;
import lombok.Getter;
import java.math.BigDecimal;
import java.time.LocalDateTime;

public class JournalDto {

    /**
     * 매매일지 생성 Command
     */
    @Getter
    public static class CreateCommand {
        private final String authorEmail;
        private final MarketType market;
        private final String symbol;
        private final BigDecimal entryPrice;
        private final BigDecimal stopLossPrice;
        private final String reasoning;

        @Builder
        public CreateCommand(String authorEmail, MarketType market, String symbol,
                             BigDecimal entryPrice, BigDecimal stopLossPrice, String reasoning) {
            this.authorEmail = authorEmail;
            this.market = market;
            this.symbol = symbol;
            this.entryPrice = entryPrice;
            this.stopLossPrice = stopLossPrice;
            this.reasoning = reasoning;
        }

        public Journal toEntity() {
            return Journal.builder()
                    .authorEmail(this.authorEmail)
                    .market(this.market)
                    .symbol(this.symbol)
                    .entryPrice(this.entryPrice)
                    .stopLossPrice(this.stopLossPrice)
                    .reasoning(this.reasoning)
                    .build();
        }
    }

    /**
     * 매매일지 수정 Command (새로 추가)
     */
    @Getter
    public static class UpdateCommand {
        private final Long id;
        private final String authorEmail; // 권한 검증용
        private final BigDecimal entryPrice;
        private final BigDecimal stopLossPrice;
        private final BigDecimal realizedPnL; // 손익 업데이트
        private final String reasoning;

        @Builder
        public UpdateCommand(Long id, String authorEmail, BigDecimal entryPrice,
                             BigDecimal stopLossPrice, BigDecimal realizedPnL, String reasoning) {
            this.id = id;
            this.authorEmail = authorEmail;
            this.entryPrice = entryPrice;
            this.stopLossPrice = stopLossPrice;
            this.realizedPnL = realizedPnL;
            this.reasoning = reasoning;
        }
    }

    /**
     * 매매일지 검색 조건 (새로 추가)
     */
    @Getter
    public static class SearchCondition {
        private final String authorEmail;
        private final MarketType market;
        private final String symbol;
        private final LocalDateTime startDate;
        private final LocalDateTime endDate;
        private final Boolean isClosed; // true: 종료된 거래, false: 진행중, null: 전체

        @Builder
        public SearchCondition(String authorEmail, MarketType market, String symbol,
                               LocalDateTime startDate, LocalDateTime endDate, Boolean isClosed) {
            this.authorEmail = authorEmail;
            this.market = market;
            this.symbol = symbol;
            this.startDate = startDate;
            this.endDate = endDate;
            this.isClosed = isClosed;
        }
    }

    /**
     * 매매일지 정보 (기존 유지)
     */
    @Getter
    public static class JournalInfo {
        private final Long id;
        private final String authorEmail;
        private final MarketType market;
        private final String symbol;
        private final BigDecimal entryPrice;
        private final BigDecimal stopLossPrice;
        private final BigDecimal realizedPnL;
        private final String reasoning;
        private final LocalDateTime createdAt;
        private final LocalDateTime updatedAt;

        public static JournalInfo from(Journal journal) {
            return new JournalInfo(journal);
        }

        private JournalInfo(Journal journal) {
            this.id = journal.getId();
            this.authorEmail = journal.getAuthorEmail();
            this.market = journal.getMarket();
            this.symbol = journal.getSymbol();
            this.entryPrice = journal.getEntryPrice();
            this.stopLossPrice = journal.getStopLossPrice();
            this.realizedPnL = journal.getRealizedPnL();
            this.reasoning = journal.getReasoning();
            this.createdAt = journal.getCreatedAt();
            this.updatedAt = journal.getUpdatedAt();
        }
    }

    /**
     * 매매일지 목록 요약 정보 (새로 추가 - 리스트용 경량화)
     */
    @Getter
    public static class JournalSummary {
        private final Long id;
        private final MarketType market;
        private final String symbol;
        private final BigDecimal entryPrice;
        private final BigDecimal realizedPnL;
        private final LocalDateTime createdAt;
        private final Boolean isClosed;

        public static JournalSummary from(Journal journal) {
            return new JournalSummary(journal);
        }

        private JournalSummary(Journal journal) {
            this.id = journal.getId();
            this.market = journal.getMarket();
            this.symbol = journal.getSymbol();
            this.entryPrice = journal.getEntryPrice();
            this.realizedPnL = journal.getRealizedPnL();
            this.createdAt = journal.getCreatedAt();
            this.isClosed = journal.getRealizedPnL() != null;
        }
    }

    /**
     * 통계 정보 (새로 추가)
     */
    @Getter
    public static class Statistics {
        private final BigDecimal totalPnL;
        private final Long totalTrades;
        private final Long closedTrades;
        private final Long openTrades;
        private final BigDecimal winRate;

        @Builder
        public Statistics(BigDecimal totalPnL, Long totalTrades, Long closedTrades,
                          Long openTrades, BigDecimal winRate) {
            this.totalPnL = totalPnL;
            this.totalTrades = totalTrades;
            this.closedTrades = closedTrades;
            this.openTrades = openTrades;
            this.winRate = winRate;
        }
    }
}
