package io.tbill.backendapi.domain.social.entity;

public enum NotificationType {
    COMMENT, // 내 글에 댓글
    LIKE, // 내 글에 좋아요
    IMPORT, // 내 전략을 누가 가져감
    FOLLOW, // 나를 팔로우
    NEW_POST_FROM_FOLLOWEE, // 팔로우한 사람의 새 글
    POST_HIDDEN // 내 글이 관리자에 의해 숨김 처리됨
}
