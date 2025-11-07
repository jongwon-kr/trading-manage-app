package io.tbill.backendapi.domain.content.entity;

import io.tbill.backendapi.domain.common.entity.BaseTimeEntity;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.List;

@Entity
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Table(name = "content")
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

    @Column(name = "content", columnDefinition = "TEXT")
    private String content;

    @Column(name = "author_email", nullable = false)
    private String authorEmail;

    @Column(name = "view_count", nullable = false)
    private Integer viewCount;

    @Column(name = "is_deleted", nullable = false)
    private Boolean isDeleted;

    // (중요) 댓글(Comment)과의 연관관계 (1:N)
    // CascadeType.ALL: 게시글이 삭제(물리)되면 댓글도 삭제됨
    // orphanRemoval = true: 컬렉션에서 댓글이 제거되면 DB에서도 삭제됨
    @OneToMany(mappedBy = "content", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @OrderBy("createdAt ASC") // 댓글을 생성순으로 정렬
    private List<Comment> comments = new ArrayList<>();


    @Builder
    public Content(ContentCategory category, String title, String content, String authorEmail) {
        this.category = category;
        this.title = title;
        this.content = content;
        this.authorEmail = authorEmail;
        this.viewCount = 0; // 생성 시 조회수 0
        this.isDeleted = false; // 생성 시 삭제 안 됨
    }

    // (편의 메서드) 수정
    public void update(ContentCategory category, String title, String content) {
        this.category = category;
        this.title = title;
        this.content = content;
    }

    // (편의 메서드) 소프트 삭제
    public void softDelete() {
        this.isDeleted = true;
        // (선택) 게시글이 삭제되면 댓글도 모두 소프트 삭제 처리
        this.comments.forEach(Comment::softDelete);
    }

    // (편의 메서드) 조회수 증가
    public void increaseViewCount() {
        this.viewCount += 1;
    }
}