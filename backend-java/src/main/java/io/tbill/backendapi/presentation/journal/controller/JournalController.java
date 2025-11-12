package io.tbill.backendapi.presentation.journal.controller;

import io.tbill.backendapi.domain.journal.dto.JournalDto;
import io.tbill.backendapi.domain.journal.service.JournalService;
import io.tbill.backendapi.global.utils.auth.AuthUtils;
import io.tbill.backendapi.presentation.journal.dto.JournalApiDto;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/journals")
public class JournalController {

    private final JournalService journalService;

    /**
     * 매매일지 생성
     * [POST] /api/journals
     */
    @PostMapping
    public ResponseEntity<JournalApiDto.JournalResponse> createJournal(
            @Valid @RequestBody JournalApiDto.CreateRequest request
    ) {
        String currentUserEmail = AuthUtils.getCurrentUserEmail();
        JournalDto.CreateCommand command = request.toCommand(currentUserEmail);
        JournalDto.JournalInfo journalInfo = journalService.createJournal(command);
        JournalApiDto.JournalResponse response = new JournalApiDto.JournalResponse(journalInfo);

        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    /**
     * 매매일지 수정
     * [PUT] /api/journals/{journalId}
     */
    @PutMapping("/{journalId}")
    public ResponseEntity<JournalApiDto.JournalResponse> updateJournal(
            @PathVariable Long journalId,
            @Valid @RequestBody JournalApiDto.UpdateRequest request
    ) {
        String currentUserEmail = AuthUtils.getCurrentUserEmail();
        JournalDto.UpdateCommand command = request.toCommand(journalId, currentUserEmail);
        JournalDto.JournalInfo journalInfo = journalService.updateJournal(command);
        JournalApiDto.JournalResponse response = new JournalApiDto.JournalResponse(journalInfo);

        return ResponseEntity.ok(response);
    }

    /**
     * 매매일지 삭제
     * [DELETE] /api/journals/{journalId}
     */
    @DeleteMapping("/{journalId}")
    public ResponseEntity<Void> deleteJournal(@PathVariable Long journalId) {
        String currentUserEmail = AuthUtils.getCurrentUserEmail();
        journalService.deleteJournal(journalId, currentUserEmail);

        return ResponseEntity.noContent().build();
    }

    /**
     * 매매일지 상세 조회
     * [GET] /api/journals/{journalId}
     */
    @GetMapping("/{journalId}")
    public ResponseEntity<JournalApiDto.JournalResponse> getJournal(
            @PathVariable Long journalId
    ) {
        String currentUserEmail = AuthUtils.getCurrentUserEmail();
        JournalDto.JournalInfo journalInfo = journalService.getJournalById(journalId, currentUserEmail);
        JournalApiDto.JournalResponse response = new JournalApiDto.JournalResponse(journalInfo);

        return ResponseEntity.ok(response);
    }

    /**
     * 내 매매일지 목록 조회 (페이징)
     * [GET] /api/journals?page=0&size=20&sortBy=createdAt&direction=DESC
     * [수정] 반환 타입을 Page -> PagedResponse로 변경 (500 에러 해결)
     */
    @GetMapping
    public ResponseEntity<JournalApiDto.PagedResponse<JournalApiDto.JournalSummaryResponse>> getMyJournals(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(defaultValue = "createdAt") String sortBy,
            @RequestParam(defaultValue = "DESC") String direction
    ) {
        String currentUserEmail = AuthUtils.getCurrentUserEmail();
        Sort.Direction sortDirection = Sort.Direction.fromString(direction);
        Pageable pageable = PageRequest.of(page, size, Sort.by(sortDirection, sortBy));

        Page<JournalDto.JournalSummary> journalSummaries =
                journalService.getMyJournals(currentUserEmail, pageable);

        Page<JournalApiDto.JournalSummaryResponse> responsesPage =
                journalSummaries.map(JournalApiDto.JournalSummaryResponse::new);

        // Page<Response> -> PagedResponse<Response>
        return ResponseEntity.ok(new JournalApiDto.PagedResponse<>(responsesPage));
    }

    /**
     * 매매일지 검색
     * [GET] /api/journals/search
     * [수정] 반환 타입을 Page -> PagedResponse로 변경 (500 에러 해결)
     */
    @GetMapping("/search")
    public ResponseEntity<JournalApiDto.PagedResponse<JournalApiDto.JournalSummaryResponse>> searchJournals(
            @ModelAttribute JournalApiDto.SearchRequest searchRequest,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(defaultValue = "createdAt") String sortBy,
            @RequestParam(defaultValue = "DESC") String direction
    ) {
        String currentUserEmail = AuthUtils.getCurrentUserEmail();
        Sort.Direction sortDirection = Sort.Direction.fromString(direction);
        Pageable pageable = PageRequest.of(page, size, Sort.by(sortDirection, sortBy));

        JournalDto.SearchCondition condition = searchRequest.toSearchCondition(currentUserEmail);
        Page<JournalDto.JournalSummary> journalSummaries =
                journalService.searchJournals(condition, pageable);

        Page<JournalApiDto.JournalSummaryResponse> responsesPage =
                journalSummaries.map(JournalApiDto.JournalSummaryResponse::new);

        return ResponseEntity.ok(new JournalApiDto.PagedResponse<>(responsesPage));
    }

    /**
     * 진행 중인 거래 조회
     * [GET] /api/journals/open
     * [수정] 반환 타입을 Page -> PagedResponse로 변경 (500 에러 해결)
     */
    @GetMapping("/open")
    public ResponseEntity<JournalApiDto.PagedResponse<JournalApiDto.JournalSummaryResponse>> getOpenTrades(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size
    ) {
        String currentUserEmail = AuthUtils.getCurrentUserEmail();
        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));

        Page<JournalDto.JournalSummary> journalSummaries =
                journalService.getOpenTrades(currentUserEmail, pageable);

        Page<JournalApiDto.JournalSummaryResponse> responsesPage =
                journalSummaries.map(JournalApiDto.JournalSummaryResponse::new);

        return ResponseEntity.ok(new JournalApiDto.PagedResponse<>(responsesPage));
    }

    /**
     * 종료된 거래 조회
     * [GET] /api/journals/closed
     * [수정] 반환 타입을 Page -> PagedResponse로 변경 (500 에러 해결)
     */
    @GetMapping("/closed")
    public ResponseEntity<JournalApiDto.PagedResponse<JournalApiDto.JournalSummaryResponse>> getClosedTrades(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size
    ) {
        String currentUserEmail = AuthUtils.getCurrentUserEmail();
        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));

        Page<JournalDto.JournalSummary> journalSummaries =
                journalService.getClosedTrades(currentUserEmail, pageable);

        Page<JournalApiDto.JournalSummaryResponse> responsesPage =
                journalSummaries.map(JournalApiDto.JournalSummaryResponse::new);

        return ResponseEntity.ok(new JournalApiDto.PagedResponse<>(responsesPage));
    }

    /**
     * 통계 정보 조회
     * [GET] /api/journals/statistics
     */
    @GetMapping("/statistics")
    public ResponseEntity<JournalApiDto.StatisticsResponse> getStatistics() {
        String currentUserEmail = AuthUtils.getCurrentUserEmail();
        JournalDto.Statistics statistics = journalService.getStatistics(currentUserEmail);
        JournalApiDto.StatisticsResponse response = new JournalApiDto.StatisticsResponse(statistics);

        return ResponseEntity.ok(response);
    }
}