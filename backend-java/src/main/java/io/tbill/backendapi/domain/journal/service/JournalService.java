package io.tbill.backendapi.domain.journal.service;

import io.tbill.backendapi.domain.journal.dto.JournalDto;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface JournalService {

    /**
     * 매매일지 생성
     */
    JournalDto.JournalInfo createJournal(JournalDto.CreateCommand command);

    /**
     * 매매일지 수정
     */
    JournalDto.JournalInfo updateJournal(JournalDto.UpdateCommand command);

    /**
     * 매매일지 삭제
     */
    void deleteJournal(Long journalId, String authorEmail);

    /**
     * 매매일지 상세 조회
     */
    JournalDto.JournalInfo getJournalById(Long journalId, String authorEmail);

    /**
     * 내 매매일지 목록 조회 (페이징)
     */
    Page<JournalDto.JournalSummary> getMyJournals(String authorEmail, Pageable pageable);

    /**
     * 매매일지 검색
     */
    Page<JournalDto.JournalSummary> searchJournals(JournalDto.SearchCondition condition, Pageable pageable);

    /**
     * 진행 중인 거래 조회
     */
    Page<JournalDto.JournalSummary> getOpenTrades(String authorEmail, Pageable pageable);

    /**
     * 종료된 거래 조회
     */
    Page<JournalDto.JournalSummary> getClosedTrades(String authorEmail, Pageable pageable);

    /**
     * 통계 정보 조회
     */
    JournalDto.Statistics getStatistics(String authorEmail);
}
