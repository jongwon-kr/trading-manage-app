package io.tbill.backendapi.domain.auth.dto;

import lombok.Builder;
import lombok.Getter;

public class AuthDto {

    /**
     * 로그인 명령 (Command)
     */
    @Getter
    public static class SignInCommand {
        private final String email;
        private final String password;

        @Builder
        public SignInCommand(String email, String password) {
            this.email = email;
            this.password = password;
        }
    }

    /**
     * 토큰 정보 (Access + Refresh)
     */
    @Getter
    public static class TokenInfo {
        private final String accessToken;
        private final String refreshToken;
        private final long refreshTokenExpirationMs; // (쿠키 MaxAge 설정용)

        @Builder
        public TokenInfo(String accessToken, String refreshToken, long refreshTokenExpirationMs) {
            this.accessToken = accessToken;
            this.refreshToken = refreshToken;
            this.refreshTokenExpirationMs = refreshTokenExpirationMs;
        }
    }

    /**
     * 로그인 응답 (사용자 정보 + 토큰 정보)
     * (Service -> Controller)
     */
    @Getter
    public static class SignInInfo {
        private final String username;
        private final String email;
        private final TokenInfo tokenInfo;

        @Builder
        public SignInInfo(String username, String email, TokenInfo tokenInfo) {
            this.username = username;
            this.email = email;
            this.tokenInfo = tokenInfo;
        }
    }
}