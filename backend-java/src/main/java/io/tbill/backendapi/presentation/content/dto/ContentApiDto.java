package io.tbill.backendapi.presentation.content.dto;

import io.tbill.backendapi.domain.content.dto.ContentDto;
import io.tbill.backendapi.domain.content.entity.ContentCategory;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.springframework.data.domain.Page;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

public class ContentApiDto {

    /**
     * [POST] /api/contents (게시글 생성 요청)
     * [PUT] /api/contents/{contentId} (게시글 수정 요청)
     */
    @Getter
    @Setter
    @NoArgsConstructor
    public static class CreateOrUpdateRequest {
        // (Validation 추가 필요: @NotNull, @NotBlank, @Size)
        private ContentCategory category;
        private String title;
        private String content;

        // (Controller) Presentation DTO -> Domain DTO(Command)
        public ContentDto.CreateCommand toCommand(String authorEmail) {
            return ContentDto.CreateCommand.builder()
                    .category(this.category)
                    .title(this.title)
                    .contentBody(this.content)
                    .authorEmail(authorEmail) // (중요) Controller에서 주입
                    .build();
        }
    }

    /**
     * [GET] /api/contents (게시글 목록 응답)
     */
    @Getter
    public static class ListResponse {
        private final Long id;
        private final ContentCategory category;
        private final String title;
        private final String authorEmail;
        private final Integer viewCount;
        private final LocalDateTime createdAt;

        public ListResponse(ContentDto.SimpleResponse simple) {
            this.id = simple.getId();
            this.category = simple.getCategory();
            this.title = simple.getTitle();
            this.authorEmail = simple.getAuthorEmail();
            this.viewCount = simple.getViewCount();
            this.createdAt = simple.getCreatedAt();
        }
    }

    /**
     * (Helper) Page<DTO>를 API 응답 형식으로 변환
     */
    @Getter
    public static class PagedListResponse {
        private final List<ListResponse> content;
        private final int pageNumber;
        private final int pageSize;
        private final long totalElements;
        private final int totalPages;

        public PagedListResponse(Page<ContentDto.SimpleResponse> page) {
            this.content = page.getContent().stream()
                    .map(ListResponse::new)
                    .collect(Collectors.toList());
            this.pageNumber = page.getNumber();
            this.pageSize = page.getSize();
            this.totalElements = page.getTotalElements();
            this.totalPages = page.getTotalPages();
        }
    }


    /**
     * [GET] /api/contents/{contentId} (게시글 상세 응답)
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
        private final List<CommentApiDto.Response> comments; // (중요) 댓글 목록

        public DetailResponse(ContentDto.DetailResponse detail) {
            this.id = detail.getId();
            this.category = detail.getCategory();
            this.title = detail.getTitle();
            this.contentBody = detail.getContentBody();
            this.authorEmail = detail.getAuthorEmail();
            this.viewCount = detail.getViewCount();
            this.createdAt = detail.getCreatedAt();
            this.updatedAt = detail.getUpdatedAt();
            this.comments = detail.getComments().stream()
                    .map(CommentApiDto.Response::new)
                    .collect(Collectors.toList());
        }
    }
}