package io.tbill.backendapi.domain.user.service;

import io.tbill.backendapi.domain.user.dto.UserDto;
import io.tbill.backendapi.domain.user.entity.User;
import io.tbill.backendapi.domain.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class UserServiceImpl implements UserService{

    private final UserRepository userRepository;
    // private final PasswordEncoder passwordEncoder; // (보안)

    /**
     * 회원 가입
     */
    @Transactional
    public UserDto.UserInfo signUp(UserDto.SignUpCommand command) {
        // 이메일 중복 검사
        if (userRepository.findByEmail(command.getEmail()).isPresent()) {
            throw new IllegalArgumentException("이미 사용 중인 이메일입니다.");
        }

        // (보안) 비밀번호 암호화
        // String encodedPassword = passwordEncoder.encode(command.getPassword());

        User user = command.toEntity(); // DTO -> Entity (암호화 로직은 toEntity 내부나 여기서 처리)

        User savedUser = userRepository.save(user);

        // Entity -> DTO 변환 후 반환
        return UserDto.UserInfo.from(savedUser);
    }

    /**
     * 사용자 ID로 조회
     */
    public UserDto.UserInfo getUserById(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("사용자를 찾을 수 없습니다."));
        return UserDto.UserInfo.from(user);
    }
}
