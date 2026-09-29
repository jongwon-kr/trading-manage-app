package io.tbill.backendapi.domain.content.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import io.tbill.backendapi.domain.content.dto.ContentDto;
import io.tbill.backendapi.domain.content.entity.Content;
import io.tbill.backendapi.domain.content.entity.ContentCategory;
import io.tbill.backendapi.domain.content.entity.AttachmentType;
import io.tbill.backendapi.domain.content.repository.ContentRepository;
import io.tbill.backendapi.domain.journal.entity.Journal;
import io.tbill.backendapi.domain.journal.entity.MarketType;
import io.tbill.backendapi.domain.journal.entity.TradeType;
import io.tbill.backendapi.domain.journal.repository.JournalRepository;
import io.tbill.backendapi.domain.strategy.entity.StrategyPreset;
import io.tbill.backendapi.domain.strategy.repository.StrategyPresetRepository;
import io.tbill.backendapi.domain.strategy.service.StrategyPresetService;
import io.tbill.backendapi.global.exception.CommunityException;
import io.tbill.backendapi.infrastructure.redis.service.AnalysisResultCacheService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.test.util.ReflectionTestUtils;

import java.math.BigDecimal;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ShareServiceTest {

    private static final String ME = "me@x.io";

    @Mock private JournalRepository journalRepository;
    @Mock private StrategyPresetRepository presetRepository;
    @Mock private StrategyPresetService presetService;
    @Mock private ContentRepository contentRepository;
    @Mock private ContentService contentService;
    @Mock private AnalysisResultCacheService resultCache;
    @Mock private ApplicationEventPublisher events;

    private final ObjectMapper om = new ObjectMapper();
    private ShareService service;

    @BeforeEach
    void setUp() {
        service = new ShareService(journalRepository, presetRepository, presetService, contentRepository, contentService,
                resultCache, events, om);
    }

    private Journal journal() {
        Journal j = Journal.builder().authorEmail(ME).market(MarketType.STOCK).symbol("005930").tradeType(TradeType.LONG)
                .quantity(new BigDecimal("10")).entryPrice(new BigDecimal("100")).stopLossPrice(new BigDecimal("90"))
                .reasoning("{\"markdown\":\"<p>근거</p><script>x</script>\",\"images\":[]}").build();
        ReflectionTestUtils.setField(j, "id", 3L);
        ReflectionTestUtils.setField(j, "realizedPnL", new BigDecimal("150"));
        return j;
    }

    private ContentDto.AttachmentPostCommand captureAttachment() {
        ArgumentCaptor<ContentDto.AttachmentPostCommand> captor = ArgumentCaptor.forClass(ContentDto.AttachmentPostCommand.class);
        verify(contentService).createAttachmentPost(captor.capture());
        return captor.getValue();
    }

    @Test
    @DisplayName("일지 공유 + 금액 가리기: 수량·실현손익은 빠지고 수익률·R 배수·정화된 근거만 남는다")
    void journalHideAmounts() {
        when(journalRepository.findByIdAndAuthorEmail(3L, ME)).thenReturn(Optional.of(journal()));
        service.shareJournal(3L, ME, "삼성 매매", "", true);
        var cmd = captureAttachment();
        var snap = cmd.attachment();
        assertThat(snap.has("quantity")).isFalse();
        assertThat(snap.has("realizedPnL")).isFalse();
        assertThat(snap.get("pnlPct").asDouble()).isEqualTo(0.15);
        assertThat(snap.get("rMultiple").asDouble()).isEqualTo(1.5);
        assertThat(snap.get("reasoningHtml").asText()).isEqualTo("<p>근거</p>");
        assertThat(cmd.symbolKey()).isEqualTo("KR_STOCK:005930");
        assertThat(cmd.category()).isEqualTo(ContentCategory.JOURNAL_SHARE);
    }

    @Test
    @DisplayName("일지 공유: 금액 공개를 고르면 수량·실현손익 포함, 남의 일지는 404")
    void journalShowAmounts() {
        when(journalRepository.findByIdAndAuthorEmail(3L, ME)).thenReturn(Optional.of(journal()));
        service.shareJournal(3L, ME, "t", "", false);
        assertThat(captureAttachment().attachment().get("quantity").decimalValue()).isEqualByComparingTo("10");
        when(journalRepository.findByIdAndAuthorEmail(4L, ME)).thenReturn(Optional.empty());
        assertThatThrownBy(() -> service.shareJournal(4L, ME, "t", "", false)).isInstanceOf(CommunityException.class);
    }

    private StrategyPreset preset() {
        StrategyPreset p = StrategyPreset.builder().userEmail(ME).name("추세").config("{\"x\":1}").configHash("h1").build();
        ReflectionTestUtils.setField(p, "id", 7L);
        return p;
    }

    @Test
    @DisplayName("전략 공유: 설정 해시가 다른 백테스트는 400, 같으면 성과 지표를 복사하고 정렬용 수익률·MDD 저장")
    void strategyBacktestHash() {
        when(presetRepository.findByIdAndUserEmail(7L, ME)).thenReturn(Optional.of(preset()));
        when(resultCache.getAnalysisResult("bad")).thenReturn(Optional.of(
                "{\"status\":\"SUCCESS\",\"metrics\":{\"totalReturn\":0.3},\"config\":{\"hash\":\"OTHER\"}}"));
        assertThatThrownBy(() -> service.shareStrategy(7L, ME, "t", "", "bad")).isInstanceOf(CommunityException.class);

        when(resultCache.getAnalysisResult("ok")).thenReturn(Optional.of("""
                {"status":"SUCCESS","market":"KR_STOCK","symbol":"005930","name":"삼성전자","from":"2023-01-02","to":"2026-01-02",
                 "metrics":{"totalReturn":0.3,"mdd":-0.2,"sharpe":1.1,"trades":12,"secret":1},
                 "benchmarkMetrics":{"totalReturn":0.1,"mdd":-0.3},"config":{"hash":"h1"}}"""));
        service.shareStrategy(7L, ME, "t", "", "ok");
        var cmd = captureAttachment();
        assertThat(cmd.metricReturn()).isEqualTo(0.3);
        assertThat(cmd.metricMdd()).isEqualTo(-0.2);
        assertThat(cmd.symbolKey()).isEqualTo("KR_STOCK:005930");
        var bt = cmd.attachment().get("backtest");
        assertThat(bt.get("metrics").has("secret")).isFalse();
        assertThat(cmd.attachment().get("config").get("x").asInt()).isEqualTo(1);
    }

    @Test
    @DisplayName("가져오기: 스냅샷 설정으로 내 전략을 만들고 가져오기 수 +1")
    void importStrategy() {
        Content c = Content.builder().category(ContentCategory.STRATEGY_SHARE).title("t").content("").authorEmail("a@x.io")
                .attachmentType(AttachmentType.STRATEGY).attachment("{\"name\":\"추세\",\"description\":null,\"config\":{\"x\":1}}").build();
        ReflectionTestUtils.setField(c, "id", 11L);
        when(contentRepository.findByIdNotDeleted(11L)).thenReturn(Optional.of(c));

        service.importStrategy(11L, ME);

        verify(presetService).importPreset(eq(ME), eq("추세"), isNull(), argThat(n -> n.get("x").asInt() == 1), eq(11L));
        assertThat(c.getImportCount()).isEqualTo(1);
        verify(events).publishEvent(any(CommunityEvents.Imported.class));
    }

    @Test
    @DisplayName("일지 시장 → 시세 키 추정")
    void symbolKey() {
        assertThat(ShareService.symbolKey(MarketType.STOCK, "aapl")).isEqualTo("US_STOCK:AAPL");
        assertThat(ShareService.symbolKey(MarketType.CRYPTO, "BTC")).isEqualTo("CRYPTO:KRW-BTC");
        assertThat(ShareService.symbolKey(MarketType.FOREX, "USDKRW")).isNull();
    }
}
