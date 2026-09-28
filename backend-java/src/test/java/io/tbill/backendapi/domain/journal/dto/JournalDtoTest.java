package io.tbill.backendapi.domain.journal.dto;

import io.tbill.backendapi.domain.journal.entity.Journal;
import io.tbill.backendapi.domain.journal.entity.MarketType;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;

import static org.assertj.core.api.Assertions.assertThat;

class JournalDtoTest {

    @Test
    @DisplayName("CreateCommand에서 Entity로 변환")
    void createCommandToEntity() {
        // given
        JournalDto.CreateCommand command = JournalDto.CreateCommand.builder()
                .authorEmail("test@example.com")
                .market(MarketType.STOCK)
                .symbol("AAPL")
                .entryPrice(new BigDecimal("150.00"))
                .stopLossPrice(new BigDecimal("145.00"))
                .reasoning("{\"markdown\":\"테스트\"}")
                .build();

        // when
        Journal journal = command.toEntity();

        // then
        assertThat(journal.getAuthorEmail()).isEqualTo("test@example.com");
        assertThat(journal.getMarket()).isEqualTo(MarketType.STOCK);
        assertThat(journal.getSymbol()).isEqualTo("AAPL");
        assertThat(journal.getEntryPrice()).isEqualByComparingTo(new BigDecimal("150.00"));
    }

    @Test
    @DisplayName("이미 청산된 거래는 생성 시 realizedPnL 이 저장되고, 코인 수량 소수점이 유지된다")
    void createClosedTradeKeepsRealizedPnL() {
        JournalDto.CreateCommand command = JournalDto.CreateCommand.builder()
                .authorEmail("test@example.com")
                .market(MarketType.CRYPTO)
                .symbol("KRW-BTC")
                .quantity(new BigDecimal("0.00012345"))
                .entryPrice(new BigDecimal("112934000"))
                .realizedPnL(new BigDecimal("-1520.5"))
                .build();

        Journal journal = command.toEntity();

        assertThat(journal.getRealizedPnL()).isEqualByComparingTo("-1520.5");
        assertThat(journal.getQuantity()).isEqualByComparingTo("0.00012345");
    }

    @Test
    @DisplayName("Entity에서 JournalInfo로 변환")
    void entityToJournalInfo() {
        // given
        Journal journal = Journal.builder()
                .authorEmail("test@example.com")
                .market(MarketType.CRYPTO)
                .symbol("BTC")
                .entryPrice(new BigDecimal("45000.00"))
                .stopLossPrice(new BigDecimal("42000.00"))
                .realizedPnL(new BigDecimal("1000.00"))
                .reasoning("{\"markdown\":\"테스트\"}")
                .build();

        // when
        JournalDto.JournalInfo info = JournalDto.JournalInfo.from(journal);

        // then
        assertThat(info.getAuthorEmail()).isEqualTo("test@example.com");
        assertThat(info.getMarket()).isEqualTo(MarketType.CRYPTO);
        assertThat(info.getSymbol()).isEqualTo("BTC");
        assertThat(info.getRealizedPnL()).isEqualByComparingTo(new BigDecimal("1000.00"));
    }
}
