package io.tbill.backendapi.global.utils.auth;

import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;

/**
 * Spring Security 컨텍스트에서 인증된 사용자 정보를 가져오는 유틸리티 클래스
 */
public final class AuthUtils { // final: 상속 금지

    // private: 인스턴스화 방지
    private AuthUtils() {
    }

    /**
     * 현재 인증된 사용자의 이메일(Principal.name)을 반환합니다.
     *
     * @return 인증된 사용자의 이메일
     * @throws RuntimeException 인증 정보가 없거나, 익명 사용자인 경우
     */
    public static String getCurrentUserEmail() {
        // 1. SecurityContext에서 Authentication 객체를 가져옵니다.
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();

        // 2. 인증 정보가 없거나, 인증되지 않은 경우 (예: 익명 사용자)
        if (authentication == null || !authentication.isAuthenticated() || authentication.getName() == null) {
            throw new RuntimeException("Security Context에 인증 정보가 없습니다.");
        }

        // 3. CustomUserDetailsService에서 반환한 '이메일'을 반환합니다.
        // (참고) getName()이 "anonymousUser"를 반환하는 경우는
        // @PreAuthorize("isAuthenticated()") 어노테이션에 의해 먼저 차단됩니다.
        return authentication.getName();
    }
}