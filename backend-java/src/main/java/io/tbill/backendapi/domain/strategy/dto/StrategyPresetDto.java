package io.tbill.backendapi.domain.strategy.dto;

import com.fasterxml.jackson.databind.JsonNode;

import java.time.LocalDateTime;

public class StrategyPresetDto {

    /** config 가 null 이면 기본 모델 설정으로 만든다 */
    public record CreateCommand(String userEmail, String name, String description, JsonNode config,
                                Long forkedFromPostId) {}

    public record UpdateCommand(Long id, String userEmail, String name, String description, JsonNode config) {}

    public record PresetInfo(Long id, String name, String description, JsonNode config, String configHash,
                             Long forkedFromPostId, LocalDateTime createdAt, LocalDateTime updatedAt) {}

    /** 분석 요청에 실을 설정 */
    public record ResolvedConfig(String name, String configHash, JsonNode config) {}
}
