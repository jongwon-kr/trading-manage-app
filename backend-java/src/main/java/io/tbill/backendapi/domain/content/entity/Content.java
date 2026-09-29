package io.tbill.backendapi.domain.content.entity;

import io.tbill.backendapi.domain.common.entity.BaseTimeEntity;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.List;

/**
 * 커뮤니티 게시글. 매매일지·전략 공유 글은 공유 시점의 스냅샷(JSON)을 attachment 에 담는다
 * (원본 일지·전략이 바뀌거나 지워져도 게시글은 그대로).
 * 카운터 컬럼은 기존 행이 있어도 ddl-auto:update 가 실패하지 않도록 DB 기본값을 둔다.
 */
@Entity
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Table(name = "content", indexes = {
        @Index(name = "idx_content_category_created", columnList = "category, created_at"),
        @Index(name = "idx_content_author_email", columnList = "author_email"),
        @Index(name = "idx_content_symbol_key", columnList = "symbol_key")
})
public class Content extends BaseTimeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "content_id", updatable = false)
    private Long id;

    @Enumerated(EnumType.STRING)
    @Column(name = "category", nullable = false)
    private ContentCategory category;

    @Column(name = "title", nullable = false)
    private String title;

    /** 정화된 HTML (HtmlSanitizer) */
    @Column(name = "content", columnDefinition = "TEXT")
    private String content;

    @Column(name = "author_email", nullable = false)
    private String authorEmail;

    @Column(name = "view_count", nullable = false)
    private Integer viewCount;

    @Column(name = "is_deleted", nullable = false)
    private Boolean isDeleted;

    @Enumerated(EnumType.STRING)
    @Column(name = "attachment_type", length = 16, columnDefinition = "varchar(16) default 'NONE' not null")
    private AttachmentType attachmentType;

    /** 공유 스냅샷 JSON (매매일지·전략) */
    @Column(name = "attachment", columnDefinition = "TEXT")
    private String attachment;

    /** 관련 종목 MARKET:CODE (필터용, 없으면 null) */
    @Column(name = "symbol_key", length = 64)
    private String symbolKey;

    /** 전략 공유의 백테스트 총수익률·MDD (정렬용) */
    @Column(name = "metric_return")
    private Double metricReturn;

    @Column(name = "metric_mdd")
    private Double metricMdd;

    @Column(name = "like_count", columnDefinition = "integer default 0 not null")
    private int likeCount;

    @Column(name = "comment_count", columnDefinition = "integer default 0 not null")
    private int commentCount;

    @Column(name = "import_count", columnDefinition = "integer default 0 not null")
    private int importCount;

    /** 관리자 숨김 (작성자에게만 '숨김 처리됨'으로 보인다) */
    @Column(name = "hidden", columnDefinition = "boolean default false not null")
    private boolean hidden;

    @OneToMany(mappedBy = "content", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @OrderBy("createdAt ASC")
    private List<Comment> comments = new ArrayList<>();

    @Builder
    public Content(ContentCategory category, String title, String content, String authorEmail,
                   AttachmentType attachmentType, String attachment, String symbolKey, Double metricReturn,
                   Double metricMdd) {
        this.category = category;
        this.title = title;
        this.content = content;
        this.authorEmail = authorEmail;
        this.attachmentType = attachmentType != null ? attachmentType : AttachmentType.NONE;
        this.attachment = attachment;
        this.symbolKey = symbolKey;
        this.metricReturn = metricReturn;
        this.metricMdd = metricMdd;
        this.viewCount = 0;
        this.isDeleted = false;
    }

    public void update(String title, String content) {
        this.title = title;
        this.content = content;
    }

    public void softDelete() {
        this.isDeleted = true;
        this.comments.forEach(Comment::softDelete);
    }

    public void increaseViewCount() {
        this.viewCount += 1;
    }

    public void increaseLikeCount() {
        this.likeCount += 1;
    }

    public void decreaseLikeCount() {
        this.likeCount = Math.max(0, this.likeCount - 1);
    }

    public void increaseCommentCount() {
        this.commentCount += 1;
    }

    public void decreaseCommentCount() {
        this.commentCount = Math.max(0, this.commentCount - 1);
    }

    public void increaseImportCount() {
        this.importCount += 1;
    }

    public void hide() {
        this.hidden = true;
    }

    public void unhide() {
        this.hidden = false;
    }

    public boolean isVisibleTo(String viewerEmail) {
        return !Boolean.TRUE.equals(isDeleted) && (!hidden || authorEmail.equals(viewerEmail));
    }
}
