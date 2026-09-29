package io.tbill.backendapi.presentation.content.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import io.tbill.backendapi.domain.content.dto.ContentDto;
import io.tbill.backendapi.domain.content.service.CommentService;
import io.tbill.backendapi.global.utils.auth.AuthUtils;
import io.tbill.backendapi.presentation.content.dto.ContentApiDto;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@Tag(name = "Community", description = "커뮤니티 댓글 API")
@RestController
@RequiredArgsConstructor
@RequestMapping("/api")
public class CommentController {

    private final CommentService commentService;

    @Operation(summary = "댓글 작성", description = "평문 1~2000자. 글 작성자에게 알림")
    @PostMapping("/contents/{contentId}/comments")
    public ResponseEntity<ContentDto.CommentInfo> createComment(@PathVariable Long contentId,
                                                                @Valid @RequestBody ContentApiDto.CommentRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(commentService.createComment(contentId, AuthUtils.getCurrentUserEmail(), request.comment()));
    }

    @Operation(summary = "댓글 수정 (본인)")
    @PutMapping("/comments/{commentId}")
    public ResponseEntity<ContentDto.CommentInfo> updateComment(@PathVariable Long commentId,
                                                                @Valid @RequestBody ContentApiDto.CommentRequest request) {
        return ResponseEntity.ok(commentService.updateComment(commentId, AuthUtils.getCurrentUserEmail(), request.comment()));
    }

    @Operation(summary = "댓글 삭제 (본인)")
    @DeleteMapping("/comments/{commentId}")
    public ResponseEntity<Void> deleteComment(@PathVariable Long commentId) {
        commentService.deleteComment(commentId, AuthUtils.getCurrentUserEmail());
        return ResponseEntity.noContent().build();
    }
}
