package io.tbill.backendapi.domain.content.repository;

import io.tbill.backendapi.domain.content.entity.Content;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface ContentRepository extends JpaRepository<Content, Long>, JpaSpecificationExecutor<Content> {

    /**
     * 삭제되지 않은 게시글 (댓글 함께 조회 — N+1 방지). 숨김 여부는 서비스에서 조회자 기준으로 판단한다.
     */
    @Query("SELECT c FROM Content c LEFT JOIN FETCH c.comments WHERE c.id = :id AND c.isDeleted = false")
    Optional<Content> findByIdNotDeleted(@Param("id") Long id);

    long countByAuthorEmailAndIsDeletedFalse(String authorEmail);
}
