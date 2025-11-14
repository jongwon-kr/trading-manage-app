package io.tbill.backendapi.infrastructure.redis.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.util.Optional;

@Slf4j
@Service
@RequiredArgsConstructor
public class AnalysisResultCacheService {

    // RedisConfig에 의해 자동 구성됨
    private final StringRedisTemplate stringRedisTemplate;

    // Python의 redis_service.py와 키 형식을 일치시켜야 함
    private static final String KEY_PREFIX = "analysis:";

    /**
     * Redis에서 분석 결과(JSON 문자열)를 조회
     *
     * @param requestId 조회할 요청 ID
     * @return 결과가 있으면 JSON 문자열을, 없으면 Optional.empty() 반환
     */
    public Optional<String> getAnalysisResult(String requestId) {
        String key = KEY_PREFIX + requestId;
        try {
            String resultJson = stringRedisTemplate.opsForValue().get(key);
            return Optional.ofNullable(resultJson);

        } catch (Exception e) {
            log.error("Redis 조회 중 오류 발생: key={}, error={}", key, e.getMessage());
            return Optional.empty();
        }
    }
}