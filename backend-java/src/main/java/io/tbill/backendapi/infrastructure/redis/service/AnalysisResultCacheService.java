package io.tbill.backendapi.infrastructure.redis.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.util.Optional;

@Slf4j
@Service
@RequiredArgsConstructor
public class AnalysisResultCacheService {

    private final RedisTemplate<String, String> redisTemplate;
    private final ObjectMapper objectMapper;

    private static final String ANALYSIS_KEY_PREFIX = "analysis:";
    private static final Duration DEFAULT_TTL = Duration.ofHours(1);

    /**
     * 분석 결과 저장
     */
    public void saveAnalysisResult(String requestId, Object result) {
        try {
            String key = ANALYSIS_KEY_PREFIX + requestId;
            String jsonValue = objectMapper.writeValueAsString(result);
            redisTemplate.opsForValue().set(key, jsonValue, DEFAULT_TTL);
            log.info("분석 결과 캐싱 완료: requestId={}", requestId);
        } catch (Exception e) {
            log.error("분석 결과 캐싱 실패: requestId={}", requestId, e);
        }
    }

    /**
     * 분석 결과 조회
     */
    public <T> Optional<T> getAnalysisResult(String requestId, Class<T> resultType) {
        try {
            String key = ANALYSIS_KEY_PREFIX + requestId;
            String jsonValue = redisTemplate.opsForValue().get(key);

            if (jsonValue == null) {
                return Optional.empty();
            }

            T result = objectMapper.readValue(jsonValue, resultType);
            return Optional.of(result);
        } catch (Exception e) {
            log.error("분석 결과 조회 실패: requestId={}", requestId, e);
            return Optional.empty();
        }
    }

    /**
     * 분석 결과 삭제
     */
    public void deleteAnalysisResult(String requestId) {
        String key = ANALYSIS_KEY_PREFIX + requestId;
        redisTemplate.delete(key);
        log.info("분석 결과 삭제 완료: requestId={}", requestId);
    }

    /**
     * 분석 결과 존재 여부 확인
     */
    public boolean existsAnalysisResult(String requestId) {
        String key = ANALYSIS_KEY_PREFIX + requestId;
        return Boolean.TRUE.equals(redisTemplate.hasKey(key));
    }
}
