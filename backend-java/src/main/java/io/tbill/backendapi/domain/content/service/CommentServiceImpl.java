package io.tbill.backendapi.domain.content.service;

import io.tbill.backendapi.domain.content.dto.CommentDto;
import io.tbill.backendapi.domain.content.entity.Comment;
import io.tbill.backendapi.domain.content.entity.Content;
import io.tbill.backendapi.domain.content.repository.CommentRepository;
import io.tbill.backendapi.domain.content.repository.ContentRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class CommentServiceImpl implements CommentService {

    private final CommentRepository commentRepository;
    private final ContentRepository contentRepository; // 부모 게시글을 찾기 위해

    // (공통) 댓글 찾기 및 권한 확인
    private Comment findCommentByIdAndValidateOwner(Long commentId, String authorEmail) {
        Comment comment = commentRepository.findById(commentId)
                .orElseThrow(() -> new IllegalArgumentException("댓글을 찾을 수 없습니다. ID: " + commentId));

        // (소프트 삭제) 이미 삭제된 댓글인지 확인
        if (comment.getIsDeleted()) {
            throw new IllegalArgumentException("이미 삭제된 댓글입니다.");
        }

        // 작성자 본인인지 확인
        if (!comment.getAuthorEmail().equals(authorEmail)) {
            throw new RuntimeException("댓글에 대한 권한이 없습니다."); // (개선) AccessDeniedException
        }
        return comment;
    }

    @Override
    @Transactional
    public CommentDto.Info createComment(Long contentId, String authorEmail, String commentBody) {
        // 1. 부모 게시글이 (삭제되지 않고) 존재하는지 확인
        Content content = contentRepository.findByIdNotDeleted(contentId)
                .orElseThrow(() -> new IllegalArgumentException("게시글을 찾을 수 없습니다. ID: " + contentId));

        // 2. DTO(Command) 생성
        CommentDto.CreateCommand command = CommentDto.CreateCommand.builder()
                .content(content)
                .authorEmail(authorEmail)
                .commentBody(commentBody)
                .build();

        // 3. 엔티티 변환 및 저장
        Comment comment = command.toEntity();
        Comment savedComment = commentRepository.save(comment);

        return CommentDto.Info.from(savedComment);
    }

    @Override
    @Transactional
    public CommentDto.Info updateComment(Long commentId, String authorEmail, String contentBody) {
        // 1. 댓글 찾기 및 작성자 권한 검증
        Comment comment = findCommentByIdAndValidateOwner(commentId, authorEmail);

        // 2. 수정 (Dirty Checking)
        comment.update(contentBody);

        return CommentDto.Info.from(comment);
    }

    @Override
    @Transactional
    public void deleteComment(Long commentId, String authorEmail) {
        // 1. 댓글 찾기 및 작성자 권한 검증
        Comment comment = findCommentByIdAndValidateOwner(commentId, authorEmail);

        // 2. 소프트 삭제 (Dirty Checking)
        comment.softDelete();
    }
}