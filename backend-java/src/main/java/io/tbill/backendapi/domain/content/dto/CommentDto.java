package io.tbill.backendapi.domain.content.dto;

import io.tbill.backendapi.domain.content.entity.Comment;
import io.tbill.backendapi.domain.content.entity.Content;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;

public class CommentDto {

    /**
     * 댓글 생성 Command (Service -> Repo)
     */
    @Getter
    public static class CreateCommand {
        private final Content content; // 부모 게시글
        private final String authorEmail;
        private final String contentBody;

        @Builder
        public CreateCommand(Content content, String authorEmail, String contentBody) {
            this.content = content;
            this.authorEmail = authorEmail;
            this.contentBody = contentBody;
        }

        public Comment toEntity() {
            return Comment.builder()
                    .content(this.content)
                    .authorEmail(this.authorEmail)
                    .content(this.contentBody)
                    .build();
        }
    }

    /**
     * 댓글 응답 Info (Service -> Controller)
     */
    @Getter
    public static class Info {
        private final Long id;
        private final String authorEmail;
        private final String contentBody;
        private final LocalDateTime createdAt;

        public Info(Comment comment) {
            this.id = comment.getId();
            this.authorEmail = comment.getAuthorEmail();
            this.contentBody = comment.getContent();
            this.createdAt = comment.getCreatedAt();
        }

        public static Info from(Comment comment) {
            return new Info(comment);
        }
    }
}