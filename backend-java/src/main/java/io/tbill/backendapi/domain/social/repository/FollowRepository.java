package io.tbill.backendapi.domain.social.repository;

import io.tbill.backendapi.domain.social.entity.Follow;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface FollowRepository extends JpaRepository<Follow, Long> {

    Optional<Follow> findByFollowerEmailAndFolloweeEmail(String followerEmail, String followeeEmail);

    boolean existsByFollowerEmailAndFolloweeEmail(String followerEmail, String followeeEmail);

    long countByFolloweeEmail(String followeeEmail);

    long countByFollowerEmail(String followerEmail);

    @Query("SELECT f.followeeEmail FROM Follow f WHERE f.followerEmail = :email")
    List<String> findFolloweeEmails(@Param("email") String followerEmail);

    @Query("SELECT f.followerEmail FROM Follow f WHERE f.followeeEmail = :email ORDER BY f.id")
    List<String> findFollowerEmails(@Param("email") String followeeEmail, Pageable pageable);
}
