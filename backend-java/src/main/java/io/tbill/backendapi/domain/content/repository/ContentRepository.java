package io.tbill.backendapi.domain.content.repository;

import io.tbill.backendapi.domain.content.entity.Content;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface ContentRepository extends JpaRepository<Content, Long> {

    /**
     * (소프트 삭제) 삭제되지 않은 모든 게시글 조회 (페이징)
     */
    @Query("SELECT c FROM Content c WHERE c.isDeleted = false")
    Page<Content> findAllNotDeleted(Pageable pageable);

    /**
     * (소프트 삭제) 삭제되지 않은 특정 게시글 조회 (조회수 증가 로직을 위해)
     * (중요) @OneToMany(fetch = FetchType.LAZY)인 'comments'를
     * 같이 조회하기 위해 'LEFT JOIN FETCH' 사용 (N+1 문제 방지)
     */
    @Query("SELECT c FROM Content c LEFT JOIN FETCH c.comments WHERE c.id = :id AND c.isDeleted = false")
    Optional<Content> findByIdNotDeleted(@Param("id") Long id);
}