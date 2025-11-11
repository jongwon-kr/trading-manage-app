package io.tbill.backendapi.presentation.journal.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import io.tbill.backendapi.domain.journal.dto.JournalDto;
import io.tbill.backendapi.domain.journal.entity.MarketType;
import io.tbill.backendapi.domain.journal.service.JournalService;
import io.tbill.backendapi.global.utils.auth.AuthUtils;
import io.tbill.backendapi.presentation.journal.dto.JournalApiDto;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.test.context.ActiveProfiles;

import java.math.BigDecimal;
import java.util.Collections;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@ActiveProfiles("test")
class JournalControllerTest {

    @Mock
    private JournalService journalService;

    @InjectMocks
    private JournalController journalController;

    private ObjectMapper objectMapper;

    @BeforeEach
    void setUp() {
        try (var authUtilsMock = mockStatic(AuthUtils.class)) {
            objectMapper = new ObjectMapper();
            authUtilsMock.when(AuthUtils::getCurrentUserEmail)
                    .thenReturn("test@example.com");
        }
    }

    @Test
    @DisplayName("매매일지 생성 테스트")
    void createJournal() {
        // given
        JournalApiDto.CreateRequest request = new JournalApiDto.CreateRequest();
        request.setMarket(MarketType.STOCK);
        request.setSymbol("AAPL");
        request.setEntryPrice(new BigDecimal("150.00"));
        request.setStopLossPrice(new BigDecimal("145.00"));

        JournalDto.JournalInfo mockInfo = createMockJournalInfo();
        when(journalService.createJournal(any())).thenReturn(mockInfo);

        // when
        ResponseEntity<JournalApiDto.JournalResponse> response =
                journalController.createJournal(request);

        // then
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().getSymbol()).isEqualTo("AAPL");
        verify(journalService, times(1)).createJournal(any());
    }

    @Test
    @DisplayName("매매일지 목록 조회 테스트")
    void getMyJournals() {
        // given
        JournalDto.JournalSummary mockSummary = createMockJournalSummary();
        Page<JournalDto.JournalSummary> mockPage = new PageImpl<>(
                Collections.singletonList(mockSummary),
                PageRequest.of(0, 20),
                1
        );
        when(journalService.getMyJournals(any(), any())).thenReturn(mockPage);

        // when
        ResponseEntity<Page<JournalApiDto.JournalSummaryResponse>> response =
                journalController.getMyJournals(0, 20, "createdAt", "DESC");

        // then
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().getContent()).hasSize(1);
        assertThat(response.getBody().getContent().get(0).getSymbol()).isEqualTo("AAPL");
    }

    @Test
    @DisplayName("매매일지 상세 조회 테스트")
    void getJournal() {
        // given
        Long journalId = 1L;
        JournalDto.JournalInfo mockInfo = createMockJournalInfo();
        when(journalService.getJournalById(eq(journalId), any())).thenReturn(mockInfo);

        // when
        ResponseEntity<JournalApiDto.JournalResponse> response =
                journalController.getJournal(journalId);

        // then
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().getSymbol()).isEqualTo("AAPL");
    }

    @Test
    @DisplayName("매매일지 삭제 테스트")
    void deleteJournal() {
        // given
        Long journalId = 1L;
        doNothing().when(journalService).deleteJournal(eq(journalId), any());

        // when
        ResponseEntity<Void> response = journalController.deleteJournal(journalId);

        // then
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.NO_CONTENT);
        verify(journalService, times(1)).deleteJournal(eq(journalId), any());
    }

    @Test
    @DisplayName("통계 조회 테스트")
    void getStatistics() {
        // given
        JournalDto.Statistics mockStatistics = JournalDto.Statistics.builder()
                .totalPnL(new BigDecimal("5000.00"))
                .totalTrades(10L)
                .closedTrades(7L)
                .openTrades(3L)
                .winRate(new BigDecimal("71.43"))
                .build();
        when(journalService.getStatistics(any())).thenReturn(mockStatistics);

        // when
        ResponseEntity<JournalApiDto.StatisticsResponse> response =
                journalController.getStatistics();

        // then
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().getTotalTrades()).isEqualTo(10L);
    }

    // Helper methods
    private JournalDto.JournalInfo createMockJournalInfo() {
        return JournalDto.JournalInfo.from(
                io.tbill.backendapi.domain.journal.entity.Journal.builder()
                        .authorEmail("test@example.com")
                        .market(MarketType.STOCK)
                        .symbol("AAPL")
                        .entryPrice(new BigDecimal("150.00"))
                        .stopLossPrice(new BigDecimal("145.00"))
                        .build()
        );
    }

    private JournalDto.JournalSummary createMockJournalSummary() {
        return JournalDto.JournalSummary.from(
                io.tbill.backendapi.domain.journal.entity.Journal.builder()
                        .authorEmail("test@example.com")
                        .market(MarketType.STOCK)
                        .symbol("AAPL")
                        .entryPrice(new BigDecimal("150.00"))
                        .build()
        );
    }
}
