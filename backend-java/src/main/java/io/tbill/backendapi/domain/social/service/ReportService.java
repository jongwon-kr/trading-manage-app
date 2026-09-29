package io.tbill.backendapi.domain.social.service;

import io.tbill.backendapi.domain.content.dto.ContentDto;
import io.tbill.backendapi.domain.content.entity.Comment;
import io.tbill.backendapi.domain.content.entity.Content;
import io.tbill.backendapi.domain.content.repository.CommentRepository;
import io.tbill.backendapi.domain.content.repository.ContentRepository;
import io.tbill.backendapi.domain.content.service.AuthorDirectory;
import io.tbill.backendapi.domain.content.service.CommunityEvents;
import io.tbill.backendapi.domain.social.dto.SocialDto;
import io.tbill.backendapi.domain.social.entity.Report;
import io.tbill.backendapi.domain.social.entity.ReportStatus;
import io.tbill.backendapi.domain.social.entity.ReportTarget;
import io.tbill.backendapi.domain.social.repository.ReportRepository;
import io.tbill.backendapi.global.exception.CommunityException;
import io.tbill.backendapi.global.utils.HtmlSanitizer;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;

/**
 * 신고 접수와 관리자 처리(숨김·기각). 숨김 게시글은 목록·상세에서 빠지고 작성자에게만 '숨김 처리됨'으로 보인다.
 * 관리자 API 권한은 컨트롤러의 @PreAuthorize("hasRole('ADMIN')") 가 확인한다.
 */
@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ReportService {

    static final int MAX_MEMO = 500;

    private final ReportRepository reportRepository;
    private final ContentRepository contentRepository;
    private final CommentRepository commentRepository;
    private final AuthorDirectory authorDirectory;
    private final ApplicationEventPublisher events;

    @Transactional
    public void report(SocialDto.ReportCommand cmd) {
        String reporter = cmd.reporterEmail();
        Long contentId;
        String authorEmail;
        if (cmd.targetType() == ReportTarget.CONTENT) {
            Content c = contentRepository.findByIdNotDeleted(cmd.targetId()).filter(ct -> ct.isVisibleTo(reporter))
                    .orElseThrow(() -> CommunityException.notFound("게시글을 찾을 수 없습니다."));
            contentId = c.getId();
            authorEmail = c.getAuthorEmail();
        } else {
            Comment cm = commentRepository.findById(cmd.targetId()).filter(x -> !x.getIsDeleted())
                    .orElseThrow(() -> CommunityException.notFound("댓글을 찾을 수 없습니다."));
            contentId = cm.getContent().getId();
            authorEmail = cm.getAuthorEmail();
        }
        if (authorEmail.equals(reporter)) {
            throw CommunityException.badRequest("본인이 쓴 글은 신고할 수 없습니다.");
        }
        if (reportRepository.existsByTargetTypeAndTargetIdAndReporterEmail(cmd.targetType(), cmd.targetId(), reporter)) {
            throw CommunityException.conflict("이미 신고했습니다.");
        }
        String memo = cmd.memo() == null ? null : cmd.memo().trim();
        if (memo != null && memo.length() > MAX_MEMO) {
            throw CommunityException.badRequest("신고 사유는 " + MAX_MEMO + "자 이하로 적어 주세요.");
        }
        reportRepository.save(Report.builder().targetType(cmd.targetType()).targetId(cmd.targetId()).contentId(contentId)
                .reporterEmail(reporter).reason(cmd.reason()).memo(memo).build());
        log.info("신고 접수: {}#{} by {}", cmd.targetType(), cmd.targetId(), reporter);
    }

    // ------------------------------------------------------------------ 관리자

    public ContentDto.PageResult<SocialDto.ReportInfo> list(ReportStatus status, int page, int size) {
        PageRequest pr = PageRequest.of(Math.max(page, 0), Math.min(Math.max(size, 1), 50));
        Page<Report> p = status == null ? reportRepository.findAllByOrderByIdDesc(pr)
                : reportRepository.findByStatusOrderByIdDesc(status, pr);
        Map<String, String> names = authorDirectory.names(p.getContent().stream().map(Report::getReporterEmail).toList());
        List<SocialDto.ReportInfo> items = p.getContent().stream().map(r -> toInfo(r, names.get(r.getReporterEmail()))).toList();
        return new ContentDto.PageResult<>(items, p.getNumber(), p.getSize(), p.getTotalElements(), p.getTotalPages(), p.isLast());
    }

    /** hide=true: 대상 숨김 + 같은 대상의 열린 신고 모두 RESOLVED, false: 이 신고만 REJECTED */
    @Transactional
    public void resolve(Long reportId, boolean hide, String adminEmail) {
        Report r = reportRepository.findById(reportId).orElseThrow(() -> CommunityException.notFound("신고를 찾을 수 없습니다."));
        if (!hide) {
            r.resolve(ReportStatus.REJECTED, adminEmail);
            return;
        }
        setHidden(r.getTargetType(), r.getTargetId(), true);
        reportRepository.findByTargetTypeAndTargetIdAndStatus(r.getTargetType(), r.getTargetId(), ReportStatus.OPEN)
                .forEach(x -> x.resolve(ReportStatus.RESOLVED, adminEmail));
        r.resolve(ReportStatus.RESOLVED, adminEmail);
    }

    @Transactional
    public void setHidden(ReportTarget type, Long id, boolean hidden) {
        if (type == ReportTarget.CONTENT) {
            Content c = contentRepository.findById(id).filter(ct -> !ct.getIsDeleted())
                    .orElseThrow(() -> CommunityException.notFound("게시글을 찾을 수 없습니다."));
            if (hidden && !c.isHidden()) {
                c.hide();
                events.publishEvent(new CommunityEvents.ContentHidden(c.getId(), c.getAuthorEmail(), c.getTitle()));
            } else if (!hidden) {
                c.unhide();
            }
        } else {
            Comment cm = commentRepository.findById(id).filter(x -> !x.getIsDeleted())
                    .orElseThrow(() -> CommunityException.notFound("댓글을 찾을 수 없습니다."));
            if (hidden && !cm.isHidden()) {
                cm.hide();
                events.publishEvent(new CommunityEvents.ContentHidden(cm.getContent().getId(), cm.getAuthorEmail(),
                        "댓글: " + HtmlSanitizer.excerpt(cm.getComment(), 60)));
            } else if (!hidden) {
                cm.unhide();
            }
        }
        log.info("관리자 {}: {}#{}", hidden ? "숨김" : "숨김 해제", type, id);
    }

    private SocialDto.ReportInfo toInfo(Report r, String reporterName) {
        String title = null;
        String preview = null;
        boolean hidden = false;
        if (r.getTargetType() == ReportTarget.CONTENT) {
            Content c = contentRepository.findById(r.getTargetId()).orElse(null);
            if (c != null) {
                title = c.getTitle();
                preview = HtmlSanitizer.excerpt(c.getContent(), 120);
                hidden = c.isHidden();
            }
        } else {
            Comment cm = commentRepository.findById(r.getTargetId()).orElse(null);
            if (cm != null) {
                title = cm.getContent().getTitle();
                preview = HtmlSanitizer.excerpt(cm.getComment(), 120);
                hidden = cm.isHidden();
            }
        }
        return new SocialDto.ReportInfo(r.getId(), r.getTargetType(), r.getTargetId(), r.getContentId(), title, preview,
                hidden, reporterName, r.getReason(), r.getMemo(), r.getStatus(), r.getResolvedBy(), r.getCreatedAt());
    }
}
