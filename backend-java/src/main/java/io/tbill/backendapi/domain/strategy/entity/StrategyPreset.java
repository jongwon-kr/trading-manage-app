package io.tbill.backendapi.domain.strategy.entity;

import io.tbill.backendapi.domain.common.entity.BaseTimeEntity;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * 사용자 전략(분석 방법) 프리셋. config 는 Python 이 검증·정규화한 전체 설정 JSON 이다
 * (backend-python app/analysis/model/config.py StrategyConfig).
 */
@Entity
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Table(name = "strategy_preset",
        uniqueConstraints = @UniqueConstraint(name = "uk_strategy_preset_user_name", columnNames = {"user_email", "name"}),
        indexes = @Index(name = "idx_strategy_preset_user_email", columnList = "user_email"))
public class StrategyPreset extends BaseTimeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "strategy_preset_id", updatable = false)
    private Long id;

    @Column(name = "user_email", nullable = false)
    private String userEmail;

    @Column(name = "name", nullable = false, length = 50)
    private String name;

    @Column(name = "description", length = 500)
    private String description;

    @Column(name = "config", nullable = false, columnDefinition = "TEXT")
    private String config;

    /** 정규화된 설정의 지문 (백테스트 결과와 전략이 같은 설정인지 확인할 때 사용) */
    @Column(name = "config_hash", nullable = false, length = 32)
    private String configHash;

    /** 커뮤니티 게시글에서 가져온 전략이면 원본 게시글 id */
    @Column(name = "forked_from_post_id")
    private Long forkedFromPostId;

    @Builder
    public StrategyPreset(String userEmail, String name, String description, String config, String configHash,
                          Long forkedFromPostId) {
        this.userEmail = userEmail;
        this.name = name;
        this.description = description;
        this.config = config;
        this.configHash = configHash;
        this.forkedFromPostId = forkedFromPostId;
    }

    public void update(String name, String description, String config, String configHash) {
        this.name = name;
        this.description = description;
        this.config = config;
        this.configHash = configHash;
    }
}
