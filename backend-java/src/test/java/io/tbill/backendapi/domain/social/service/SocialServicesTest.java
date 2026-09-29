package io.tbill.backendapi.domain.social.service;

import io.tbill.backendapi.domain.content.entity.Comment;
import io.tbill.backendapi.domain.content.entity.Content;
import io.tbill.backendapi.domain.content.entity.ContentCategory;
import io.tbill.backendapi.domain.content.repository.CommentRepository;
import io.tbill.backendapi.domain.content.repository.ContentRepository;
import io.tbill.backendapi.domain.content.service.AuthorDirectory;
import io.tbill.backendapi.domain.content.service.CommunityEvents;
import io.tbill.backendapi.domain.social.dto.SocialDto;
import io.tbill.backendapi.domain.social.entity.*;
import io.tbill.backendapi.domain.social.repository.FollowRepository;
import io.tbill.backendapi.domain.social.repository.NotificationRepository;
import io.tbill.backendapi.domain.social.repository.ReportRepository;
import io.tbill.backendapi.domain.user.entity.User;
import io.tbill.backendapi.domain.user.repository.UserRepository;
import io.tbill.backendapi.global.exception.CommunityException;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.http.HttpStatus;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class SocialServicesTest {

    private static final String ME = "me@x.io";
    private static final String YOU = "you@x.io";

    @Nested
    @ExtendWith(MockitoExtension.class)
    class Follows {
        @Mock FollowRepository followRepository;
        @Mock UserRepository userRepository;
        @Mock ContentRepository contentRepository;
        @Mock ApplicationEventPublisher events;
        @InjectMocks FollowService service;

        @Test
        @DisplayName("자기 자신 팔로우는 400, 팔로우는 멱등이고 처음 한 번만 알림 이벤트")
        void follow() {
            when(userRepository.findByUsername("me")).thenReturn(Optional.of(User.builder().username("me").email(ME).build()));
            assertThatThrownBy(() -> service.follow("me", ME))
                    .isInstanceOf(CommunityException.class).extracting("status").isEqualTo(HttpStatus.BAD_REQUEST);

            when(userRepository.findByUsername("you")).thenReturn(Optional.of(User.builder().username("you").email(YOU).build()));
            when(followRepository.existsByFollowerEmailAndFolloweeEmail(ME, YOU)).thenReturn(false, true);
            when(followRepository.countByFolloweeEmail(YOU)).thenReturn(1L);
            assertThat(service.follow("you", ME)).isEqualTo(new SocialDto.FollowResult(true, 1));
            service.follow("you", ME);
            verify(followRepository, times(1)).save(any(Follow.class));
            verify(events, times(1)).publishEvent(new FollowService.Followed(ME, YOU));
        }
    }

    @Nested
    @ExtendWith(MockitoExtension.class)
    class Notifications {
        @Mock NotificationRepository notificationRepository;
        @Mock FollowRepository followRepository;
        @Mock AuthorDirectory authors;
        @InjectMocks NotificationService service;

        @Test
        @DisplayName("본인 글에 본인이 댓글·좋아요하면 알림 없음, 남이 하면 작성자에게 알림")
        void selfActionIsSilent() {
            service.onCommented(new CommunityEvents.Commented(1L, ME, ME, "글"));
            service.onLiked(new CommunityEvents.Liked(1L, ME, ME, "글"));
            verifyNoInteractions(notificationRepository);

            when(authors.name(YOU)).thenReturn("너");
            service.onCommented(new CommunityEvents.Commented(1L, ME, YOU, "글"));
            ArgumentCaptor<Notification> captor = ArgumentCaptor.forClass(Notification.class);
            verify(notificationRepository).save(captor.capture());
            Notification n = captor.getValue();
            assertThat(n.getRecipientEmail()).isEqualTo(ME);
            assertThat(n.getType()).isEqualTo(NotificationType.COMMENT);
            assertThat(n.getActorName()).isEqualTo("너");
        }

        @Test
        @DisplayName("새 글: 팔로워 모두에게 알림 (상한 500)")
        void postedFanOut() {
            when(followRepository.findFollowerEmails(any(), any())).thenReturn(List.of("a@x.io", "b@x.io"));
            when(authors.name(ME)).thenReturn("나");
            service.onPosted(new CommunityEvents.Posted(3L, ME, "새 글"));
            @SuppressWarnings("unchecked")
            ArgumentCaptor<List<Notification>> captor = ArgumentCaptor.forClass(List.class);
            verify(notificationRepository).saveAll(captor.capture());
            assertThat(captor.getValue()).extracting(Notification::getRecipientEmail).containsExactly("a@x.io", "b@x.io");
            assertThat(captor.getValue()).allMatch(n -> n.getType() == NotificationType.NEW_POST_FROM_FOLLOWEE);
        }
    }

    @Nested
    @ExtendWith(MockitoExtension.class)
    class Reports {
        @Mock ReportRepository reportRepository;
        @Mock ContentRepository contentRepository;
        @Mock CommentRepository commentRepository;
        @Mock AuthorDirectory authors;
        @Mock ApplicationEventPublisher events;
        @InjectMocks ReportService service;

        private Content post(String author) {
            Content c = Content.builder().category(ContentCategory.FREE_BOARD).title("광고글").content("").authorEmail(author).build();
            ReflectionTestUtils.setField(c, "id", 1L);
            return c;
        }

        @Test
        @DisplayName("신고: 본인 글 400, 중복 409, 정상 접수는 OPEN")
        void report() {
            when(contentRepository.findByIdNotDeleted(1L)).thenReturn(Optional.of(post(YOU)));
            var cmd = new SocialDto.ReportCommand(ME, ReportTarget.CONTENT, 1L, ReportReason.SPAM, "광고");
            when(reportRepository.existsByTargetTypeAndTargetIdAndReporterEmail(ReportTarget.CONTENT, 1L, ME)).thenReturn(false, true);
            service.report(cmd);
            ArgumentCaptor<Report> captor = ArgumentCaptor.forClass(Report.class);
            verify(reportRepository).save(captor.capture());
            assertThat(captor.getValue().getStatus()).isEqualTo(ReportStatus.OPEN);
            assertThatThrownBy(() -> service.report(cmd))
                    .isInstanceOf(CommunityException.class).extracting("status").isEqualTo(HttpStatus.CONFLICT);

            when(contentRepository.findByIdNotDeleted(1L)).thenReturn(Optional.of(post(ME)));
            assertThatThrownBy(() -> service.report(cmd))
                    .isInstanceOf(CommunityException.class).extracting("status").isEqualTo(HttpStatus.BAD_REQUEST);
        }

        @Test
        @DisplayName("숨김 처리: 대상이 숨겨지고 같은 대상 신고 모두 RESOLVED, 작성자 알림 이벤트")
        void resolveHide() {
            Content c = post(YOU);
            Report r1 = Report.builder().targetType(ReportTarget.CONTENT).targetId(1L).contentId(1L).reporterEmail(ME)
                    .reason(ReportReason.SPAM).build();
            Report r2 = Report.builder().targetType(ReportTarget.CONTENT).targetId(1L).contentId(1L).reporterEmail("z@x.io")
                    .reason(ReportReason.ABUSE).build();
            when(reportRepository.findById(10L)).thenReturn(Optional.of(r1));
            when(contentRepository.findById(1L)).thenReturn(Optional.of(c));
            when(reportRepository.findByTargetTypeAndTargetIdAndStatus(ReportTarget.CONTENT, 1L, ReportStatus.OPEN))
                    .thenReturn(List.of(r1, r2));

            service.resolve(10L, true, "admin@x.io");

            assertThat(c.isHidden()).isTrue();
            assertThat(List.of(r1, r2)).allMatch(r -> r.getStatus() == ReportStatus.RESOLVED);
            verify(events).publishEvent(new CommunityEvents.ContentHidden(1L, YOU, "광고글"));
        }

        @Test
        @DisplayName("기각: 이 신고만 REJECTED, 숨김 없음")
        void resolveReject() {
            Report r = Report.builder().targetType(ReportTarget.COMMENT).targetId(2L).contentId(1L).reporterEmail(ME)
                    .reason(ReportReason.OTHER).build();
            when(reportRepository.findById(11L)).thenReturn(Optional.of(r));
            service.resolve(11L, false, "admin@x.io");
            assertThat(r.getStatus()).isEqualTo(ReportStatus.REJECTED);
            verifyNoInteractions(commentRepository, events);
        }
    }

    @Test
    @DisplayName("댓글 숨김 해제 경로 (Comment.hide/unhide)")
    void commentHideFlags() {
        Comment c = Comment.builder().content(null).authorEmail(ME).comment("x").build();
        c.hide();
        assertThat(c.isHidden()).isTrue();
        c.unhide();
        assertThat(c.isHidden()).isFalse();
    }
}
