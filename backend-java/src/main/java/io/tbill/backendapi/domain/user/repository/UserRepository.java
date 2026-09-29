package io.tbill.backendapi.domain.user.repository;

import io.tbill.backendapi.domain.user.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByEmail(String email);

    // 닉네임 중복 확인
    boolean existsByUsername(String username);

    Optional<User> findByUsername(String username);

    /** 게시글·댓글 작성자 이름 일괄 조회 (이메일은 응답에 노출하지 않는다) */
    List<User> findByEmailIn(Collection<String> emails);
}