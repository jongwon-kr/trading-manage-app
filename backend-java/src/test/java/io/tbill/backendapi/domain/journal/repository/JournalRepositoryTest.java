package io.tbill.backendapi.domain.journal.repository;

import io.tbill.backendapi.domain.journal.entity.Journal;
import io.tbill.backendapi.domain.journal.entity.MarketType;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.test.context.ActiveProfiles;

import java.math.BigDecimal;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;

@DataJpaTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE) // H2 사용
@ActiveProfiles("test") // application-test.yml 사용
class JournalRepositoryTest {

    @Autowired
    private JournalRepository journalRepository;

    private String testEmail = "test@example.com";

    @BeforeEach
    void setUp() {
        // 기존 데이터 정리
        journalRepository.deleteAll();

        // 테스트 데이터 생성
        Journal journal1 = Journal.builder()
                .authorEmail(testEmail)
                .market(MarketType.STOCK)
                .symbol("AAPL")
                .entryPrice(new BigDecimal("150.50"))
                .stopLossPrice(new BigDecimal("145.00"))
                .realizedPnL(new BigDecimal("500.00"))
                .reasoning("테스트 매매 이유 1")
                .build();

        Journal journal2 = Journal.builder()
                .authorEmail(testEmail)
                .market(MarketType.CRYPTO)
                .symbol("BTC")
                .entryPrice(new BigDecimal("45000.00"))
                .stopLossPrice(new BigDecimal("42000.00"))
                .reasoning("테스트 매매 이유 2")
                .build();

        journalRepository.save(journal1);
        journalRepository.save(journal2);
    }

    @Test
    @DisplayName("작성자 이메일로 매매일지 조회")
    void findByAuthorEmail() {
        // given
        Pageable pageable = PageRequest.of(0, 10);

        // when
        Page<Journal> result = journalRepository.findByAuthorEmail(testEmail, pageable);

        // then
        assertThat(result.getContent()).hasSize(2);
        assertThat(result.getContent().get(0).getAuthorEmail()).isEqualTo(testEmail);
    }

    @Test
    @DisplayName("심볼로 매매일지 필터링 조회")
    void findByAuthorEmailAndSymbol() {
        // given
        Pageable pageable = PageRequest.of(0, 10);

        // when
        Page<Journal> result = journalRepository.findByAuthorEmailAndSymbol(
                testEmail, "AAPL", pageable);

        // then
        assertThat(result.getContent()).hasSize(1);
        assertThat(result.getContent().get(0).getSymbol()).isEqualTo("AAPL");
    }

    @Test
    @DisplayName("종료된 거래만 조회 (realizedPnL이 있는 경우)")
    void findClosedTradesByAuthorEmail() {
        // given
        Pageable pageable = PageRequest.of(0, 10);

        // when
        Page<Journal> result = journalRepository.findClosedTradesByAuthorEmail(
                testEmail, pageable);

        // then
        assertThat(result.getContent()).hasSize(1);
        assertThat(result.getContent().get(0).getRealizedPnL()).isNotNull();
    }

    @Test
    @DisplayName("진행 중인 거래만 조회 (realizedPnL이 없는 경우)")
    void findOpenTradesByAuthorEmail() {
        // given
        Pageable pageable = PageRequest.of(0, 10);

        // when
        Page<Journal> result = journalRepository.findOpenTradesByAuthorEmail(
                testEmail, pageable);

        // then
        assertThat(result.getContent()).hasSize(1);
        assertThat(result.getContent().get(0).getRealizedPnL()).isNull();
    }

    @Test
    @DisplayName("총 실현 손익 계산")
    void getTotalPnLByAuthorEmail() {
        // when
        Optional<BigDecimal> totalPnL = journalRepository.getTotalPnLByAuthorEmail(testEmail);

        // then
        assertThat(totalPnL).isPresent();
        assertThat(totalPnL.get()).isEqualByComparingTo(new BigDecimal("500.00"));
    }

    @Test
    @DisplayName("ID와 작성자 이메일로 조회 (권한 검증)")
    void findByIdAndAuthorEmail() {
        // given
        Journal saved = journalRepository.findAll().get(0);

        // when
        Optional<Journal> result = journalRepository.findByIdAndAuthorEmail(
                saved.getId(), testEmail);

        // then
        assertThat(result).isPresent();
        assertThat(result.get().getAuthorEmail()).isEqualTo(testEmail);
    }
}
