package io.tbill.backendapi.domain.strategy.service;

import io.tbill.backendapi.domain.strategy.dto.StrategyPresetDto;

import java.util.List;

public interface StrategyPresetService {

    List<StrategyPresetDto.PresetInfo> getPresets(String userEmail);

    StrategyPresetDto.PresetInfo getPreset(Long id, String userEmail);

    StrategyPresetDto.PresetInfo createPreset(StrategyPresetDto.CreateCommand command);

    StrategyPresetDto.PresetInfo updatePreset(StrategyPresetDto.UpdateCommand command);

    void deletePreset(Long id, String userEmail);

    StrategyPresetDto.PresetInfo duplicatePreset(Long id, String userEmail);

    /** 커뮤니티에서 가져온 전략을 내 전략으로 저장 (이름 중복 시 번호, 설정은 다시 검증) */
    StrategyPresetDto.PresetInfo importPreset(String userEmail, String name, String description,
                                              com.fasterxml.jackson.databind.JsonNode config, Long forkedFromPostId);

    /** 분석·백테스트 요청용: 본인 프리셋의 설정 (없으면 404) */
    StrategyPresetDto.ResolvedConfig resolveConfig(Long id, String userEmail);
}
