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

    /** 분석·백테스트 요청용: 본인 프리셋의 설정 (없으면 404) */
    StrategyPresetDto.ResolvedConfig resolveConfig(Long id, String userEmail);
}
