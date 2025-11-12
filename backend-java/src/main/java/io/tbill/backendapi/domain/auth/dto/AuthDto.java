package io.tbill.backendapi.domain.auth.dto;

import io.tbill.backendapi.domain.user.dto.UserDto;
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
        private final long accessTokenExpirationMs;
        private final long refreshTokenExpirationMs;
        private final long accessTokenExpiresAt; // [신규] 만료 시점 타임스탬프

        @Builder
        public TokenInfo(String accessToken, String refreshToken, long accessTokenExpirationMs, long refreshTokenExpirationMs, long accessTokenExpiresAt) {
            this.accessToken = accessToken;
            this.refreshToken = refreshToken;
            this.accessTokenExpirationMs = accessTokenExpirationMs;
            this.refreshTokenExpirationMs = refreshTokenExpirationMs;
            this.accessTokenExpiresAt = accessTokenExpiresAt;
        }
    }

    /**
     * 로그인 응답 (사용자 정보 + 토큰 정보)
     * (Service -> Controller)
     */
    @Getter
    public static class SignInInfo {
        // [수정] 사용자 정보를 포함 (로그인/갱신 시 모두 반환)
        private final UserDto.UserInfo userInfo;
        private final TokenInfo tokenInfo;

        @Builder
        public SignInInfo(UserDto.UserInfo userInfo, TokenInfo tokenInfo) {
            this.userInfo = userInfo;
            this.tokenInfo = tokenInfo;
        }
    }
}