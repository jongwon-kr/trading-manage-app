package io.tbill.backendapi.presentation.admin.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import io.tbill.backendapi.domain.content.dto.ContentDto;
import io.tbill.backendapi.domain.social.dto.SocialDto;
import io.tbill.backendapi.domain.social.entity.ReportStatus;
import io.tbill.backendapi.domain.social.entity.ReportTarget;
import io.tbill.backendapi.domain.social.service.ReportService;
import io.tbill.backendapi.global.utils.auth.AuthUtils;
import io.tbill.backendapi.presentation.social.dto.SocialApiDto;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

/** 관리자 전용 (ROLE_ADMIN). 일반 사용자는 403 */
@Tag(name = "Admin", description = "신고 처리·게시글/댓글 숨김 (관리자)")
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/admin")
@PreAuthorize("hasRole('ADMIN')")
public class AdminController {

    private final ReportService reportService;

    @Operation(summary = "신고 목록", description = "status 생략 시 전체")
    @GetMapping("/reports")
    public ResponseEntity<ContentDto.PageResult<SocialDto.ReportInfo>> reports(
            @RequestParam(required = false) ReportStatus status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(reportService.list(status, page, size));
    }

    @Operation(summary = "신고 처리", description = "hide=true: 대상 숨김 + 같은 대상 신고 모두 처리, false: 기각")
    @PostMapping("/reports/{reportId}/resolve")
    public ResponseEntity<Void> resolve(@PathVariable Long reportId, @RequestBody SocialApiDto.ResolveRequest request) {
        reportService.resolve(reportId, request.hide(), AuthUtils.getCurrentUserEmail());
        return ResponseEntity.noContent().build();
    }

    @Operation(summary = "게시글 숨김/해제")
    @PostMapping("/contents/{contentId}/{action:hide|unhide}")
    public ResponseEntity<Void> hideContent(@PathVariable Long contentId, @PathVariable String action) {
        reportService.setHidden(ReportTarget.CONTENT, contentId, "hide".equals(action));
        return ResponseEntity.noContent().build();
    }

    @Operation(summary = "댓글 숨김/해제")
    @PostMapping("/comments/{commentId}/{action:hide|unhide}")
    public ResponseEntity<Void> hideComment(@PathVariable Long commentId, @PathVariable String action) {
        reportService.setHidden(ReportTarget.COMMENT, commentId, "hide".equals(action));
        return ResponseEntity.noContent().build();
    }
}
