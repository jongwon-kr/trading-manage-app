package io.tbill.backendapi.presentation.auth.dto;

import io.tbill.backendapi.domain.auth.dto.AuthDto;
import lombok.Getter;
import lombok.Setter;

public class AuthApiDto {

    /**
     * [POST] /api/auth/sign-in (로그인 요청)
     */
    @Getter
    @Setter
    public static class SignInRequest {
        // (Validation 추가 필요)
        private String email;
        private String password;

        public AuthDto.SignInCommand toCommand() {
            return AuthDto.SignInCommand.builder()
                    .email(this.email)
                    .password(this.password)
                    .build();
        }
    }

    /**
     * 로그인 및 토큰 재발급 응답
     * (Access Token은 Body와 Header 모두에 제공)
     */
    @Getter
    public static class TokenResponse {
        private final String accessToken;

        public TokenResponse(String accessToken) {
            this.accessToken = accessToken;
        }
    }
}