package io.tbill.backendapi.presentation.content.controller;

import io.tbill.backendapi.domain.content.dto.CommentDto;
import io.tbill.backendapi.domain.content.service.CommentService;
import io.tbill.backendapi.global.utils.auth.AuthUtils;
import io.tbill.backendapi.presentation.content.dto.CommentApiDto;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api")
public class CommentController {

    private final CommentService commentService;

    /**
     * 댓글 생성
     * [POST] /api/contents/{contentId}/comments
     */
    @PreAuthorize("isAuthenticated()") // (보안) 인증된 사용자만
    @PostMapping("/contents/{contentId}/comments")
    public ResponseEntity<CommentApiDto.Response> createComment(
            @PathVariable Long contentId,
            @RequestBody CommentApiDto.CreateOrUpdateRequest request
    ) {
        // (보안) 인증된 사용자의 이메일 가져오기
        String authorEmail = AuthUtils.getCurrentUserEmail();

        CommentDto.Info info = commentService.createComment(
                contentId,
                authorEmail,
                request.getContent()
        );

        return ResponseEntity.status(HttpStatus.CREATED).body(new CommentApiDto.Response(info));
    }

    /**
     * 댓글 수정
     * [PUT] /api/comments/{commentId}
     */
    @PreAuthorize("isAuthenticated()") // (보안) 인증된 사용자만
    @PutMapping("/comments/{commentId}")
    public ResponseEntity<CommentApiDto.Response> updateComment(
            @PathVariable Long commentId,
            @RequestBody CommentApiDto.CreateOrUpdateRequest request
    ) {
        String authorEmail = AuthUtils.getCurrentUserEmail();

        CommentDto.Info info = commentService.updateComment(
                commentId,
                authorEmail,
                request.getContent()
        );

        return ResponseEntity.ok(new CommentApiDto.Response(info));
    }

    /**
     * 댓글 삭제 (소프트 삭제)
     * [DELETE] /api/comments/{commentId}
     */
    @PreAuthorize("isAuthenticated()") // (보안) 인증된 사용자만
    @DeleteMapping("/comments/{commentId}")
    public ResponseEntity<Void> deleteComment(
            @PathVariable Long commentId
    ) {
        String authorEmail = AuthUtils.getCurrentUserEmail();

        commentService.deleteComment(commentId, authorEmail);

        return ResponseEntity.noContent().build(); // 204 No Content
    }
}