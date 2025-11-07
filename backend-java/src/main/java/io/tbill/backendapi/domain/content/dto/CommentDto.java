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
        private final String commentBody;

        @Builder
        public CreateCommand(Content content, String authorEmail, String commentBody) {
            this.content = content;
            this.authorEmail = authorEmail;
            this.commentBody = commentBody;
        }

        public Comment toEntity() {
            return Comment.builder()
                    .content(this.content)
                    .authorEmail(this.authorEmail)
                    .comment(this.commentBody)
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
        private final String commentBody;
        private final LocalDateTime createdAt;

        public Info(Comment comment) {
            this.id = comment.getId();
            this.authorEmail = comment.getAuthorEmail();
            this.commentBody = comment.getComment();
            this.createdAt = comment.getCreatedAt();
        }

        public static Info from(Comment comment) {
            return new Info(comment);
        }
    }
}