package io.tbill.backendapi.domain.watchlist.entity;

import io.tbill.backendapi.domain.common.entity.BaseTimeEntity;
import io.tbill.backendapi.domain.market.entity.InstrumentMarket;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Table(name = "watchlist_item",
        uniqueConstraints = @UniqueConstraint(name = "uk_watchlist_user_symbol", columnNames = {"user_email", "market", "code"}),
        indexes = @Index(name = "idx_watchlist_user_email", columnList = "user_email"))
public class WatchlistItem extends BaseTimeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "watchlist_item_id", updatable = false)
    private Long id;

    @Column(name = "user_email", nullable = false)
    private String userEmail;

    @Enumerated(EnumType.STRING)
    @Column(name = "market", nullable = false, length = 16)
    private InstrumentMarket market;

    @Column(name = "code", nullable = false, length = 32)
    private String code;

    /** 추가 시점의 종목명 (목록 표시용 스냅샷) */
    @Column(name = "name", nullable = false, length = 100)
    private String name;

    @Column(name = "sort_order", nullable = false)
    private int sortOrder;

    @Builder
    public WatchlistItem(String userEmail, InstrumentMarket market, String code, String name, int sortOrder) {
        this.userEmail = userEmail;
        this.market = market;
        this.code = code;
        this.name = name;
        this.sortOrder = sortOrder;
    }

    public void changeSortOrder(int sortOrder) {
        this.sortOrder = sortOrder;
    }
}
