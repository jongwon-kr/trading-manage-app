package io.tbill.backendapi.domain.content.dto;

import com.fasterxml.jackson.databind.JsonNode;
import io.tbill.backendapi.domain.content.entity.AttachmentType;
import io.tbill.backendapi.domain.content.entity.ContentCategory;

import java.time.LocalDateTime;
import java.util.List;

/**
 * 커뮤니티 서비스 계층 DTO. 조회 결과 record 는 그대로 응답 본문으로 쓴다 (작성자는 이메일 대신 username).
 */
public class ContentDto {

    public enum SortKey {
        LATEST, LIKES, COMMENTS, IMPORTS, VIEWS,
        /** 전략 공유: 백테스트 총수익률 높은 순 */
        RETURN,
        /** 전략 공유: 최대 낙폭이 작은 순 */
        MDD
    }

    /** admin: 공지(NOTICE) 작성 허용 */
    public record CreateCommand(String authorEmail, ContentCategory category, String title, String body, boolean admin) {}

    public record UpdateCommand(Long id, String authorEmail, String title, String body) {}

    /** 공유 글 (매매일지·전략). attachment 는 스냅샷 JSON */
    public record AttachmentPostCommand(String authorEmail, ContentCategory category, String title, String body,
                                        AttachmentType attachmentType, JsonNode attachment, String symbolKey,
                                        Double metricReturn, Double metricMdd) {}

    /** authorName: 특정 작성자 글만, following: 내가 팔로우한 사람 글만 */
    public record SearchCondition(String viewerEmail, ContentCategory category, String keyword, String symbolKey,
                                  String authorName, boolean following, SortKey sort, int page, int size) {}

    public record ListItem(Long id, ContentCategory category, String title, String excerpt, String authorName,
                           boolean mine, boolean liked, int viewCount, int likeCount, int commentCount, int importCount,
                           AttachmentType attachmentType, JsonNode attachmentSummary, String symbolKey, boolean hidden,
                           LocalDateTime createdAt) {}

    public record Detail(Long id, ContentCategory category, String title, String body, String authorName, boolean mine,
                         boolean liked, int viewCount, int likeCount, int commentCount, int importCount,
                         AttachmentType attachmentType, JsonNode attachment, String symbolKey, boolean hidden,
                         List<CommentInfo> comments, LocalDateTime createdAt, LocalDateTime updatedAt) {}

    public record CommentInfo(Long id, Long contentId, String authorName, String comment, boolean mine, boolean hidden,
                              LocalDateTime createdAt) {}

    public record LikeResult(boolean liked, int likeCount) {}

    public record PageResult<T>(List<T> content, int pageNumber, int pageSize, long totalElements, int totalPages,
                                boolean isLast) {}
}
