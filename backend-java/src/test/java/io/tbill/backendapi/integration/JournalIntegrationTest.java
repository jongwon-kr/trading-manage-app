package io.tbill.backendapi.integration;

import com.fasterxml.jackson.databind.ObjectMapper;
import io.tbill.backendapi.domain.journal.entity.MarketType;
import io.tbill.backendapi.domain.journal.repository.JournalRepository;
import io.tbill.backendapi.presentation.journal.dto.JournalApiDto;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultHandlers.print;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest(
        webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT,
        properties = {
                "spring.kafka.enabled=false",
                "spring.data.redis.repositories.enabled=false"
        }
)
@AutoConfigureMockMvc
@ActiveProfiles("test")
@DisplayName("매매일지 API 통합 테스트")
class JournalIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private JournalRepository journalRepository;

    @BeforeEach
    void setUp() {
        journalRepository.deleteAll();
    }

    @Test
    @WithMockUser(username = "test@example.com") // Mock 사용자 인증
    @DisplayName("매매일지 생성 통합 테스트")
    void createJournal() throws Exception {
        // given
        JournalApiDto.CreateRequest request = new JournalApiDto.CreateRequest();
        request.setMarket(MarketType.STOCK);
        request.setSymbol("AAPL");
        request.setEntryPrice(new BigDecimal("150.00"));
        request.setStopLossPrice(new BigDecimal("145.00"));

        // when & then
        mockMvc.perform(post("/api/journals")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andDo(print())
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.symbol").value("AAPL"));
    }

    @Test
    @WithMockUser(username = "test@example.com")
    @DisplayName("매매일지 목록 조회 통합 테스트")
    void getJournalList() throws Exception {
        mockMvc.perform(get("/api/journals")
                        .param("page", "0")
                        .param("size", "20"))
                .andDo(print())
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content").isArray());
    }

    @Test
    @WithMockUser(username = "test@example.com")
    @DisplayName("통계 조회 통합 테스트")
    void getStatistics() throws Exception {
        mockMvc.perform(get("/api/journals/statistics"))
                .andDo(print())
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalTrades").exists());
    }
}
