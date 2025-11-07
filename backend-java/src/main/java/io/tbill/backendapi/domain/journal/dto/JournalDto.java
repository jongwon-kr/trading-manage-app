package io.tbill.backendapi.domain.journal.dto;

import io.tbill.backendapi.domain.journal.entity.Journal;
import io.tbill.backendapi.domain.journal.entity.MarketType;
import lombok.Builder;
import lombok.Getter;
import java.math.BigDecimal;
import java.time.LocalDateTime;

public class JournalDto {

    /**
     * Service가 매매일지 생성을 위해 Controller로부터 받을 '명령' (Command)
     */
    @Getter
    public static class CreateCommand {
        // (인증된) 작성자 이메일 - 이 필드는 Controller에서 DTO로 변환 시,
        // SecurityContext 등에서 가져와 주입하는 것이 좋습니다.
        private final String authorEmail;
        private final MarketType market;
        private final String symbol;
        private final BigDecimal entryPrice;
        private final BigDecimal stopLossPrice;
        private final String reasoning; // JSON 형식의 문자열

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
                    // realizedPnL은 매매 생성 시점이 아닌,
                    // 종료/수정 시점에 업데이트되므로 여기서는 null
                    .build();
        }
    }

    /**
     * Service가 Controller로 반환할 '정보' (Info)
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
        private final String reasoning; // JSON 문자열
        private final LocalDateTime createdAt;
        private final LocalDateTime updatedAt;

        // 정적 팩토리 메서드 (Entity -> DTO)
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
}