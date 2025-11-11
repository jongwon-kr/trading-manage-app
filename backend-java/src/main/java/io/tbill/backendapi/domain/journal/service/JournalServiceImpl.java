package io.tbill.backendapi.domain.journal.service;

import io.tbill.backendapi.domain.journal.dto.JournalDto;
import io.tbill.backendapi.domain.journal.entity.Journal;
import io.tbill.backendapi.domain.journal.repository.JournalRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;

@Slf4j
@Service
@Transactional(readOnly = true)
@RequiredArgsConstructor
public class JournalServiceImpl implements JournalService {

    private final JournalRepository journalRepository;

    /**
     * 매매일지 생성
     */
    @Override
    @Transactional
    public JournalDto.JournalInfo createJournal(JournalDto.CreateCommand command) {
        log.info("매매일지 생성 시작: authorEmail={}, symbol={}",
                command.getAuthorEmail(), command.getSymbol());

        Journal journal = command.toEntity();
        Journal savedJournal = journalRepository.save(journal);

        log.info("매매일지 생성 완료: id={}", savedJournal.getId());
        return JournalDto.JournalInfo.from(savedJournal);
    }

    /**
     * 매매일지 수정
     */
    @Override
    @Transactional
    public JournalDto.JournalInfo updateJournal(JournalDto.UpdateCommand command) {
        log.info("매매일지 수정 시작: id={}, authorEmail={}",
                command.getId(), command.getAuthorEmail());

        // 1. 조회 및 권한 검증
        Journal journal = journalRepository.findByIdAndAuthorEmail(
                        command.getId(), command.getAuthorEmail())
                .orElseThrow(() -> new IllegalArgumentException(
                        "매매일지를 찾을 수 없거나 수정 권한이 없습니다. ID: " + command.getId()));

        // 2. 변경 감지(Dirty Checking)를 통한 업데이트
        journal.update(
                command.getEntryPrice(),
                command.getStopLossPrice(),
                command.getRealizedPnL(),
                command.getReasoning()
        );

        log.info("매매일지 수정 완료: id={}", journal.getId());
        return JournalDto.JournalInfo.from(journal);
    }

    /**
     * 매매일지 삭제
     */
    @Override
    @Transactional
    public void deleteJournal(Long journalId, String authorEmail) {
        log.info("매매일지 삭제 시작: id={}, authorEmail={}", journalId, authorEmail);

        Journal journal = journalRepository.findByIdAndAuthorEmail(journalId, authorEmail)
                .orElseThrow(() -> new IllegalArgumentException(
                        "매매일지를 찾을 수 없거나 삭제 권한이 없습니다. ID: " + journalId));

        journalRepository.delete(journal);
        log.info("매매일지 삭제 완료: id={}", journalId);
    }

    /**
     * 매매일지 상세 조회
     */
    @Override
    public JournalDto.JournalInfo getJournalById(Long journalId, String authorEmail) {
        Journal journal = journalRepository.findByIdAndAuthorEmail(journalId, authorEmail)
                .orElseThrow(() -> new IllegalArgumentException(
                        "매매일지를 찾을 수 없거나 조회 권한이 없습니다. ID: " + journalId));

        return JournalDto.JournalInfo.from(journal);
    }

    /**
     * 내 매매일지 목록 조회 (페이징)
     */
    @Override
    public Page<JournalDto.JournalSummary> getMyJournals(String authorEmail, Pageable pageable) {
        Page<Journal> journals = journalRepository.findByAuthorEmail(authorEmail, pageable);
        return journals.map(JournalDto.JournalSummary::from);
    }

    /**
     * 매매일지 검색
     */
    @Override
    public Page<JournalDto.JournalSummary> searchJournals(
            JournalDto.SearchCondition condition, Pageable pageable) {

        // 조건에 따라 다른 쿼리 실행
        Page<Journal> journals;

        if (condition.getIsClosed() != null) {
            if (condition.getIsClosed()) {
                journals = journalRepository.findClosedTradesByAuthorEmail(
                        condition.getAuthorEmail(), pageable);
            } else {
                journals = journalRepository.findOpenTradesByAuthorEmail(
                        condition.getAuthorEmail(), pageable);
            }
        } else if (condition.getMarket() != null) {
            journals = journalRepository.findByAuthorEmailAndMarket(
                    condition.getAuthorEmail(), condition.getMarket(), pageable);
        } else if (condition.getSymbol() != null) {
            journals = journalRepository.findByAuthorEmailAndSymbol(
                    condition.getAuthorEmail(), condition.getSymbol(), pageable);
        } else if (condition.getStartDate() != null && condition.getEndDate() != null) {
            journals = journalRepository.findByAuthorEmailAndDateRange(
                    condition.getAuthorEmail(),
                    condition.getStartDate(),
                    condition.getEndDate(),
                    pageable);
        } else {
            journals = journalRepository.findByAuthorEmail(
                    condition.getAuthorEmail(), pageable);
        }

        return journals.map(JournalDto.JournalSummary::from);
    }

    /**
     * 진행 중인 거래 조회
     */
    @Override
    public Page<JournalDto.JournalSummary> getOpenTrades(String authorEmail, Pageable pageable) {
        Page<Journal> journals = journalRepository.findOpenTradesByAuthorEmail(
                authorEmail, pageable);
        return journals.map(JournalDto.JournalSummary::from);
    }

    /**
     * 종료된 거래 조회
     */
    @Override
    public Page<JournalDto.JournalSummary> getClosedTrades(String authorEmail, Pageable pageable) {
        Page<Journal> journals = journalRepository.findClosedTradesByAuthorEmail(
                authorEmail, pageable);
        return journals.map(JournalDto.JournalSummary::from);
    }

    /**
     * 통계 정보 조회
     */
    @Override
    public JournalDto.Statistics getStatistics(String authorEmail) {
        // 총 실현 손익
        BigDecimal totalPnL = journalRepository.getTotalPnLByAuthorEmail(authorEmail)
                .orElse(BigDecimal.ZERO);

        // 총 거래 수
        Long totalTrades = journalRepository.countByAuthorEmail(authorEmail);

        // 종료된 거래 수
        Long closedTrades = journalRepository.countByAuthorEmailAndRealizedPnLIsNotNull(authorEmail);

        // 진행 중인 거래 수
        Long openTrades = totalTrades - closedTrades;

        // 승률 계산 (실현 손익이 0보다 큰 거래 / 종료된 거래)
        BigDecimal winRate = BigDecimal.ZERO;
        if (closedTrades > 0) {
            Long winningTrades = journalRepository.countByAuthorEmailAndRealizedPnLGreaterThan(
                    authorEmail, BigDecimal.ZERO);
            winRate = BigDecimal.valueOf(winningTrades)
                    .divide(BigDecimal.valueOf(closedTrades), 4, RoundingMode.HALF_UP)
                    .multiply(BigDecimal.valueOf(100));
        }

        return JournalDto.Statistics.builder()
                .totalPnL(totalPnL)
                .totalTrades(totalTrades)
                .closedTrades(closedTrades)
                .openTrades(openTrades)
                .winRate(winRate)
                .build();
    }
}
