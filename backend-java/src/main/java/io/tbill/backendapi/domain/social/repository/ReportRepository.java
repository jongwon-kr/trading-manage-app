package io.tbill.backendapi.domain.social.repository;

import io.tbill.backendapi.domain.social.entity.Report;
import io.tbill.backendapi.domain.social.entity.ReportStatus;
import io.tbill.backendapi.domain.social.entity.ReportTarget;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ReportRepository extends JpaRepository<Report, Long> {

    boolean existsByTargetTypeAndTargetIdAndReporterEmail(ReportTarget targetType, Long targetId, String reporterEmail);

    Page<Report> findByStatusOrderByIdDesc(ReportStatus status, Pageable pageable);

    Page<Report> findAllByOrderByIdDesc(Pageable pageable);

    List<Report> findByTargetTypeAndTargetIdAndStatus(ReportTarget targetType, Long targetId, ReportStatus status);
}
