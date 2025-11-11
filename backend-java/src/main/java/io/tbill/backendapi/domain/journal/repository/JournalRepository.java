package io.tbill.backendapi.domain.journal.repository;

import io.tbill.backendapi.domain.journal.entity.Journal;
import io.tbill.backendapi.domain.journal.entity.MarketType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface JournalRepository extends JpaRepository<Journal, Long> {

    Page<Journal> findByAuthorEmail(String authorEmail, Pageable pageable);
    Page<Journal> findByAuthorEmailAndSymbol(String authorEmail, String symbol, Pageable pageable);
    Page<Journal> findByAuthorEmailAndMarket(String authorEmail, MarketType market, Pageable pageable);
    Optional<Journal> findByIdAndAuthorEmail(Long id, String authorEmail);

    @Query("SELECT j FROM Journal j WHERE j.authorEmail = :authorEmail " +
            "AND j.createdAt BETWEEN :startDate AND :endDate " +
            "ORDER BY j.createdAt DESC")
    Page<Journal> findByAuthorEmailAndDateRange(
            @Param("authorEmail") String authorEmail,
            @Param("startDate") LocalDateTime startDate,
            @Param("endDate") LocalDateTime endDate,
            Pageable pageable
    );

    @Query("SELECT j FROM Journal j WHERE j.authorEmail = :authorEmail " +
            "AND j.realizedPnL IS NOT NULL " +
            "ORDER BY j.createdAt DESC")
    Page<Journal> findClosedTradesByAuthorEmail(
            @Param("authorEmail") String authorEmail,
            Pageable pageable
    );

    @Query("SELECT j FROM Journal j WHERE j.authorEmail = :authorEmail " +
            "AND j.realizedPnL IS NULL " +
            "ORDER BY j.createdAt DESC")
    Page<Journal> findOpenTradesByAuthorEmail(
            @Param("authorEmail") String authorEmail,
            Pageable pageable
    );

    @Query("SELECT SUM(j.realizedPnL) FROM Journal j WHERE j.authorEmail = :authorEmail " +
            "AND j.realizedPnL IS NOT NULL")
    Optional<BigDecimal> getTotalPnLByAuthorEmail(@Param("authorEmail") String authorEmail);

    // 통계용 추가 메서드
    Long countByAuthorEmail(String authorEmail);

    Long countByAuthorEmailAndRealizedPnLIsNotNull(String authorEmail);

    Long countByAuthorEmailAndRealizedPnLGreaterThan(String authorEmail, BigDecimal value);
}
