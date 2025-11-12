package io.tbill.backendapi.domain.user.service;

import io.tbill.backendapi.domain.user.dto.UserDto;
import io.tbill.backendapi.domain.user.entity.User;
import io.tbill.backendapi.domain.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional(readOnly = true)
@RequiredArgsConstructor
public class UserServiceImpl implements UserService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    /**
     * 회원 가입
     */
    @Transactional
    public UserDto.UserInfo signUp(UserDto.SignUpCommand command) {
        if (userRepository.findByEmail(command.getEmail()).isPresent()) {
            throw new IllegalArgumentException("이미 사용 중인 이메일입니다.");
        }

        if (userRepository.existsByUsername(command.getUsername())) {
            throw new IllegalArgumentException("이미 사용 중인 닉네임입니다.");
        }

        String encodedPassword = passwordEncoder.encode(command.getPassword());

        User user = command.toEntity(encodedPassword);

        User savedUser = userRepository.save(user);

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

    /**
     * 닉네임 중복 확인
     */
    @Override
    public boolean isUsernameAvailable(String username) {
        return !userRepository.existsByUsername(username);
    }
}