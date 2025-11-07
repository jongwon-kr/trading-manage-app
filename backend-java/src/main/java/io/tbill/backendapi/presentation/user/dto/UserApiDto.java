package io.tbill.backendapi.presentation.user.dto;

import io.tbill.backendapi.domain.user.dto.UserDto;
import lombok.Getter;
import lombok.Setter;

public class UserApiDto {

    /**
     * [POST] /api/users/sign-up (회원가입 요청)
     */
    @Getter
    @Setter
    public static class SignUpRequest {
        // (Validation 추가 필요)
        private String username;
        private String email;
        private String password;

        // Presentation DTO -> Domain DTO(Command)
        public UserDto.SignUpCommand toCommand() {
            // (수정) Service에서 암호화하므로 원본 비밀번호 전달
            return UserDto.SignUpCommand.builder()
                    .username(this.username)
                    .email(this.email)
                    .password(this.password)
                    .build();
        }
    }

    /**
     * API 공통 응답 DTO
     * (회원가입, 내 정보 조회 등)
     */
    @Getter
    public static class UserResponse {
        // ... (기존과 동일) ...
        private final Long id;
        private final String username;
        private final String email;

        public UserResponse(UserDto.UserInfo userInfo) {
            this.id = userInfo.getId();
            this.username = userInfo.getUsername();
            this.email = userInfo.getEmail();
        }
    }
}