package io.tbill.backendapi.domain.market.service;

import io.tbill.backendapi.global.exception.MarketException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.ValueOperations;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.util.Arrays;
import java.util.List;
import java.util.stream.IntStream;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class MarketStreamServiceTest {

    @Mock
    private StringRedisTemplate redisTemplate;
    @Mock
    private ValueOperations<String, String> valueOperations;

    private MarketStreamService service;

    @BeforeEach
    void setUp() {
        lenient().when(redisTemplate.opsForValue()).thenReturn(valueOperations);
        lenient().when(valueOperations.multiGet(anyList())).thenReturn(Arrays.asList("{\"code\":\"KRW-BTC\"}", null));
        service = new MarketStreamService(redisTemplate);
    }

    @Test
    @DisplayName("구독하면 키별 구독자로 등록되고 스냅샷을 조회한다")
    void subscribe() {
        SseEmitter emitter = service.subscribe(List.of("CRYPTO:KRW-BTC", " CRYPTO:KRW-ETH", "CRYPTO:KRW-BTC"));

        assertThat(emitter).isNotNull();
        assertThat(service.connectionCount()).isEqualTo(1);
        assertThat(service.subscriberCount("CRYPTO:KRW-BTC")).isEqualTo(1);
        assertThat(service.subscriberCount("CRYPTO:KRW-ETH")).isEqualTo(1);
    }

    @Test
    @DisplayName("코인이 아닌 키·잘못된 형식·개수 초과는 400")
    void validation() {
        assertThatThrownBy(() -> service.subscribe(List.of("KR_STOCK:005930"))).isInstanceOf(MarketException.class);
        assertThatThrownBy(() -> service.subscribe(List.of("CRYPTO:krw-btc;drop"))).isInstanceOf(MarketException.class);
        assertThatThrownBy(() -> service.subscribe(List.of(" "))).isInstanceOf(MarketException.class);
        List<String> tooMany = IntStream.range(0, 31).mapToObj(i -> "CRYPTO:KRW-C" + i).toList();
        assertThatThrownBy(() -> service.subscribe(tooMany)).isInstanceOf(MarketException.class);
        assertThat(service.connectionCount()).isZero();
    }

    @Test
    @DisplayName("전송에 실패한(끊긴) 연결은 publish 시 정리된다")
    void deadEmitterRemovedOnPublish() {
        SseEmitter emitter = service.subscribe(List.of("CRYPTO:KRW-BTC"));
        emitter.complete(); // 연결 종료 → 이후 send 는 예외

        service.publish("CRYPTO:KRW-BTC", "{\"price\":1}");

        assertThat(service.connectionCount()).isZero();
        assertThat(service.subscriberCount("CRYPTO:KRW-BTC")).isZero();
    }

    @Test
    @DisplayName("구독자가 없는 키의 publish 는 무시")
    void publishWithoutSubscribers() {
        service.publish("CRYPTO:KRW-XRP", "{}");
        assertThat(service.connectionCount()).isZero();
    }

    @Test
    @DisplayName("Redis 장애 시에도 빈 스냅샷으로 구독은 성공")
    void snapshotFailureTolerated() {
        when(valueOperations.multiGet(anyList())).thenThrow(new RuntimeException("redis down"));
        assertThat(service.subscribe(List.of("CRYPTO:KRW-BTC"))).isNotNull();
    }
}
