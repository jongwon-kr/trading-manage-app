package io.tbill.backendapi.domain.content.dto;

import io.tbill.backendapi.domain.content.entity.Content;
import io.tbill.backendapi.domain.content.entity.ContentCategory;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

public class ContentDto {

    /**
     * 게시글 생성 Command (Service -> Repo)
     */
    @Getter
    public static class CreateCommand {
        private final ContentCategory category;
        private final String title;
        private final String contentBody;
        private final String authorEmail;

        @Builder
        public CreateCommand(ContentCategory category, String title, String contentBody, String authorEmail) {
            this.category = category;
            this.title = title;
            this.contentBody = contentBody;
            this.authorEmail = authorEmail;
        }

        public Content toEntity() {
            return Content.builder()
                    .category(this.category)
                    .title(this.title)
                    .content(this.contentBody)
                    .authorEmail(this.authorEmail)
                    .build();
        }
    }

    /**
     * (목록용) 게시글 단순 응답 (Service -> Controller)
     * (댓글 미포함)
     */
    @Getter
    public static class SimpleResponse {
        private final Long id;
        private final ContentCategory category;
        private final String title;
        private final String authorEmail;
        private final Integer viewCount;
        private final LocalDateTime createdAt;

        public SimpleResponse(Content content) {
            this.id = content.getId();
            this.category = content.getCategory();
            this.title = content.getTitle();
            this.authorEmail = content.getAuthorEmail();
            this.viewCount = content.getViewCount();
            this.createdAt = content.getCreatedAt();
        }

        public static SimpleResponse from(Content content) {
            return new SimpleResponse(content);
        }
    }

    /**
     * (상세) 게시글 상세 응답 (Service -> Controller)
     * (댓글 목록 포함)
     */
    @Getter
    public static class DetailResponse {
        private final Long id;
        private final ContentCategory category;
        private final String title;
        private final String contentBody;
        private final String authorEmail;
        private final Integer viewCount;
        private final LocalDateTime createdAt;
        private final LocalDateTime updatedAt;
        private final List<CommentDto.Info> comments; // (중요) 댓글 목록

        public DetailResponse(Content content) {
            this.id = content.getId();
            this.category = content.getCategory();
            this.title = content.getTitle();
            this.contentBody = content.getContent();
            this.authorEmail = content.getAuthorEmail();
            this.viewCount = content.getViewCount();
            this.createdAt = content.getCreatedAt();
            this.updatedAt = content.getUpdatedAt();

            // (중요) Entity List -> DTO List 변환
            // (소프트 삭제) 삭제되지 않은 댓글만 필터링
            this.comments = content.getComments().stream()
                    .filter(comment -> !comment.getIsDeleted())
                    .map(CommentDto.Info::from)
                    .collect(Collectors.toList());
        }

        public static DetailResponse from(Content content) {
            return new DetailResponse(content);
        }
    }
}