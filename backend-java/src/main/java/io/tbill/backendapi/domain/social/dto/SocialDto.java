package io.tbill.backendapi.domain.social.dto;

import io.tbill.backendapi.domain.social.entity.NotificationType;
import io.tbill.backendapi.domain.social.entity.ReportReason;
import io.tbill.backendapi.domain.social.entity.ReportStatus;
import io.tbill.backendapi.domain.social.entity.ReportTarget;

import java.time.LocalDateTime;

/** 팔로우·알림·신고 DTO (조회 record 는 그대로 응답 본문) */
public class SocialDto {

    public record Profile(String username, long postCount, long followerCount, long followingCount, boolean following,
                          boolean me) {}

    public record FollowResult(boolean following, long followerCount) {}

    public record NotificationInfo(Long id, NotificationType type, String actorName, Long contentId, String message,
                                   boolean read, LocalDateTime createdAt) {}

    public record ReportCommand(String reporterEmail, ReportTarget targetType, Long targetId, ReportReason reason,
                                String memo) {}

    public record ReportInfo(Long id, ReportTarget targetType, Long targetId, Long contentId, String targetTitle,
                             String targetPreview, boolean targetHidden, String reporterName, ReportReason reason,
                             String memo, ReportStatus status, String resolvedBy, LocalDateTime createdAt) {}
}
