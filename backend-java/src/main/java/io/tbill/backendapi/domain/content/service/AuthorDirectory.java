package io.tbill.backendapi.domain.content.service;

import io.tbill.backendapi.domain.user.entity.User;
import io.tbill.backendapi.domain.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.Collection;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

/**
 * 작성자 이메일 ↔ username 변환. 커뮤니티 응답은 이메일을 노출하지 않는다.
 */
@Component
@RequiredArgsConstructor
public class AuthorDirectory {

    static final String UNKNOWN = "알 수 없는 사용자";

    private final UserRepository userRepository;

    /** 이메일 → username (없으면 '알 수 없는 사용자') */
    public Map<String, String> names(Collection<String> emails) {
        if (emails.isEmpty()) {
            return Map.of();
        }
        Map<String, String> found = userRepository.findByEmailIn(emails.stream().distinct().toList()).stream()
                .collect(Collectors.toMap(User::getEmail, User::getUsername, (a, b) -> a));
        return emails.stream().distinct().collect(Collectors.toMap(e -> e, e -> found.getOrDefault(e, UNKNOWN)));
    }

    public String name(String email) {
        return names(java.util.List.of(email)).get(email);
    }

    public Optional<String> emailOf(String username) {
        return userRepository.findByUsername(username).map(User::getEmail);
    }
}
