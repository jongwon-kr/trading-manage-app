package io.tbill.backendapi.domain.social.entity;

import io.tbill.backendapi.domain.common.entity.BaseTimeEntity;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

/** 게시글·댓글 신고. 같은 사람이 같은 대상을 두 번 신고할 수 없다 */
@Entity
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Table(name = "report",
        uniqueConstraints = @UniqueConstraint(name = "uk_report", columnNames = {"target_type", "target_id", "reporter_email"}),
        indexes = @Index(name = "idx_report_status", columnList = "status"))
public class Report extends BaseTimeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "report_id", updatable = false)
    private Long id;

    @Enumerated(EnumType.STRING)
    @Column(name = "target_type", nullable = false, length = 16)
    private ReportTarget targetType;

    @Column(name = "target_id", nullable = false)
    private Long targetId;

    /** 대상이 댓글이면 그 댓글의 게시글 (관리 화면 링크용) */
    @Column(name = "content_id", nullable = false)
    private Long contentId;

    @Column(name = "reporter_email", nullable = false)
    private String reporterEmail;

    @Enumerated(EnumType.STRING)
    @Column(name = "reason", nullable = false, length = 32)
    private ReportReason reason;

    @Column(name = "memo", length = 500)
    private String memo;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 16)
    private ReportStatus status;

    @Column(name = "resolved_by")
    private String resolvedBy;

    @Builder
    public Report(ReportTarget targetType, Long targetId, Long contentId, String reporterEmail, ReportReason reason,
                  String memo) {
        this.targetType = targetType;
        this.targetId = targetId;
        this.contentId = contentId;
        this.reporterEmail = reporterEmail;
        this.reason = reason;
        this.memo = memo;
        this.status = ReportStatus.OPEN;
    }

    public void resolve(ReportStatus status, String adminEmail) {
        this.status = status;
        this.resolvedBy = adminEmail;
    }
}
