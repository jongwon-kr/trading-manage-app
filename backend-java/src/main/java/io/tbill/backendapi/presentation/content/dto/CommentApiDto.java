package io.tbill.backendapi.presentation.content.dto;

import io.tbill.backendapi.domain.content.dto.CommentDto;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import java.time.LocalDateTime;

public class CommentApiDto {

    /**
     * [POST] /api/contents/{contentId}/comments (댓글 생성 요청)
     * [PUT] /api/comments/{commentId} (댓글 수정 요청)
     */
    @Getter
    @Setter // JSON Deserialization
    @NoArgsConstructor // (선택)
    public static class CreateOrUpdateRequest {
        // (Validation 추가 필요: @NotBlank)
        private String content;
    }

    /**
     * 댓글 API 응답
     */
    @Getter
    public static class Response {
        private final Long id;
        private final String authorEmail;
        private final String content;
        private final LocalDateTime createdAt;

        public Response(CommentDto.Info info) {
            this.id = info.getId();
            this.authorEmail = info.getAuthorEmail();
            this.content = info.getContentBody();
            this.createdAt = info.getCreatedAt();
        }
    }
}