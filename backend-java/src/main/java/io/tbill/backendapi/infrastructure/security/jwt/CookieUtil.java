package io.tbill.backendapi.infrastructure.security.jwt;

import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.util.Optional;

@Component
public class CookieUtil {

    // [삭제] public static final String ACCESS_TOKEN_COOKIE_NAME = "access_token";
    public static final String REFRESH_TOKEN_COOKIE_NAME = "refresh_token";

    @Value("${spring.profiles.active:local}")
    private String activeProfile;

    // [삭제] Access Token 쿠키 생성 헬퍼 삭제
    /*
    public void createAccessTokenCookie(HttpServletResponse response, String accessToken, long maxAgeSeconds) {
        createCookie(response, ACCESS_TOKEN_COOKIE_NAME, accessToken, maxAgeSeconds);
    }
    */

    /**
     * [유지] Refresh Token 쿠키 생성
     */
    public void createRefreshTokenCookie(HttpServletResponse response, String refreshToken, long maxAgeSeconds) {
        createCookie(response, REFRESH_TOKEN_COOKIE_NAME, refreshToken, maxAgeSeconds);
    }

    /**
     * [수정] 공통 쿠키 생성 헬퍼
     * 'heroes' 프로젝트 방식(수동 헤더 구성)으로 SameSite=None 적용
     */
    private void createCookie(HttpServletResponse response, String name, String value, long maxAgeSeconds) {

        // 1. 헤더 문자열 생성
        StringBuilder cookieValue = new StringBuilder();
        cookieValue.append(name).append("=").append(value != null ? value : "");
        cookieValue.append("; Path=/");
        cookieValue.append("; HttpOnly");
        cookieValue.append("; Secure"); // SameSite=None을 위해 필수
        cookieValue.append("; SameSite=None");

        // 2. Max-Age 설정 (쿠키 삭제 시 0, 생성 시 양수)
        cookieValue.append("; Max-Age=").append(maxAgeSeconds);

        // 3. 응답 헤더에 "Set-Cookie"로 직접 추가
        response.addHeader("Set-Cookie", cookieValue.toString());
    }

    // [삭제] Access Token 쿠키 읽기 헬퍼 삭제
    /*
    public Optional<String> getAccessToken(HttpServletRequest request) {
        return getCookieValue(request, ACCESS_TOKEN_COOKIE_NAME);
    }
    */

    /**
     * [유지] Refresh Token 쿠키 읽기
     */
    public Optional<String> getRefreshToken(HttpServletRequest request) {
        return getCookieValue(request, REFRESH_TOKEN_COOKIE_NAME);
    }

    /**
     * [유지] 공통 쿠키 조회 헬퍼
     */
    private Optional<String> getCookieValue(HttpServletRequest request, String name) {
        Cookie[] cookies = request.getCookies();
        if (cookies != null) {
            for (Cookie cookie : cookies) {
                if (name.equals(cookie.getName())) {
                    return Optional.of(cookie.getValue());
                }
            }
        }
        return Optional.empty();
    }

    // [삭제] Access Token 쿠키 삭제 헬퍼 삭제
    /*
    public void deleteAccessTokenCookie(HttpServletResponse response) {
        createCookie(response, ACCESS_TOKEN_COOKIE_NAME, null, 0);
    }
    */

    /**
     * [유지] Refresh Token 쿠키 삭제
     */
    public void deleteRefreshTokenCookie(HttpServletResponse response) {
        createCookie(response, REFRESH_TOKEN_COOKIE_NAME, null, 0);
    }
}