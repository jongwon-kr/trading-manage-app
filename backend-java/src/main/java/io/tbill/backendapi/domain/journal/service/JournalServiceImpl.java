package io.tbill.backendapi.domain.journal.service;

import io.tbill.backendapi.domain.journal.dto.JournalDto;
import io.tbill.backendapi.domain.journal.entity.Journal;
import io.tbill.backendapi.domain.journal.repository.JournalRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@Transactional(readOnly = true)
@RequiredArgsConstructor
public class JournalServiceImpl implements JournalService {
    private final JournalRepository journalRepository;
    // private final UserService userService; // (확장) 사용자 존재 여부 검증용

    /**
     * 매매일지 생성
     */
    @Transactional
    public JournalDto.JournalInfo createJournal(JournalDto.CreateCommand command) {
        // (확장) command.getAuthorEmail()로 실제 사용자가 존재하는지 확인할 수 있음
        // userService.validateUserExists(command.getAuthorEmail());

        Journal journal = command.toEntity();
        Journal savedJournal = journalRepository.save(journal);
        return JournalDto.JournalInfo.from(savedJournal);
    }

    /**
     * 특정 사용자의 모든 매매일지 조회
     */
    public List<JournalDto.JournalInfo> getJournalsByUserEmail(String email) {
        List<Journal> journals = journalRepository.findByAuthorEmailOrderByCreatedAtDesc(email);

        return journals.stream()
                .map(JournalDto.JournalInfo::from)
                .collect(Collectors.toList());
    }

    /**
     * 매매일지 상세 조회
     */
    public JournalDto.JournalInfo getJournalById(Long journalId, String authorEmail) {
        Journal journal = journalRepository.findById(journalId)
                .orElseThrow(() -> new IllegalArgumentException("매매일지를 찾을 수 없습니다. ID: " + journalId));

        // (보안) 본인의 일지만 조회 가능하도록 검증
        if (!journal.getAuthorEmail().equals(authorEmail)) {
            throw new RuntimeException("조회 권한이 없습니다."); // (개선) Custom AccessDeniedException
        }

        return JournalDto.JournalInfo.from(journal);
    }

    // (기타: 매매일지 수정(손익 입력), 삭제 등 메서드 추가)
}
