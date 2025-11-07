package io.tbill.backendapi.domain.content.repository;

import io.tbill.backendapi.domain.content.entity.Comment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface CommentRepository extends JpaRepository<Comment, Long> {

    // (선택) 삭제되지 않은 댓글만 찾는 쿼리 등을 추가할 수 있습니다.
    // Optional<Comment> findByIdAndIsDeletedFalse(Long id);
}