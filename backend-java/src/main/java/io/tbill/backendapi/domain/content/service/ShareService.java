package io.tbill.backendapi.domain.content.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import io.tbill.backendapi.domain.content.dto.ContentDto;
import io.tbill.backendapi.domain.content.entity.AttachmentType;
import io.tbill.backendapi.domain.content.entity.Content;
import io.tbill.backendapi.domain.content.entity.ContentCategory;
import io.tbill.backendapi.domain.content.repository.ContentRepository;
import io.tbill.backendapi.domain.journal.entity.Journal;
import io.tbill.backendapi.domain.journal.entity.MarketType;
import io.tbill.backendapi.domain.journal.repository.JournalRepository;
import io.tbill.backendapi.domain.strategy.dto.StrategyPresetDto;
import io.tbill.backendapi.domain.strategy.entity.StrategyPreset;
import io.tbill.backendapi.domain.strategy.repository.StrategyPresetRepository;
import io.tbill.backendapi.domain.strategy.service.StrategyPresetService;
import io.tbill.backendapi.global.exception.CommunityException;
import io.tbill.backendapi.global.utils.HtmlSanitizer;
import io.tbill.backendapi.infrastructure.redis.service.AnalysisResultCacheService;
import lombok.RequiredArgsConstructor;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.MathContext;
import java.util.List;

/**
 * 매매일지·전략을 커뮤니티에 공유(스냅샷)하고, 공유된 전략을 내 전략으로 가져온다.
 * - 일지 금액 가리기: 수량·실현손익(금액)을 서버에서 빼고 수익률·R 배수만 남긴다.
 * - 전략 성과 첨부: 백테스트 결과(Redis analysis:{id})의 설정 해시가 공유하는 전략과 같을 때만 허용한다.
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ShareService {

    private static final List<String> METRIC_KEYS = List.of("totalReturn", "cagr", "mdd", "sharpe", "winRate", "trades",
            "profitFactor", "exposure");

    private final JournalRepository journalRepository;
    private final StrategyPresetRepository strategyPresetRepository;
    private final StrategyPresetService strategyPresetService;
    private final ContentRepository contentRepository;
    private final ContentService contentService;
    private final AnalysisResultCacheService analysisResultCacheService;
    private final ApplicationEventPublisher events;
    private final ObjectMapper objectMapper;

    @Transactional
    public ContentDto.Detail shareJournal(Long journalId, String email, String title, String body, boolean hideAmounts) {
        Journal j = journalRepository.findByIdAndAuthorEmail(journalId, email)
                .orElseThrow(() -> CommunityException.notFound("매매일지를 찾을 수 없습니다."));
        ObjectNode snap = objectMapper.createObjectNode();
        snap.put("journalId", j.getId());
        snap.put("market", j.getMarket().name());
        snap.put("symbol", j.getSymbol());
        snap.put("tradeType", j.getTradeType().name());
        snap.put("entryPrice", j.getEntryPrice());
        snap.put("stopLossPrice", j.getStopLossPrice());
        snap.put("closed", j.getRealizedPnL() != null);
        snap.put("hideAmounts", hideAmounts);
        if (!hideAmounts) {
            snap.put("quantity", j.getQuantity());
            snap.put("realizedPnL", j.getRealizedPnL());
        }
        BigDecimal cost = j.getEntryPrice().multiply(j.getQuantity());
        if (j.getRealizedPnL() != null && cost.signum() > 0) {
            snap.put("pnlPct", j.getRealizedPnL().divide(cost, MathContext.DECIMAL64).doubleValue());
        }
        if (j.getRealizedPnL() != null && j.getStopLossPrice() != null) {
            BigDecimal risk = j.getEntryPrice().subtract(j.getStopLossPrice()).abs().multiply(j.getQuantity());
            if (risk.signum() > 0) {
                snap.put("rMultiple", j.getRealizedPnL().divide(risk, MathContext.DECIMAL64).doubleValue());
            }
        }
        snap.put("reasoningHtml", HtmlSanitizer.clean(reasoningHtml(j.getReasoning())));
        snap.put("tradedAt", j.getCreatedAt() != null ? j.getCreatedAt().toString() : null);

        return contentService.createAttachmentPost(new ContentDto.AttachmentPostCommand(email, ContentCategory.JOURNAL_SHARE,
                title, body, AttachmentType.JOURNAL, snap, symbolKey(j.getMarket(), j.getSymbol()), null, null));
    }

    @Transactional
    public ContentDto.Detail shareStrategy(Long presetId, String email, String title, String body, String backtestRequestId) {
        StrategyPreset p = strategyPresetRepository.findByIdAndUserEmail(presetId, email)
                .orElseThrow(() -> CommunityException.notFound("전략을 찾을 수 없습니다."));
        ObjectNode snap = objectMapper.createObjectNode();
        snap.put("presetId", p.getId());
        snap.put("name", p.getName());
        snap.put("description", p.getDescription());
        snap.put("configHash", p.getConfigHash());
        snap.set("config", read(p.getConfig()));
        Double ret = null;
        Double mdd = null;
        String symbolKey = null;
        if (backtestRequestId != null && !backtestRequestId.isBlank()) {
            JsonNode bt = analysisResultCacheService.getAnalysisResult(backtestRequestId.trim()).map(this::read)
                    .orElseThrow(() -> CommunityException.badRequest("백테스트 결과를 찾을 수 없습니다 (결과는 24시간 보관)."));
            if (!"SUCCESS".equals(bt.path("status").asText()) || !bt.has("metrics")) {
                throw CommunityException.badRequest("완료된 백테스트 결과만 첨부할 수 있습니다.");
            }
            if (!p.getConfigHash().equals(bt.path("config").path("hash").asText())) {
                throw CommunityException.badRequest("이 전략(현재 설정)으로 실행한 백테스트가 아닙니다. 저장 후 다시 실행하세요.");
            }
            ObjectNode summary = objectMapper.createObjectNode();
            for (String k : List.of("market", "symbol", "name", "from", "to", "bars")) {
                summary.set(k, bt.get(k));
            }
            summary.set("metrics", pick(bt.path("metrics")));
            summary.set("benchmarkMetrics", pick(bt.path("benchmarkMetrics")));
            summary.put("requestId", backtestRequestId.trim());
            snap.set("backtest", summary);
            ret = bt.path("metrics").path("totalReturn").isNumber() ? bt.path("metrics").path("totalReturn").asDouble() : null;
            mdd = bt.path("metrics").path("mdd").isNumber() ? bt.path("metrics").path("mdd").asDouble() : null;
            symbolKey = bt.path("market").asText() + ":" + bt.path("symbol").asText();
        }
        return contentService.createAttachmentPost(new ContentDto.AttachmentPostCommand(email, ContentCategory.STRATEGY_SHARE,
                title, body, AttachmentType.STRATEGY, snap, symbolKey, ret, mdd));
    }

    /** 공유된 전략을 내 전략으로 복사 (이름이 겹치면 번호를 붙인다) */
    @Transactional
    public StrategyPresetDto.PresetInfo importStrategy(Long contentId, String email) {
        Content c = contentRepository.findByIdNotDeleted(contentId)
                .filter(ct -> ct.isVisibleTo(email) && ct.getAttachmentType() == AttachmentType.STRATEGY)
                .orElseThrow(() -> CommunityException.notFound("공유된 전략을 찾을 수 없습니다."));
        JsonNode snap = read(c.getAttachment());
        StrategyPresetDto.PresetInfo info = strategyPresetService.importPreset(email, snap.path("name").asText("가져온 전략"),
                snap.path("description").isNull() ? null : snap.path("description").asText(null), snap.path("config"), c.getId());
        c.increaseImportCount();
        events.publishEvent(new CommunityEvents.Imported(c.getId(), c.getAuthorEmail(), email, c.getTitle()));
        return info;
    }

    /** 일지 시장 구분(STOCK/CRYPTO)을 시세 키(MARKET:CODE)로 추정: 6자리 숫자는 국내, 그 외 주식은 미국 */
    static String symbolKey(MarketType market, String symbol) {
        if (symbol == null) {
            return null;
        }
        String code = symbol.trim().toUpperCase();
        return switch (market) {
            case CRYPTO -> "CRYPTO:" + (code.contains("-") ? code : "KRW-" + code);
            case STOCK -> (code.matches("\\d{6}") ? "KR_STOCK:" : "US_STOCK:") + code;
            default -> null;
        };
    }

    private String reasoningHtml(String reasoningJson) {
        if (reasoningJson == null || reasoningJson.isBlank()) {
            return "";
        }
        JsonNode node = read(reasoningJson);
        return node.path("markdown").asText("");
    }

    private ObjectNode pick(JsonNode metrics) {
        ObjectNode out = objectMapper.createObjectNode();
        for (String k : METRIC_KEYS) {
            if (metrics.has(k)) {
                out.set(k, metrics.get(k));
            }
        }
        return out;
    }

    private JsonNode read(String json) {
        try {
            return objectMapper.readTree(json);
        } catch (JsonProcessingException e) {
            throw CommunityException.badRequest("데이터 형식이 올바르지 않습니다.");
        }
    }
}
