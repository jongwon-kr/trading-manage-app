package io.tbill.backendapi.presentation.journal.controller;

import io.tbill.backendapi.domain.journal.dto.JournalDto;
import io.tbill.backendapi.domain.journal.service.JournalService;
import io.tbill.backendapi.global.utils.auth.AuthUtils;
import io.tbill.backendapi.presentation.journal.dto.JournalApiDto;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.stream.Collectors;

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
            @RequestBody JournalApiDto.CreateRequest request // 1. Presentation DTO로 받음
    ) {
        // (필수) Spring Security 등에서 현재 인증된 사용자 Email을 가져와야 함
        String currentUserEmail = AuthUtils.getCurrentUserEmail();

        // 2. Presentation DTO -> Domain DTO(Command) 변환 (이메일 주입)
        JournalDto.CreateCommand command = request.toCommand(currentUserEmail);

        // 3. Domain Service 호출
        JournalDto.JournalInfo journalInfo = journalService.createJournal(command);

        // 4. Domain DTO(Info) -> Presentation DTO(Response) 변환
        JournalApiDto.JournalResponse response = new JournalApiDto.JournalResponse(journalInfo);

        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    /**
     * 내 매매일지 목록 조회
     * [GET] /api/journals
     */
    @GetMapping
    public ResponseEntity<List<JournalApiDto.JournalResponse>> getMyJournals() {
        String currentUserEmail = AuthUtils.getCurrentUserEmail();

        List<JournalDto.JournalInfo> journalInfos = journalService.getJournalsByUserEmail(currentUserEmail);

        List<JournalApiDto.JournalResponse> responses = journalInfos.stream()
                .map(JournalApiDto.JournalResponse::new)
                .collect(Collectors.toList());

        return ResponseEntity.ok(responses);
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
}