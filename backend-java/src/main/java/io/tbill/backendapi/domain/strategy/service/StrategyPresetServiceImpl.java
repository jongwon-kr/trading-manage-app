package io.tbill.backendapi.domain.strategy.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.tbill.backendapi.domain.strategy.dto.StrategyPresetDto;
import io.tbill.backendapi.domain.strategy.entity.StrategyPreset;
import io.tbill.backendapi.domain.strategy.repository.StrategyPresetRepository;
import io.tbill.backendapi.global.exception.MarketException;
import io.tbill.backendapi.infrastructure.client.python.PythonMarketClient;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * 전략 프리셋. 설정 검증·정규화는 Python(/internal/v1/analysis/config/validate)이 맡는다 —
 * 카탈로그(팩터·밴드·파라미터 범위)의 단일 출처가 Python 이기 때문.
 */
@Slf4j
@Service
@Transactional(readOnly = true)
@RequiredArgsConstructor
public class StrategyPresetServiceImpl implements StrategyPresetService {

    static final int MAX_PRESETS = 30;

    private final StrategyPresetRepository strategyPresetRepository;
    private final PythonMarketClient pythonMarketClient;
    private final ObjectMapper objectMapper;

    @Override
    public List<StrategyPresetDto.PresetInfo> getPresets(String userEmail) {
        return strategyPresetRepository.findByUserEmailOrderByUpdatedAtDesc(userEmail).stream().map(this::toInfo).toList();
    }

    @Override
    public StrategyPresetDto.PresetInfo getPreset(Long id, String userEmail) {
        return toInfo(find(id, userEmail));
    }

    @Override
    @Transactional
    public StrategyPresetDto.PresetInfo createPreset(StrategyPresetDto.CreateCommand command) {
        String email = command.userEmail();
        checkLimit(email);
        String name = command.name().trim();
        if (strategyPresetRepository.existsByUserEmailAndName(email, name)) {
            throw duplicateName();
        }
        JsonNode validated = validate(command.config());
        StrategyPreset saved = strategyPresetRepository.save(StrategyPreset.builder()
                .userEmail(email)
                .name(name)
                .description(blankToNull(command.description()))
                .config(validated.get("config").toString())
                .configHash(validated.get("hash").asText())
                .forkedFromPostId(command.forkedFromPostId())
                .build());
        log.info("전략 프리셋 생성: user={}, id={}, hash={}", email, saved.getId(), saved.getConfigHash());
        return toInfo(saved);
    }

    @Override
    @Transactional
    public StrategyPresetDto.PresetInfo updatePreset(StrategyPresetDto.UpdateCommand command) {
        StrategyPreset preset = find(command.id(), command.userEmail());
        String name = command.name().trim();
        if (strategyPresetRepository.existsByUserEmailAndNameAndIdNot(command.userEmail(), name, preset.getId())) {
            throw duplicateName();
        }
        JsonNode validated = validate(command.config());
        preset.update(name, blankToNull(command.description()), validated.get("config").toString(),
                validated.get("hash").asText());
        return toInfo(preset);
    }

    @Override
    @Transactional
    public void deletePreset(Long id, String userEmail) {
        strategyPresetRepository.delete(find(id, userEmail));
    }

    @Override
    @Transactional
    public StrategyPresetDto.PresetInfo duplicatePreset(Long id, String userEmail) {
        StrategyPreset source = find(id, userEmail);
        checkLimit(userEmail);
        StrategyPreset copy = strategyPresetRepository.save(StrategyPreset.builder()
                .userEmail(userEmail)
                .name(uniqueName(userEmail, source.getName() + " (복사)"))
                .description(source.getDescription())
                .config(source.getConfig())
                .configHash(source.getConfigHash())
                .forkedFromPostId(source.getForkedFromPostId())
                .build());
        return toInfo(copy);
    }

    @Override
    @Transactional
    public StrategyPresetDto.PresetInfo importPreset(String userEmail, String name, String description, JsonNode config,
                                                     Long forkedFromPostId) {
        checkLimit(userEmail);
        JsonNode validated = validate(config);
        StrategyPreset saved = strategyPresetRepository.save(StrategyPreset.builder()
                .userEmail(userEmail)
                .name(uniqueName(userEmail, name == null || name.isBlank() ? "가져온 전략" : name.trim()))
                .description(blankToNull(description))
                .config(validated.get("config").toString())
                .configHash(validated.get("hash").asText())
                .forkedFromPostId(forkedFromPostId)
                .build());
        log.info("전략 가져오기: user={}, post={}, preset={}", userEmail, forkedFromPostId, saved.getId());
        return toInfo(saved);
    }

    @Override
    public StrategyPresetDto.ResolvedConfig resolveConfig(Long id, String userEmail) {
        StrategyPreset preset = find(id, userEmail);
        return new StrategyPresetDto.ResolvedConfig(preset.getName(), preset.getConfigHash(), parse(preset.getConfig()));
    }

    /** 같은 이름이 있으면 " 2", " 3" … 을 붙인다 (50자 제한 안에서) */
    String uniqueName(String userEmail, String base) {
        String trimmed = base.length() > 45 ? base.substring(0, 45) : base;
        String name = trimmed;
        for (int i = 2; strategyPresetRepository.existsByUserEmailAndName(userEmail, name); i++) {
            name = trimmed + " " + i;
        }
        return name;
    }

    private void checkLimit(String userEmail) {
        if (strategyPresetRepository.countByUserEmail(userEmail) >= MAX_PRESETS) {
            throw MarketException.badRequest("전략은 최대 " + MAX_PRESETS + "개까지 만들 수 있습니다.");
        }
    }

    private JsonNode validate(JsonNode config) {
        return pythonMarketClient.validateStrategyConfig(config == null || config.isNull()
                ? objectMapper.createObjectNode() : config);
    }

    private StrategyPreset find(Long id, String userEmail) {
        return strategyPresetRepository.findByIdAndUserEmail(id, userEmail)
                .orElseThrow(() -> new MarketException("STRATEGY_PRESET_NOT_FOUND", HttpStatus.NOT_FOUND,
                        "전략을 찾을 수 없습니다."));
    }

    private static MarketException duplicateName() {
        return new MarketException("STRATEGY_PRESET_DUPLICATE", HttpStatus.CONFLICT, "같은 이름의 전략이 이미 있습니다.");
    }

    private static String blankToNull(String s) {
        return s == null || s.isBlank() ? null : s.trim();
    }

    private JsonNode parse(String json) {
        try {
            return objectMapper.readTree(json);
        } catch (JsonProcessingException e) {
            throw new IllegalStateException("저장된 전략 설정을 읽을 수 없습니다.", e);
        }
    }

    private StrategyPresetDto.PresetInfo toInfo(StrategyPreset p) {
        return new StrategyPresetDto.PresetInfo(p.getId(), p.getName(), p.getDescription(), parse(p.getConfig()),
                p.getConfigHash(), p.getForkedFromPostId(), p.getCreatedAt(), p.getUpdatedAt());
    }
}
