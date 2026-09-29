package io.tbill.backendapi.domain.content.entity;

import io.tbill.backendapi.domain.common.entity.BaseTimeEntity;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

/** 게시글 좋아요 (사용자당 1회) */
@Entity
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Table(name = "content_like",
        uniqueConstraints = @UniqueConstraint(name = "uk_content_like", columnNames = {"content_id", "user_email"}),
        indexes = @Index(name = "idx_content_like_user", columnList = "user_email"))
public class ContentLike extends BaseTimeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "content_like_id", updatable = false)
    private Long id;

    @Column(name = "content_id", nullable = false)
    private Long contentId;

    @Column(name = "user_email", nullable = false)
    private String userEmail;

    public ContentLike(Long contentId, String userEmail) {
        this.contentId = contentId;
        this.userEmail = userEmail;
    }
}
