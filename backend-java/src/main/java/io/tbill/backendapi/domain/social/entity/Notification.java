package io.tbill.backendapi.domain.social.entity;

import io.tbill.backendapi.domain.common.entity.BaseTimeEntity;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

/** 알림. actorName·message 는 만든 시점의 스냅샷 (이름·제목이 바뀌어도 그대로) */
@Entity
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Table(name = "notification", indexes = @Index(name = "idx_notification_recipient", columnList = "recipient_email, is_read"))
public class Notification extends BaseTimeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "notification_id", updatable = false)
    private Long id;

    @Column(name = "recipient_email", nullable = false)
    private String recipientEmail;

    @Enumerated(EnumType.STRING)
    @Column(name = "type", nullable = false, length = 32)
    private NotificationType type;

    @Column(name = "actor_name", length = 100)
    private String actorName;

    @Column(name = "content_id")
    private Long contentId;

    @Column(name = "message", length = 300)
    private String message;

    @Column(name = "is_read", nullable = false)
    private boolean read;

    @Builder
    public Notification(String recipientEmail, NotificationType type, String actorName, Long contentId, String message) {
        this.recipientEmail = recipientEmail;
        this.type = type;
        this.actorName = actorName;
        this.contentId = contentId;
        this.message = message;
        this.read = false;
    }

    public void markRead() {
        this.read = true;
    }
}
