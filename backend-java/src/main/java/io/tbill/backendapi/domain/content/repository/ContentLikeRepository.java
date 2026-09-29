package io.tbill.backendapi.domain.content.repository;

import io.tbill.backendapi.domain.content.entity.ContentLike;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.Optional;
import java.util.Set;

public interface ContentLikeRepository extends JpaRepository<ContentLike, Long> {

    Optional<ContentLike> findByContentIdAndUserEmail(Long contentId, String userEmail);

    boolean existsByContentIdAndUserEmail(Long contentId, String userEmail);

    /** 목록에서 '내가 좋아요 한 글' 표시용 */
    @Query("SELECT l.contentId FROM ContentLike l WHERE l.userEmail = :email AND l.contentId IN :ids")
    Set<Long> findLikedContentIds(@Param("email") String email, @Param("ids") Collection<Long> ids);
}
