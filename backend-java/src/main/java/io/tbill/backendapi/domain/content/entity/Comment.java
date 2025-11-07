package io.tbill.backendapi.domain.content.entity;

import io.tbill.backendapi.domain.common.entity.BaseTimeEntity;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Table(name = "comment")
public class Comment extends BaseTimeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "comment_id", updatable = false)
    private Long id;

    // (중요) 게시글(Content)과의 연관관계 (N:1)
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "content_id", nullable = false)
    private Content content;

    @Column(name = "author_email", nullable = false)
    private String authorEmail;

    @Column(name = "comment", columnDefinition = "TEXT", nullable = false)
    private String comment;

    @Column(name = "is_deleted", nullable = false)
    private Boolean isDeleted;

    @Builder
    public Comment(Content content, String authorEmail, String comment) {
        this.content = content;
        this.authorEmail = authorEmail;
        this.content = content;
        this.isDeleted = false; // 생성 시 기본값
    }

    // (편의 메서드) 수정
    public void update(String newComment) {
        this.comment = newComment;
    }

    // (편의 메서드) 소프트 삭제
    public void softDelete() {
        this.isDeleted = true;
    }
}