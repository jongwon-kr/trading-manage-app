package io.tbill.backendapi.domain.social.service;

import io.tbill.backendapi.domain.content.dto.ContentDto;
import io.tbill.backendapi.domain.content.service.AuthorDirectory;
import io.tbill.backendapi.domain.content.service.CommunityEvents;
import io.tbill.backendapi.domain.social.dto.SocialDto;
import io.tbill.backendapi.domain.social.entity.Notification;
import io.tbill.backendapi.domain.social.entity.NotificationType;
import io.tbill.backendapi.domain.social.repository.FollowRepository;
import io.tbill.backendapi.domain.social.repository.NotificationRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.event.TransactionalEventListener;

import java.util.List;

/**
 * 알림. 커뮤니티 이벤트를 원 트랜잭션 커밋 후(AFTER_COMMIT) 새 트랜잭션으로 저장한다 —
 * 알림 저장이 실패해도 댓글·좋아요 자체는 롤백되지 않는다. 본인이 본인 글에 한 행동은 알리지 않는다.
 * 프론트는 unread-count 를 폴링한다 (실시간 push 없음).
 */
@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class NotificationService {

    /** 팔로워가 많은 작성자의 새 글 알림 상한 */
    static final int MAX_FOLLOWER_FANOUT = 500;
    static final int MAX_PAGE_SIZE = 50;

    private final NotificationRepository notificationRepository;
    private final FollowRepository followRepository;
    private final AuthorDirectory authorDirectory;

    public ContentDto.PageResult<SocialDto.NotificationInfo> list(String email, boolean unreadOnly, int page, int size) {
        PageRequest pr = PageRequest.of(Math.max(page, 0), Math.min(Math.max(size, 1), MAX_PAGE_SIZE));
        Page<Notification> p = unreadOnly ? notificationRepository.findByRecipientEmailAndReadFalseOrderByIdDesc(email, pr)
                : notificationRepository.findByRecipientEmailOrderByIdDesc(email, pr);
        List<SocialDto.NotificationInfo> items = p.getContent().stream().map(n -> new SocialDto.NotificationInfo(
                n.getId(), n.getType(), n.getActorName(), n.getContentId(), n.getMessage(), n.isRead(), n.getCreatedAt())).toList();
        return new ContentDto.PageResult<>(items, p.getNumber(), p.getSize(), p.getTotalElements(), p.getTotalPages(), p.isLast());
    }

    public long unreadCount(String email) {
        return notificationRepository.countByRecipientEmailAndReadFalse(email);
    }

    @Transactional
    public void markRead(Long id, String email) {
        notificationRepository.findByIdAndRecipientEmail(id, email).ifPresent(Notification::markRead);
    }

    @Transactional
    public int markAllRead(String email) {
        return notificationRepository.markAllRead(email);
    }

    // ------------------------------------------------------------------ 이벤트 → 알림

    @TransactionalEventListener(fallbackExecution = true)
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void onCommented(CommunityEvents.Commented e) {
        notifyAuthor(e.contentAuthorEmail(), e.actorEmail(), NotificationType.COMMENT, e.contentId(), e.contentTitle());
    }

    @TransactionalEventListener(fallbackExecution = true)
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void onLiked(CommunityEvents.Liked e) {
        notifyAuthor(e.contentAuthorEmail(), e.actorEmail(), NotificationType.LIKE, e.contentId(), e.contentTitle());
    }

    @TransactionalEventListener(fallbackExecution = true)
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void onImported(CommunityEvents.Imported e) {
        notifyAuthor(e.contentAuthorEmail(), e.actorEmail(), NotificationType.IMPORT, e.contentId(), e.contentTitle());
    }

    @TransactionalEventListener(fallbackExecution = true)
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void onFollowed(FollowService.Followed e) {
        notifyAuthor(e.followeeEmail(), e.followerEmail(), NotificationType.FOLLOW, null, null);
    }

    @TransactionalEventListener(fallbackExecution = true)
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void onPosted(CommunityEvents.Posted e) {
        List<String> followers = followRepository.findFollowerEmails(e.authorEmail(), PageRequest.of(0, MAX_FOLLOWER_FANOUT));
        if (followers.isEmpty()) {
            return;
        }
        String actor = authorDirectory.name(e.authorEmail());
        notificationRepository.saveAll(followers.stream().map(f -> Notification.builder()
                .recipientEmail(f).type(NotificationType.NEW_POST_FROM_FOLLOWEE).actorName(actor)
                .contentId(e.contentId()).message(truncate(e.contentTitle())).build()).toList());
    }

    @TransactionalEventListener(fallbackExecution = true)
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void onContentHidden(CommunityEvents.ContentHidden e) {
        notificationRepository.save(Notification.builder().recipientEmail(e.contentAuthorEmail())
                .type(NotificationType.POST_HIDDEN).actorName("관리자").contentId(e.contentId())
                .message(truncate(e.contentTitle())).build());
    }

    private void notifyAuthor(String recipientEmail, String actorEmail, NotificationType type, Long contentId, String title) {
        if (recipientEmail == null || recipientEmail.equals(actorEmail)) {
            return; // 본인 행동은 알리지 않는다
        }
        notificationRepository.save(Notification.builder().recipientEmail(recipientEmail).type(type)
                .actorName(authorDirectory.name(actorEmail)).contentId(contentId).message(truncate(title)).build());
    }

    private static String truncate(String s) {
        return s == null ? null : s.length() > 100 ? s.substring(0, 100) + "…" : s;
    }
}
