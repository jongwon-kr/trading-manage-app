package io.tbill.backendapi.domain.social.entity;

import io.tbill.backendapi.domain.common.entity.BaseTimeEntity;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

/** 팔로우: follower 가 followee 의 새 글 알림을 받고 '팔로잉만' 필터로 글을 본다 */
@Entity
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Table(name = "follow",
        uniqueConstraints = @UniqueConstraint(name = "uk_follow", columnNames = {"follower_email", "followee_email"}),
        indexes = @Index(name = "idx_follow_followee", columnList = "followee_email"))
public class Follow extends BaseTimeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "follow_id", updatable = false)
    private Long id;

    @Column(name = "follower_email", nullable = false)
    private String followerEmail;

    @Column(name = "followee_email", nullable = false)
    private String followeeEmail;

    public Follow(String followerEmail, String followeeEmail) {
        this.followerEmail = followerEmail;
        this.followeeEmail = followeeEmail;
    }
}
