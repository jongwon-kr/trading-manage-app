package io.tbill.backendapi.domain.journal.entity;

import io.tbill.backendapi.domain.common.entity.BaseTimeEntity;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Entity
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Table(name = "journal", indexes = {
        @Index(name = "idx_author_email", columnList = "author_email"),
        @Index(name = "idx_symbol", columnList = "symbol")
})
public class Journal extends BaseTimeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "journal_id", updatable = false)
    private Long id;

    @Column(name = "author_email", nullable = false)
    private String authorEmail;

    @Enumerated(EnumType.STRING)
    @Column(name = "market", nullable = false)
    private MarketType market;

    @Column(name = "symbol", nullable = false)
    private String symbol;

    @Column(name = "entry_price", nullable = false)
    private BigDecimal entryPrice;

    @Column(name = "stop_loss_price")
    private BigDecimal stopLossPrice;

    @Column(name = "realized_pnl")
    private BigDecimal realizedPnL;

    @Column(name = "reasoning", columnDefinition = "TEXT")
    private String reasoning;

    @Builder
    public Journal(String authorEmail, MarketType market, String symbol,
                   BigDecimal entryPrice, BigDecimal stopLossPrice,
                   BigDecimal realizedPnL, String reasoning) {
        this.authorEmail = authorEmail;
        this.market = market;
        this.symbol = symbol;
        this.entryPrice = entryPrice;
        this.stopLossPrice = stopLossPrice;
        this.realizedPnL = realizedPnL;
        this.reasoning = reasoning;
    }

    /**
     * 매매일지 수정 (변경 감지)
     */
    public void update(BigDecimal entryPrice, BigDecimal stopLossPrice,
                       BigDecimal realizedPnL, String reasoning) {
        if (entryPrice != null) {
            this.entryPrice = entryPrice;
        }
        if (stopLossPrice != null) {
            this.stopLossPrice = stopLossPrice;
        }
        if (realizedPnL != null) {
            this.realizedPnL = realizedPnL;
        }
        if (reasoning != null) {
            this.reasoning = reasoning;
        }
    }
}
