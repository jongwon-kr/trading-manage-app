package io.tbill.backendapi.presentation.content.controller;

import io.tbill.backendapi.domain.content.dto.ContentDto;
import io.tbill.backendapi.domain.content.service.ContentService;
import io.tbill.backendapi.global.utils.auth.AuthUtils;
import io.tbill.backendapi.presentation.content.dto.ContentApiDto;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;


@RestController
@RequiredArgsConstructor
@RequestMapping("/api/contents")
public class ContentController {

    private final ContentService contentService;

    /**
     * 게시글 생성
     * [POST] /api/contents
     */
    @PreAuthorize("isAuthenticated()") // (보안) 인증된 사용자만
    @PostMapping
    public ResponseEntity<ContentApiDto.ListResponse> createContent(
            @RequestBody ContentApiDto.CreateOrUpdateRequest request
    ) {
        // (보안) 인증된 사용자의 이메일 가져오기
        String authorEmail = AuthUtils.getCurrentUserEmail();

        // 1. Presentation DTO -> Domain DTO(Command) 변환
        ContentDto.CreateCommand command = request.toCommand(authorEmail);

        // 2. Service 호출
        ContentDto.SimpleResponse simpleResponse = contentService.createContent(command);

        // 3. Domain DTO -> Presentation DTO(Response) 변환
        return ResponseEntity.status(HttpStatus.CREATED).body(new ContentApiDto.ListResponse(simpleResponse));
    }

    /**
     * 게시글 목록 조회
     * [GET] /api/contents?page=0&size=10&sort=createdAt,desc
     */
    @GetMapping
    public ResponseEntity<ContentApiDto.PagedListResponse> getContentList(
            @PageableDefault(size = 10, sort = "createdAt,desc") Pageable pageable
    ) {
        Page<ContentDto.SimpleResponse> page = contentService.getContentList(pageable);
        return ResponseEntity.ok(new ContentApiDto.PagedListResponse(page));
    }

    /**
     * 게시글 상세 조회
     * [GET] /api/contents/{contentId}
     */
    @GetMapping("/{contentId}")
    public ResponseEntity<ContentApiDto.DetailResponse> getContent(
            @PathVariable Long contentId
    ) {
        // (Service에서 조회수 증가 로직 포함)
        ContentDto.DetailResponse detailResponse = contentService.getContentById(contentId);
        return ResponseEntity.ok(new ContentApiDto.DetailResponse(detailResponse));
    }

    /**
     * 게시글 수정
     * [PUT] /api/contents/{contentId}
     */
    @PreAuthorize("isAuthenticated()") // (보안) 인증된 사용자만
    @PutMapping("/{contentId}")
    public ResponseEntity<ContentApiDto.DetailResponse> updateContent(
            @PathVariable Long contentId,
            @RequestBody ContentApiDto.CreateOrUpdateRequest request
    ) {
        String authorEmail = AuthUtils.getCurrentUserEmail();
        ContentDto.CreateCommand command = request.toCommand(authorEmail);

        ContentDto.DetailResponse detailResponse = contentService.updateContent(
                contentId,
                authorEmail,
                command
        );

        return ResponseEntity.ok(new ContentApiDto.DetailResponse(detailResponse));
    }

    /**
     * 게시글 삭제 (소프트 삭제)
     * [DELETE] /api/contents/{contentId}
     */
    @PreAuthorize("isAuthenticated()") // (보안) 인증된 사용자만
    @DeleteMapping("/{contentId}")
    public ResponseEntity<Void> deleteContent(
            @PathVariable Long contentId
    ) {
        String authorEmail = AuthUtils.getCurrentUserEmail();

        contentService.deleteContent(contentId, authorEmail);

        return ResponseEntity.noContent().build(); // 204 No Content
    }
}