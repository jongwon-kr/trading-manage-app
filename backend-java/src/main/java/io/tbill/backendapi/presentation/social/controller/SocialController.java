package io.tbill.backendapi.presentation.social.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import io.tbill.backendapi.domain.content.dto.ContentDto;
import io.tbill.backendapi.domain.social.dto.SocialDto;
import io.tbill.backendapi.domain.social.entity.ReportTarget;
import io.tbill.backendapi.domain.social.service.FollowService;
import io.tbill.backendapi.domain.social.service.NotificationService;
import io.tbill.backendapi.domain.social.service.ReportService;
import io.tbill.backendapi.global.utils.auth.AuthUtils;
import io.tbill.backendapi.presentation.social.dto.SocialApiDto;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@Tag(name = "Social", description = "프로필·팔로우·알림·신고 API")
@RestController
@RequiredArgsConstructor
@RequestMapping("/api")
public class SocialController {

    private final FollowService followService;
    private final NotificationService notificationService;
    private final ReportService reportService;

    @Operation(summary = "사용자 프로필", description = "게시글·팔로워·팔로잉 수, 내가 팔로우 중인지")
    @GetMapping("/users/{username}/profile")
    public ResponseEntity<SocialDto.Profile> profile(@PathVariable String username) {
        return ResponseEntity.ok(followService.profile(username, AuthUtils.getCurrentUserEmail()));
    }

    @Operation(summary = "팔로우", description = "멱등, 자기 자신은 400. 상대에게 알림")
    @PostMapping("/users/{username}/follow")
    public ResponseEntity<SocialDto.FollowResult> follow(@PathVariable String username) {
        return ResponseEntity.ok(followService.follow(username, AuthUtils.getCurrentUserEmail()));
    }

    @Operation(summary = "팔로우 취소", description = "멱등")
    @DeleteMapping("/users/{username}/follow")
    public ResponseEntity<SocialDto.FollowResult> unfollow(@PathVariable String username) {
        return ResponseEntity.ok(followService.unfollow(username, AuthUtils.getCurrentUserEmail()));
    }

    @Operation(summary = "내 알림")
    @GetMapping("/notifications")
    public ResponseEntity<ContentDto.PageResult<SocialDto.NotificationInfo>> notifications(
            @RequestParam(defaultValue = "false") boolean unreadOnly,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(notificationService.list(AuthUtils.getCurrentUserEmail(), unreadOnly, page, size));
    }

    @Operation(summary = "안 읽은 알림 수", description = "프론트가 60초마다 폴링")
    @GetMapping("/notifications/unread-count")
    public ResponseEntity<Map<String, Long>> unreadCount() {
        return ResponseEntity.ok(Map.of("count", notificationService.unreadCount(AuthUtils.getCurrentUserEmail())));
    }

    @Operation(summary = "알림 읽음")
    @PostMapping("/notifications/{id}/read")
    public ResponseEntity<Void> markRead(@PathVariable Long id) {
        notificationService.markRead(id, AuthUtils.getCurrentUserEmail());
        return ResponseEntity.noContent().build();
    }

    @Operation(summary = "알림 모두 읽음")
    @PostMapping("/notifications/read-all")
    public ResponseEntity<Void> markAllRead() {
        notificationService.markAllRead(AuthUtils.getCurrentUserEmail());
        return ResponseEntity.noContent().build();
    }

    @Operation(summary = "게시글 신고", description = "같은 대상 중복 신고 409, 본인 글 400")
    @PostMapping("/contents/{contentId}/report")
    public ResponseEntity<Void> reportContent(@PathVariable Long contentId, @Valid @RequestBody SocialApiDto.ReportRequest request) {
        reportService.report(request.toCommand(AuthUtils.getCurrentUserEmail(), ReportTarget.CONTENT, contentId));
        return ResponseEntity.status(HttpStatus.CREATED).build();
    }

    @Operation(summary = "댓글 신고")
    @PostMapping("/comments/{commentId}/report")
    public ResponseEntity<Void> reportComment(@PathVariable Long commentId, @Valid @RequestBody SocialApiDto.ReportRequest request) {
        reportService.report(request.toCommand(AuthUtils.getCurrentUserEmail(), ReportTarget.COMMENT, commentId));
        return ResponseEntity.status(HttpStatus.CREATED).build();
    }
}
