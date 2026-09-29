package io.tbill.backendapi.domain.strategy.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.tbill.backendapi.domain.strategy.dto.StrategyPresetDto;
import io.tbill.backendapi.domain.strategy.entity.StrategyPreset;
import io.tbill.backendapi.domain.strategy.repository.StrategyPresetRepository;
import io.tbill.backendapi.global.exception.MarketException;
import io.tbill.backendapi.infrastructure.client.python.PythonMarketClient;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class StrategyPresetServiceImplTest {

    private static final String EMAIL = "a@b.c";

    @Mock
    private StrategyPresetRepository repository;
    @Mock
    private PythonMarketClient pythonMarketClient;

    private final ObjectMapper objectMapper = new ObjectMapper();
    private StrategyPresetServiceImpl service;

    @BeforeEach
    void setUp() {
        service = new StrategyPresetServiceImpl(repository, pythonMarketClient, objectMapper);
    }

    private JsonNode json(String s) throws Exception {
        return objectMapper.readTree(s);
    }

    private StrategyPreset preset(long id, String name) {
        StrategyPreset p = StrategyPreset.builder().userEmail(EMAIL).name(name).config("{\"a\":1}").configHash("h1").build();
        ReflectionTestUtils.setField(p, "id", id);
        return p;
    }

    @Test
    @DisplayName("생성: Python 이 정규화한 전체 설정과 해시를 저장한다")
    void createStoresNormalizedConfig() throws Exception {
        JsonNode partial = json("{\"factors\":{\"rsi\":{\"weight\":0.5}}}");
        when(repository.countByUserEmail(EMAIL)).thenReturn(0L);
        when(repository.existsByUserEmailAndName(EMAIL, "내 전략")).thenReturn(false);
        when(pythonMarketClient.validateStrategyConfig(partial))
                .thenReturn(json("{\"config\":{\"factors\":{\"rsi\":{\"weight\":0.5,\"enabled\":true}}},\"hash\":\"abc123\"}"));
        when(repository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        var info = service.createPreset(new StrategyPresetDto.CreateCommand(EMAIL, " 내 전략 ", " ", partial, null));

        ArgumentCaptor<StrategyPreset> captor = ArgumentCaptor.forClass(StrategyPreset.class);
        verify(repository).save(captor.capture());
        assertThat(captor.getValue().getName()).isEqualTo("내 전략");
        assertThat(captor.getValue().getDescription()).isNull();
        assertThat(captor.getValue().getConfigHash()).isEqualTo("abc123");
        assertThat(info.config().at("/factors/rsi/enabled").asBoolean()).isTrue();
    }

    @Test
    @DisplayName("생성: 설정이 없으면 빈 객체(기본 모델)로 검증한다")
    void createWithoutConfigUsesDefault() throws Exception {
        when(repository.countByUserEmail(EMAIL)).thenReturn(0L);
        when(pythonMarketClient.validateStrategyConfig(any())).thenReturn(json("{\"config\":{},\"hash\":\"d\"}"));
        when(repository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        service.createPreset(new StrategyPresetDto.CreateCommand(EMAIL, "기본", null, null, null));

        verify(pythonMarketClient).validateStrategyConfig(objectMapper.createObjectNode());
    }

    @Test
    @DisplayName("생성: 이름 중복 409, 개수 제한 400, 검증 실패는 Python 오류 그대로")
    void createErrors() throws Exception {
        when(repository.countByUserEmail(EMAIL)).thenReturn(30L);
        assertThatThrownBy(() -> service.createPreset(new StrategyPresetDto.CreateCommand(EMAIL, "x", null, null, null)))
                .isInstanceOf(MarketException.class).extracting("status").isEqualTo(HttpStatus.BAD_REQUEST);

        when(repository.countByUserEmail(EMAIL)).thenReturn(1L);
        when(repository.existsByUserEmailAndName(EMAIL, "dup")).thenReturn(true);
        assertThatThrownBy(() -> service.createPreset(new StrategyPresetDto.CreateCommand(EMAIL, "dup", null, null, null)))
                .isInstanceOf(MarketException.class).extracting("status").isEqualTo(HttpStatus.CONFLICT);

        JsonNode bad = json("{\"signal\":{\"buy\":10}}");
        when(pythonMarketClient.validateStrategyConfig(bad)).thenThrow(new MarketException(
                "STRATEGY_CONFIG_INVALID", HttpStatus.BAD_REQUEST, "전략 설정 오류", json("[{\"path\":\"signal\"}]")));
        assertThatThrownBy(() -> service.createPreset(new StrategyPresetDto.CreateCommand(EMAIL, "ok", null, bad, null)))
                .isInstanceOf(MarketException.class)
                .satisfies(e -> assertThat(((MarketException) e).getErrors().get(0).get("path").asText()).isEqualTo("signal"));
        verify(repository, never()).save(any());
    }

    @Test
    @DisplayName("다른 사용자의 프리셋은 조회·수정·분석 모두 404")
    void notOwnerIsNotFound() {
        when(repository.findByIdAndUserEmail(9L, EMAIL)).thenReturn(Optional.empty());
        assertThatThrownBy(() -> service.getPreset(9L, EMAIL))
                .isInstanceOf(MarketException.class).extracting("status").isEqualTo(HttpStatus.NOT_FOUND);
        assertThatThrownBy(() -> service.resolveConfig(9L, EMAIL)).isInstanceOf(MarketException.class);
        assertThatThrownBy(() -> service.updatePreset(new StrategyPresetDto.UpdateCommand(9L, EMAIL, "n", null, null)))
                .isInstanceOf(MarketException.class);
    }

    @Test
    @DisplayName("수정: 자기 자신 외 같은 이름이 있으면 409, 아니면 설정·해시 갱신")
    void update() throws Exception {
        StrategyPreset p = preset(1L, "old");
        when(repository.findByIdAndUserEmail(1L, EMAIL)).thenReturn(Optional.of(p));
        when(repository.existsByUserEmailAndNameAndIdNot(EMAIL, "new", 1L)).thenReturn(false);
        when(pythonMarketClient.validateStrategyConfig(any())).thenReturn(json("{\"config\":{\"b\":2},\"hash\":\"h2\"}"));

        var info = service.updatePreset(new StrategyPresetDto.UpdateCommand(1L, EMAIL, "new", "설명", json("{\"b\":2}")));

        assertThat(info.name()).isEqualTo("new");
        assertThat(p.getConfigHash()).isEqualTo("h2");
        assertThat(info.config().get("b").asInt()).isEqualTo(2);
    }

    @Test
    @DisplayName("복제: 이름 뒤에 (복사)를 붙이고 겹치면 번호를 붙인다")
    void duplicate() {
        when(repository.findByIdAndUserEmail(1L, EMAIL)).thenReturn(Optional.of(preset(1L, "추세")));
        when(repository.countByUserEmail(EMAIL)).thenReturn(2L);
        when(repository.existsByUserEmailAndName(EMAIL, "추세 (복사)")).thenReturn(true);
        when(repository.existsByUserEmailAndName(EMAIL, "추세 (복사) 2")).thenReturn(false);
        when(repository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        var info = service.duplicatePreset(1L, EMAIL);

        assertThat(info.name()).isEqualTo("추세 (복사) 2");
        assertThat(info.configHash()).isEqualTo("h1");
    }

    @Test
    @DisplayName("분석용 설정 조회: 이름·해시·설정 JSON")
    void resolve() {
        when(repository.findByIdAndUserEmail(1L, EMAIL)).thenReturn(Optional.of(preset(1L, "추세")));
        var r = service.resolveConfig(1L, EMAIL);
        assertThat(r.name()).isEqualTo("추세");
        assertThat(r.config().get("a").asInt()).isEqualTo(1);
    }
}
