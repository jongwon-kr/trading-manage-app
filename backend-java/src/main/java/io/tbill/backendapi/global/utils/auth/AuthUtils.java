package io.tbill.backendapi.global.utils.auth;

import org.springframework.security.authentication.AuthenticationCredentialsNotFoundException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;

public class AuthUtils {

    /**
     * 현재 인증된 사용자의 이메일을 반환한다.
     * <p>
     * [수정] 이전 구현은 미인증 시 "anonymous@example.com" / "test@example.com" 을 반환했다.
     * 모든 컨트롤러가 이 값으로 데이터 소유권을 판단하므로, 인증 버그가 401 이 아니라
     * "가짜 사용자에게 귀속된 데이터"로 나타났다. 주문 기능이 생기면 같은 버그가
     * 돈을 가짜 사용자에게 귀속시킨다. 따라서 조용히 폴백하지 않고 예외를 던진다.
     *
     * @throws AuthenticationCredentialsNotFoundException 인증 정보가 없을 때
     */
    public static String getCurrentUserEmail() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();

        if (authentication == null || !authentication.isAuthenticated()) {
            throw new AuthenticationCredentialsNotFoundException("인증 정보가 없습니다.");
        }

        String name = authentication.getName();

        if (name == null || "anonymousUser".equals(name)) {
            throw new AuthenticationCredentialsNotFoundException("익명 사용자는 이 작업을 수행할 수 없습니다.");
        }

        return name;
    }

    /** 현재 사용자가 관리자(ROLE_ADMIN)인지. 인증 정보가 없으면 false */
    public static boolean isAdmin() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        return authentication != null && authentication.isAuthenticated()
                && authentication.getAuthorities().stream().anyMatch(a -> "ROLE_ADMIN".equals(a.getAuthority()));
    }
}
