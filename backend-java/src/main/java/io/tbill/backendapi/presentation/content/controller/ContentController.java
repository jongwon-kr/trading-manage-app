package io.tbill.backendapi.presentation.content.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import io.tbill.backendapi.domain.content.dto.ContentDto;
import io.tbill.backendapi.domain.content.entity.ContentCategory;
import io.tbill.backendapi.domain.content.service.ContentService;
import io.tbill.backendapi.domain.content.service.ShareService;
import io.tbill.backendapi.domain.strategy.dto.StrategyPresetDto;
import io.tbill.backendapi.global.utils.auth.AuthUtils;
import io.tbill.backendapi.presentation.content.dto.ContentApiDto;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Locale;

/**
 * 커뮤니티 게시글·좋아요·공유. 모든 API 는 로그인이 필요하다 (SecurityConfig 기본 정책).
 * 응답의 작성자는 username 이고 이메일은 노출하지 않는다.
 */
@Tag(name = "Community", description = "커뮤니티 게시글·좋아요·매매일지/전략 공유 API")
@RestController
@RequiredArgsConstructor
@RequestMapping("/api")
public class ContentController {

    private final ContentService contentService;
    private final ShareService shareService;

    @Operation(summary = "게시글 목록",
            description = "category·q(제목/본문)·symbol(MARKET:CODE)·author(username)·following(팔로잉만) 필터, " +
                    "sort=latest|likes|comments|imports|views|return|mdd")
    @GetMapping("/contents")
    public ResponseEntity<ContentDto.PageResult<ContentDto.ListItem>> getContents(
            @RequestParam(required = false) ContentCategory category,
            @RequestParam(required = false) String q,
            @RequestParam(required = false) String symbol,
            @RequestParam(required = false) String author,
            @RequestParam(defaultValue = "false") boolean following,
            @RequestParam(defaultValue = "latest") String sort,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size
    ) {
        ContentDto.SortKey key;
        try {
            key = ContentDto.SortKey.valueOf(sort.toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException e) {
            throw new IllegalArgumentException("sort 값이 올바르지 않습니다: " + sort);
        }
        return ResponseEntity.ok(contentService.search(new ContentDto.SearchCondition(AuthUtils.getCurrentUserEmail(),
                category, q, symbol, author, following, key, page, size)));
    }

    @Operation(summary = "게시글 상세", description = "조회수 +1. 댓글 포함")
    @GetMapping("/contents/{contentId}")
    public ResponseEntity<ContentDto.Detail> getContent(@PathVariable Long contentId) {
        return ResponseEntity.ok(contentService.getContent(contentId, AuthUtils.getCurrentUserEmail()));
    }

    @Operation(summary = "게시글 작성", description = "자유(FREE_BOARD)·질문(QNA). 공지(NOTICE)는 관리자만. 본문 HTML 은 서버에서 정화")
    @PostMapping("/contents")
    public ResponseEntity<ContentDto.Detail> createContent(@Valid @RequestBody ContentApiDto.CreateRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(contentService.createContent(request.toCommand(AuthUtils.getCurrentUserEmail(), AuthUtils.isAdmin())));
    }

    @Operation(summary = "게시글 수정 (본인)")
    @PutMapping("/contents/{contentId}")
    public ResponseEntity<ContentDto.Detail> updateContent(@PathVariable Long contentId,
                                                           @Valid @RequestBody ContentApiDto.UpdateRequest request) {
        return ResponseEntity.ok(contentService.updateContent(request.toCommand(contentId, AuthUtils.getCurrentUserEmail())));
    }

    @Operation(summary = "게시글 삭제 (본인)")
    @DeleteMapping("/contents/{contentId}")
    public ResponseEntity<Void> deleteContent(@PathVariable Long contentId) {
        contentService.deleteContent(contentId, AuthUtils.getCurrentUserEmail());
        return ResponseEntity.noContent().build();
    }

    @Operation(summary = "좋아요", description = "멱등")
    @PostMapping("/contents/{contentId}/like")
    public ResponseEntity<ContentDto.LikeResult> like(@PathVariable Long contentId) {
        return ResponseEntity.ok(contentService.like(contentId, AuthUtils.getCurrentUserEmail()));
    }

    @Operation(summary = "좋아요 취소", description = "멱등")
    @DeleteMapping("/contents/{contentId}/like")
    public ResponseEntity<ContentDto.LikeResult> unlike(@PathVariable Long contentId) {
        return ResponseEntity.ok(contentService.unlike(contentId, AuthUtils.getCurrentUserEmail()));
    }

    @Operation(summary = "매매일지 공유", description = "공유 시점 스냅샷. hideAmounts 면 수량·실현손익 금액을 빼고 수익률·R 배수만")
    @PostMapping("/journals/{journalId}/share")
    public ResponseEntity<ContentDto.Detail> shareJournal(@PathVariable Long journalId,
                                                          @Valid @RequestBody ContentApiDto.JournalShareRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(shareService.shareJournal(journalId,
                AuthUtils.getCurrentUserEmail(), request.title(), request.body(), request.hideAmounts()));
    }

    @Operation(summary = "전략 공유", description = "설정 스냅샷 + (선택) 같은 설정으로 실행한 백테스트 성과. 설정이 다르면 400")
    @PostMapping("/v1/strategies/{presetId}/share")
    public ResponseEntity<ContentDto.Detail> shareStrategy(@PathVariable Long presetId,
                                                           @Valid @RequestBody ContentApiDto.StrategyShareRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(shareService.shareStrategy(presetId,
                AuthUtils.getCurrentUserEmail(), request.title(), request.body(), request.backtestRequestId()));
    }

    @Operation(summary = "공유된 전략 가져오기", description = "내 전략으로 복사 (이름이 겹치면 번호). 가져오기 수 +1")
    @PostMapping("/v1/strategies/import/{contentId}")
    public ResponseEntity<StrategyPresetDto.PresetInfo> importStrategy(@PathVariable Long contentId) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(shareService.importStrategy(contentId, AuthUtils.getCurrentUserEmail()));
    }
}
