package io.tbill.backendapi.infrastructure.security.service;

import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.util.Optional;
import java.util.concurrent.TimeUnit;

@Service
@RequiredArgsConstructor
public class RefreshTokenService {

    private final StringRedisTemplate stringRedisTemplate;

    @Value("${jwt.refresh-token-expiration-ms}")
    private long refreshTokenExpirationMs;

    private static final String REFRESH_TOKEN_PREFIX = "rt:";

    /**
     * Refresh Token 저장 (Key: "rt:email", Value: "token")
     */
    public void saveToken(String email, String refreshToken) {
        String key = REFRESH_TOKEN_PREFIX + email;
        stringRedisTemplate.opsForValue().set(key, refreshToken, refreshTokenExpirationMs, TimeUnit.MILLISECONDS);
    }

    /**
     * Refresh Token 조회
     */
    public Optional<String> getToken(String email) {
        String key = REFRESH_TOKEN_PREFIX + email;
        String token = stringRedisTemplate.opsForValue().get(key);
        return Optional.ofNullable(token);
    }

    /**
     * Refresh Token 삭제
     */
    public void deleteToken(String email) {
        String key = REFRESH_TOKEN_PREFIX + email;
        stringRedisTemplate.delete(key);
    }
}