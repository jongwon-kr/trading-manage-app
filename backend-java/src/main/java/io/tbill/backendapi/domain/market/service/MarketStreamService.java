package io.tbill.backendapi.domain.market.service;

import io.tbill.backendapi.global.exception.MarketException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.http.MediaType;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

/**
 * 코인 실시간 시세 SSE 허브.
 * backend-python 스트리머가 Redis 에 PUBLISH market:tick:{key} 한 tick 을 구독 중인 브라우저로 전달한다.
 * 이벤트: snapshot(연결 직후 현재 시세 배열), tick(종목별 시세, 종목당 최대 1회/초), 주석 heartbeat(15초)
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class MarketStreamService {

    static final int MAX_KEYS_PER_CONNECTION = 30;
    static final int MAX_CONNECTIONS = 1000;
    static final long TIMEOUT_MS = 30 * 60 * 1000L; // 만료 시 EventSource 가 자동 재연결
    private static final Pattern CRYPTO_KEY = Pattern.compile("^CRYPTO:KRW-[A-Z0-9]{1,20}$");

    private final StringRedisTemplate redisTemplate;

    private final Map<String, Set<SseEmitter>> subscribersByKey = new ConcurrentHashMap<>();
    private final Map<SseEmitter, List<String>> keysByEmitter = new ConcurrentHashMap<>();

    public SseEmitter subscribe(List<String> rawKeys) {
        List<String> keys = rawKeys.stream().map(String::trim).filter(k -> !k.isEmpty()).distinct().toList();
        if (keys.isEmpty() || keys.size() > MAX_KEYS_PER_CONNECTION) {
            throw MarketException.badRequest("구독 종목은 1~" + MAX_KEYS_PER_CONNECTION + "개여야 합니다.");
        }
        List<String> invalid = keys.stream().filter(k -> !CRYPTO_KEY.matcher(k).matches()).toList();
        if (!invalid.isEmpty()) {
            throw MarketException.badRequest("실시간 시세는 암호화폐(CRYPTO:KRW-*)만 지원합니다: " + invalid);
        }
        if (keysByEmitter.size() >= MAX_CONNECTIONS) {
            throw MarketException.unavailable("실시간 연결 수가 한도를 초과했습니다.");
        }

        SseEmitter emitter = new SseEmitter(TIMEOUT_MS);
        emitter.onCompletion(() -> remove(emitter));
        emitter.onTimeout(() -> remove(emitter));
        emitter.onError(e -> remove(emitter));

        keysByEmitter.put(emitter, keys);
        keys.forEach(k -> subscribersByKey.computeIfAbsent(k, x -> ConcurrentHashMap.newKeySet()).add(emitter));

        send(emitter, "snapshot", snapshotJson(keys));
        return emitter;
    }

    /** Redis 구독 스레드에서 호출된다. key 예: CRYPTO:KRW-BTC */
    public void publish(String key, String quoteJson) {
        Set<SseEmitter> emitters = subscribersByKey.get(key);
        if (emitters == null) {
            return;
        }
        emitters.forEach(e -> send(e, "tick", quoteJson));
    }

    /** 프록시·브라우저의 유휴 연결 종료를 막고 끊긴 연결을 정리한다 */
    @Scheduled(fixedRate = 15_000)
    public void heartbeat() {
        keysByEmitter.keySet().forEach(e -> {
            try {
                synchronized (e) {
                    e.send(SseEmitter.event().comment("hb"));
                }
            } catch (Exception ex) {
                remove(e);
            }
        });
    }

    int connectionCount() {
        return keysByEmitter.size();
    }

    int subscriberCount(String key) {
        Set<SseEmitter> set = subscribersByKey.get(key);
        return set == null ? 0 : set.size();
    }

    private String snapshotJson(List<String> keys) {
        try {
            List<String> values = redisTemplate.opsForValue().multiGet(keys.stream().map(k -> "quote:" + k).toList());
            if (values == null) {
                return "[]";
            }
            return values.stream().filter(Objects::nonNull).collect(Collectors.joining(",", "[", "]"));
        } catch (Exception e) {
            log.warn("실시간 시세 스냅샷 조회 실패: {}", e.getMessage());
            return "[]";
        }
    }

    private void send(SseEmitter emitter, String event, String json) {
        try {
            // SseEmitter 는 스레드 안전하지 않다 (Redis 구독 스레드·heartbeat 스케줄러가 동시에 보낼 수 있음)
            synchronized (emitter) {
                emitter.send(SseEmitter.event().name(event).data(json, MediaType.APPLICATION_JSON));
            }
        } catch (Exception e) {
            // 클라이언트가 끊긴 경우 — 정리만 하고 조용히 넘어간다
            remove(emitter);
        }
    }

    private void remove(SseEmitter emitter) {
        List<String> keys = keysByEmitter.remove(emitter);
        if (keys == null) {
            return;
        }
        keys.forEach(k -> subscribersByKey.computeIfPresent(k, (x, set) -> {
            set.remove(emitter);
            return set.isEmpty() ? null : set;
        }));
    }
}
