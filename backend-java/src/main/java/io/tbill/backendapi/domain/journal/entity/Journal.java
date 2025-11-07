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
    private Long id; // 매매 ID

    @Column(name = "author_email", nullable = false)
    private String authorEmail; // 작성자 email (User 엔티티와 ManyToOne으로 연결할 수도 있음)

    @Enumerated(EnumType.STRING)
    @Column(name = "market", nullable = false)
    private MarketType market; // 시장 (주식, 암호화폐 등)

    @Column(name = "symbol", nullable = false)
    private String symbol; // 심볼 (BTC, AAPL 등)

    // 돈(가격, 손익) 관련 필드는 부동소수점(float, double) 오류를 피하기 위해 BigDecimal 사용
    @Column(name = "entry_price", nullable = false)
    private BigDecimal entryPrice; // 진입가

    @Column(name = "stop_loss_price") // 손절가는 선택적일 수 있음
    private BigDecimal stopLossPrice; // 손절가

    // (선택) 목표가도 추가할 수 있습니다.
    // @Column(name = "take_profit_price")
    // private BigDecimal takeProfitPrice;

    @Column(name = "realized_pnl") // 손익 (실현 손익), 매매 종료 전엔 null일 수 있음
    private BigDecimal realizedPnL;

    /**
     * 매매 이유 마크다운 (차트사진등이 같이 포함되어있어야함 json)
     * - 가장 유연한 방법은 이 필드를 JSON 구조체를 가진 문자열로 저장하는 것입니다.
     * - 예: {"markdown": "# 매매 근거...", "images": ["url1.jpg", "url2.png"]}
     * - DB의 TEXT 타입(혹은 JSON 타입)을 사용합니다.
     */
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
}