package io.tbill.backendapi.domain.watchlist.repository;

import io.tbill.backendapi.domain.market.entity.InstrumentMarket;
import io.tbill.backendapi.domain.watchlist.entity.WatchlistItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;

public interface WatchlistItemRepository extends JpaRepository<WatchlistItem, Long> {

    List<WatchlistItem> findByUserEmailOrderBySortOrderAscIdAsc(String userEmail);

    Optional<WatchlistItem> findByIdAndUserEmail(Long id, String userEmail);

    boolean existsByUserEmailAndMarketAndCode(String userEmail, InstrumentMarket market, String code);

    long countByUserEmail(String userEmail);

    @Query("SELECT COALESCE(MAX(w.sortOrder), -1) FROM WatchlistItem w WHERE w.userEmail = :userEmail")
    int findMaxSortOrder(String userEmail);
}
