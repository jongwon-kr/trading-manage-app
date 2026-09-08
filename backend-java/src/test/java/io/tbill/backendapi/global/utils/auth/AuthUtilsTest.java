package io.tbill.backendapi.global.utils.auth;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.authentication.AuthenticationCredentialsNotFoundException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.AuthorityUtils;
import org.springframework.security.core.context.SecurityContextHolder;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * AuthUtils 는 모든 컨트롤러가 데이터 소유권을 판단하는 근거이므로,
 * 미인증 상태에서 조용히 가짜 이메일을 반환하지 않는지 고정한다.
 */
class AuthUtilsTest {

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    @Test
    @DisplayName("SecurityContext 가 비어 있으면 예외를 던진다")
    void throwsWhenContextEmpty() {
        SecurityContextHolder.clearContext();

        assertThatThrownBy(AuthUtils::getCurrentUserEmail)
                .isInstanceOf(AuthenticationCredentialsNotFoundException.class);
    }

    @Test
    @DisplayName("익명 사용자면 예외를 던진다 (test@example.com 을 반환하지 않는다)")
    void throwsWhenAnonymous() {
        SecurityContextHolder.getContext().setAuthentication(
                new AnonymousAuthenticationToken(
                        "key", "anonymousUser",
                        AuthorityUtils.createAuthorityList("ROLE_ANONYMOUS")
                )
        );

        assertThatThrownBy(AuthUtils::getCurrentUserEmail)
                .isInstanceOf(AuthenticationCredentialsNotFoundException.class);
    }

    @Test
    @DisplayName("인증되지 않은 토큰이면 예외를 던진다")
    void throwsWhenNotAuthenticated() {
        // 자격증명 2-인자 생성자는 isAuthenticated() == false 인 토큰을 만든다
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken("user@example.com", "password")
        );

        assertThatThrownBy(AuthUtils::getCurrentUserEmail)
                .isInstanceOf(AuthenticationCredentialsNotFoundException.class);
    }

    @Test
    @DisplayName("정상 인증된 사용자의 이메일을 반환한다")
    void returnsEmailWhenAuthenticated() {
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(
                        "user@example.com", null, List.of()
                )
        );

        assertThat(AuthUtils.getCurrentUserEmail()).isEqualTo("user@example.com");
    }
}
