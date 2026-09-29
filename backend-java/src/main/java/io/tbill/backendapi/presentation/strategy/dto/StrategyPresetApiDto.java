package io.tbill.backendapi.presentation.strategy.dto;

import com.fasterxml.jackson.databind.JsonNode;
import io.tbill.backendapi.domain.strategy.dto.StrategyPresetDto;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.time.LocalDateTime;

public class StrategyPresetApiDto {

    /** config: 전체 또는 기본값에서 바꿀 부분만. 생략하면 기본 모델 설정 */
    public record SaveRequest(
            @NotBlank(message = "이름은 필수입니다.") @Size(max = 50, message = "이름은 50자 이하여야 합니다.") String name,
            @Size(max = 500, message = "설명은 500자 이하여야 합니다.") String description,
            JsonNode config
    ) {
        public StrategyPresetDto.CreateCommand toCreateCommand(String userEmail) {
            return new StrategyPresetDto.CreateCommand(userEmail, name, description, config, null);
        }

        public StrategyPresetDto.UpdateCommand toUpdateCommand(Long id, String userEmail) {
            return new StrategyPresetDto.UpdateCommand(id, userEmail, name, description, config);
        }
    }

    public record PresetResponse(Long id, String name, String description, JsonNode config, String configHash,
                                 Long forkedFromPostId, LocalDateTime createdAt, LocalDateTime updatedAt) {
        public PresetResponse(StrategyPresetDto.PresetInfo info) {
            this(info.id(), info.name(), info.description(), info.config(), info.configHash(), info.forkedFromPostId(),
                    info.createdAt(), info.updatedAt());
        }
    }
}
