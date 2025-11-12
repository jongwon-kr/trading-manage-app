package io.tbill.backendapi.infrastructure.security.jwt;

import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value; // [추가]
import org.springframework.stereotype.Component;

import java.util.Optional;

@Component
public class CookieUtil {

    public static final String REFRESH_TOKEN_COOKIE_NAME = "refresh_token";

    // 기본값을 "local"로 설정합니다.
    @Value("${spring.profiles.active:local}")
    private String activeProfile;

    /**
     * HttpOnly, Secure 속성을 가진 Refresh Token 쿠키 생성
     */
    public void createRefreshTokenCookie(HttpServletResponse response, String refreshToken, long maxAgeSeconds) {
        Cookie cookie = new Cookie(REFRESH_TOKEN_COOKIE_NAME, refreshToken);
        cookie.setHttpOnly(true);

        // 로컬(http) 환경에서는 Secure 쿠키가 저장되지 않습니다.
        if ("prod".equals(activeProfile)) {
            cookie.setSecure(true);
        }

        cookie.setPath("/"); // 전역 경로
        cookie.setMaxAge((int) maxAgeSeconds);
        // (운영) cookie.setDomain("your-domain.com");
        response.addCookie(cookie);
    }

    /**
     * 요청에서 Refresh Token 쿠키 읽기
     */
    public Optional<String> getRefreshToken(HttpServletRequest request) {
        Cookie[] cookies = request.getCookies();
        if (cookies != null) {
            for (Cookie cookie : cookies) {
                if (REFRESH_TOKEN_COOKIE_NAME.equals(cookie.getName())) {
                    return Optional.of(cookie.getValue());
                }
            }
        }
        return Optional.empty();
    }

    /**
     * 쿠키 삭제
     */
    public void deleteRefreshTokenCookie(HttpServletResponse response) {
        createRefreshTokenCookie(response, null, 0); // MaxAge를 0으로 설정
    }
}