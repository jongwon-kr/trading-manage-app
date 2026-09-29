package io.tbill.backendapi.presentation.strategy.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import io.tbill.backendapi.domain.strategy.service.StrategyPresetService;
import io.tbill.backendapi.global.utils.auth.AuthUtils;
import io.tbill.backendapi.presentation.strategy.dto.StrategyPresetApiDto;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Tag(name = "Strategy", description = "사용자 전략(분석 방법) 프리셋 API")
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/strategies")
public class StrategyPresetController {

    private final StrategyPresetService strategyPresetService;

    @Operation(summary = "내 전략 목록")
    @GetMapping
    public ResponseEntity<List<StrategyPresetApiDto.PresetResponse>> getPresets() {
        return ResponseEntity.ok(strategyPresetService.getPresets(AuthUtils.getCurrentUserEmail()).stream()
                .map(StrategyPresetApiDto.PresetResponse::new).toList());
    }

    @Operation(summary = "전략 상세")
    @GetMapping("/{id}")
    public ResponseEntity<StrategyPresetApiDto.PresetResponse> getPreset(@PathVariable Long id) {
        return ResponseEntity.ok(new StrategyPresetApiDto.PresetResponse(
                strategyPresetService.getPreset(id, AuthUtils.getCurrentUserEmail())));
    }

    @Operation(summary = "전략 만들기",
            description = "설정은 Python 모델이 검증한다. 잘못되면 400 + errors[{path,msg}], 이름 중복 409, 최대 30개")
    @PostMapping
    public ResponseEntity<StrategyPresetApiDto.PresetResponse> createPreset(
            @Valid @RequestBody StrategyPresetApiDto.SaveRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(new StrategyPresetApiDto.PresetResponse(
                strategyPresetService.createPreset(request.toCreateCommand(AuthUtils.getCurrentUserEmail()))));
    }

    @Operation(summary = "전략 수정")
    @PutMapping("/{id}")
    public ResponseEntity<StrategyPresetApiDto.PresetResponse> updatePreset(
            @PathVariable Long id, @Valid @RequestBody StrategyPresetApiDto.SaveRequest request) {
        return ResponseEntity.ok(new StrategyPresetApiDto.PresetResponse(
                strategyPresetService.updatePreset(request.toUpdateCommand(id, AuthUtils.getCurrentUserEmail()))));
    }

    @Operation(summary = "전략 삭제")
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deletePreset(@PathVariable Long id) {
        strategyPresetService.deletePreset(id, AuthUtils.getCurrentUserEmail());
        return ResponseEntity.noContent().build();
    }

    @Operation(summary = "전략 복제")
    @PostMapping("/{id}/duplicate")
    public ResponseEntity<StrategyPresetApiDto.PresetResponse> duplicatePreset(@PathVariable Long id) {
        return ResponseEntity.status(HttpStatus.CREATED).body(new StrategyPresetApiDto.PresetResponse(
                strategyPresetService.duplicatePreset(id, AuthUtils.getCurrentUserEmail())));
    }
}
