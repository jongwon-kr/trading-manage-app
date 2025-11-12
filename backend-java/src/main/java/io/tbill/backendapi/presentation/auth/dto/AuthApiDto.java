package io.tbill.backendapi.presentation.auth.dto;

import io.tbill.backendapi.domain.auth.dto.AuthDto;
import io.tbill.backendapi.domain.user.dto.UserDto;
import lombok.Getter;
import lombok.NoArgsConstructor;

public class AuthApiDto {

    @Getter
    @NoArgsConstructor
    public static class SignInRequest {
        private String email;
        private String password;

        public AuthDto.SignInCommand toCommand() {
            return AuthDto.SignInCommand.builder()
                    .email(email)
                    .password(password)
                    .build();
        }
    }

    /**
     * [수정] 로그인 및 토큰 재발급 응답 DTO
     * (AccessToken 필드 제거 - 헤더로 전송)
     */
    @Getter
    public static class AuthResponse {
        private final UserDto.UserInfo user;
        private final long accessTokenExpiresAt;
        // [삭제] private final String accessToken;

        // [수정] 생성자에서 accessToken 제외
        public AuthResponse(UserDto.UserInfo user, long accessTokenExpiresAt) {
            this.user = user;
            this.accessTokenExpiresAt = accessTokenExpiresAt;
        }
    }
}