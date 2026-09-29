package io.tbill.backendapi.domain.content.service;

/**
 * 커뮤니티 이벤트 — 알림(NotificationService)이 트랜잭션 커밋 후 받아 저장한다.
 * 본인이 본인 글에 한 행동은 알림을 만들지 않는다 (수신 측에서 거른다).
 */
public final class CommunityEvents {

    private CommunityEvents() {
    }

    public record Commented(Long contentId, String contentAuthorEmail, String actorEmail, String contentTitle) {}

    public record Liked(Long contentId, String contentAuthorEmail, String actorEmail, String contentTitle) {}

    public record Posted(Long contentId, String authorEmail, String contentTitle) {}

    public record Imported(Long contentId, String contentAuthorEmail, String actorEmail, String contentTitle) {}

    public record ContentHidden(Long contentId, String contentAuthorEmail, String contentTitle) {}
}
