package io.tbill.backendapi.domain.journal.service;

import io.tbill.backendapi.domain.journal.dto.JournalDto;
import io.tbill.backendapi.domain.journal.entity.Journal;
import io.tbill.backendapi.domain.journal.entity.MarketType;
import io.tbill.backendapi.domain.journal.repository.JournalRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class JournalServiceImplTest {

    @Mock
    private JournalRepository journalRepository;

    @InjectMocks
    private JournalServiceImpl journalService;

    @Test
    @DisplayName("매매일지 생성 성공")
    void createJournal() {
        // given
        JournalDto.CreateCommand command = JournalDto.CreateCommand.builder()
                .authorEmail("test@example.com")
                .market(MarketType.STOCK)
                .symbol("AAPL")
                .entryPrice(new BigDecimal("150.00"))
                .stopLossPrice(new BigDecimal("145.00"))
                .reasoning("{\"markdown\":\"테스트\"}")
                .build();

        Journal savedJournal = command.toEntity();
        when(journalRepository.save(any(Journal.class))).thenReturn(savedJournal);

        // when
        JournalDto.JournalInfo result = journalService.createJournal(command);

        // then
        assertThat(result.getSymbol()).isEqualTo("AAPL");
        assertThat(result.getAuthorEmail()).isEqualTo("test@example.com");
        verify(journalRepository, times(1)).save(any(Journal.class));
    }

    @Test
    @DisplayName("매매일지 삭제 - 권한 없음")
    void deleteJournal_NoPermission() {
        // given
        Long journalId = 1L;
        String authorEmail = "wrong@example.com";
        when(journalRepository.findByIdAndAuthorEmail(journalId, authorEmail))
                .thenReturn(Optional.empty());

        // when & then
        assertThatThrownBy(() -> journalService.deleteJournal(journalId, authorEmail))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("삭제 권한이 없습니다");
    }

    @Test
    @DisplayName("통계 정보 조회")
    void getStatistics() {
        // given
        String authorEmail = "test@example.com";
        when(journalRepository.getTotalPnLByAuthorEmail(authorEmail))
                .thenReturn(Optional.of(new BigDecimal("5000.00")));
        when(journalRepository.countByAuthorEmail(authorEmail)).thenReturn(10L);
        when(journalRepository.countByAuthorEmailAndRealizedPnLIsNotNull(authorEmail)).thenReturn(7L);
        when(journalRepository.countByAuthorEmailAndRealizedPnLGreaterThan(authorEmail, BigDecimal.ZERO))
                .thenReturn(5L);

        // when
        JournalDto.Statistics statistics = journalService.getStatistics(authorEmail);

        // then
        assertThat(statistics.getTotalPnL()).isEqualByComparingTo(new BigDecimal("5000.00"));
        assertThat(statistics.getTotalTrades()).isEqualTo(10L);
        assertThat(statistics.getClosedTrades()).isEqualTo(7L);
        assertThat(statistics.getOpenTrades()).isEqualTo(3L);
    }
}
