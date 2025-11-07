package io.tbill.backendapi.presentation.user.dto;

import io.tbill.backendapi.domain.user.dto.UserDto;
import lombok.Getter;
import lombok.Setter;
// import jakarta.validation.constraints.Email; // (예시) 유효성 검사
// import jakarta.validation.constraints.NotBlank; // (예시) 유효성 검사

public class UserApiDto {

    /**
     * [POST] /api/users/sign-up (회원가입 요청)
     * 회원가입에 필요한 데이터만 정의합니다.
     */
    @Getter
    @Setter
    public static class SignUpRequest {

        // @NotBlank(message = "사용자 이름은 필수입니다.")
        private String username;

        // @NotBlank(message = "이메일은 필수입니다.")
        // @Email(message = "이메일 형식이 올바르지 않습니다.")
        private String email;

        // @NotBlank(message = "비밀번호는 필수입니다.")
        private String password;

        // Presentation DTO -> Domain DTO(Command)
        public UserDto.SignUpCommand toCommand() {
            return UserDto.SignUpCommand.builder()
                    .username(this.username)
                    .email(this.email)
                    .password(this.password)
                    .build();
        }
    }

    /**
     * [POST] /api/users/sign-in (로그인 요청)
     * 로그인에 필요한 데이터만 정의합니다.
     */
    @Getter
    @Setter
    public static class SignInRequest {

        // @NotBlank(message = "이메일은 필수입니다.")
        // @Email(message = "이메일 형식이 올바르지 않습니다.")
        private String email;

        // @NotBlank(message = "비밀번호는 필수입니다.")
        private String password;

        // 로그인은 별도의 도메인 Command(예: AuthDto.LoginCommand)로 변환
        // public AuthDto.LoginCommand toCommand() { ... }
    }

    /**
     * API 공통 응답 DTO
     * (회원가입, 내 정보 조회 등에서 공통 사용 가능)
     */
    @Getter
    public static class UserResponse {
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