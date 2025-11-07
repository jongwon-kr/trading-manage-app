package io.tbill.backendapi.domain.user.dto;

import io.tbill.backendapi.domain.user.entity.User;
import lombok.Builder;
import lombok.Getter;

public class UserDto {

    /**
     * Service가 Controller로부터 받을 '명령' (Command) DTO
     */
    @Getter
    public static class SignUpCommand {
        private final String username;
        private final String email;
        private final String password;

        @Builder
        public SignUpCommand(String username, String email, String password) {
            this.username = username;
            this.email = email;
            this.password = password;
        }

        public User toEntity() {
            // 실제로는 여기서 PasswordEncoder를 통해 암호화 필요
            return User.builder()
                    .username(this.username)
                    .email(this.email)
                    .password(this.password)
                    .build();
        }
    }

    /**
     * Service가 Controller로 반환할 '정보' (Info) DTO
     */
    @Getter
    public static class UserInfo {
        private final Long id;
        private final String username;
        private final String email;

        public UserInfo(User user) {
            this.id = user.getId();
            this.username = user.getUsername();
            this.email = user.getEmail();
        }

        // 정적 팩토리 메서드
        public static UserInfo from(User user) {
            return new UserInfo(user);
        }
    }
}