package io.tbill.backendapi.domain.content.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import io.tbill.backendapi.domain.content.dto.ContentDto;
import io.tbill.backendapi.domain.content.entity.Content;
import io.tbill.backendapi.domain.content.entity.ContentCategory;
import io.tbill.backendapi.domain.content.entity.ContentLike;
import io.tbill.backendapi.domain.content.repository.ContentLikeRepository;
import io.tbill.backendapi.domain.content.repository.ContentRepository;
import io.tbill.backendapi.global.exception.CommunityException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.http.HttpStatus;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyCollection;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ContentServiceImplTest {

    private static final String ME = "me@x.io";
    private static final String OTHER = "other@x.io";

    @Mock private ContentRepository contentRepository;
    @Mock private ContentLikeRepository likeRepository;
    @Mock private AuthorDirectory authors;
    @Mock private FollowingProvider followingProvider;
    @Mock private ApplicationEventPublisher events;

    private ContentServiceImpl service;

    @BeforeEach
    void setUp() {
        service = new ContentServiceImpl(contentRepository, likeRepository, authors, followingProvider, new ObjectMapper(), events);
        lenient().when(authors.names(anyCollection())).thenReturn(Map.of(ME, "나", OTHER, "남"));
    }

    private Content post(long id, String author) {
        Content c = Content.builder().category(ContentCategory.FREE_BOARD).title("t").content("<p>b</p>").authorEmail(author).build();
        ReflectionTestUtils.setField(c, "id", id);
        return c;
    }

    @Test
    @DisplayName("작성: 본문 HTML 을 정화해 저장하고 팔로워 알림용 이벤트를 발행한다")
    void createSanitizes() {
        when(contentRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        var detail = service.createContent(new ContentDto.CreateCommand(ME, ContentCategory.FREE_BOARD, " 제목 ",
                "<p>본문</p><script>alert(1)</script><img src=x onerror=alert(2)>", false));
        assertThat(detail.title()).isEqualTo("제목");
        assertThat(detail.body()).contains("<p>본문</p>").doesNotContain("script", "onerror");
        assertThat(detail.authorName()).isEqualTo("나");
        verify(events).publishEvent(any(CommunityEvents.Posted.class));
    }

    @Test
    @DisplayName("작성: 공유 카테고리는 직접 쓸 수 없고, 공지는 관리자만")
    void createCategoryRules() {
        assertThatThrownBy(() -> service.createContent(new ContentDto.CreateCommand(ME, ContentCategory.STRATEGY_SHARE, "t", "", false)))
                .isInstanceOf(CommunityException.class);
        assertThatThrownBy(() -> service.createContent(new ContentDto.CreateCommand(ME, ContentCategory.NOTICE, "t", "", false)))
                .isInstanceOf(CommunityException.class);
        when(contentRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        assertThat(service.createContent(new ContentDto.CreateCommand(ME, ContentCategory.NOTICE, "공지", "", true)).category())
                .isEqualTo(ContentCategory.NOTICE);
    }

    @Test
    @DisplayName("수정·삭제: 남의 글은 403")
    void ownerOnly() {
        when(contentRepository.findByIdNotDeleted(1L)).thenReturn(Optional.of(post(1, OTHER)));
        assertThatThrownBy(() -> service.updateContent(new ContentDto.UpdateCommand(1L, ME, "t", "b")))
                .isInstanceOf(CommunityException.class).extracting("status").isEqualTo(HttpStatus.FORBIDDEN);
        assertThatThrownBy(() -> service.deleteContent(1L, ME)).isInstanceOf(CommunityException.class);
    }

    @Test
    @DisplayName("좋아요는 멱등: 두 번 눌러도 1개, 취소하면 0")
    void likeIdempotent() {
        Content c = post(1, OTHER);
        when(contentRepository.findByIdNotDeleted(1L)).thenReturn(Optional.of(c));
        when(likeRepository.existsByContentIdAndUserEmail(1L, ME)).thenReturn(false, true);
        assertThat(service.like(1L, ME).likeCount()).isEqualTo(1);
        assertThat(service.like(1L, ME).likeCount()).isEqualTo(1);
        verify(likeRepository, times(1)).save(any(ContentLike.class));
        verify(events, times(1)).publishEvent(any(CommunityEvents.Liked.class));

        when(likeRepository.findByContentIdAndUserEmail(1L, ME)).thenReturn(Optional.of(new ContentLike(1L, ME)));
        assertThat(service.unlike(1L, ME)).isEqualTo(new ContentDto.LikeResult(false, 0));
    }

    @Test
    @DisplayName("숨김 글: 작성자에게만 보이고 다른 사람에게는 404")
    void hiddenVisibility() {
        Content c = post(1, OTHER);
        c.hide();
        when(contentRepository.findByIdNotDeleted(1L)).thenReturn(Optional.of(c));
        assertThatThrownBy(() -> service.getContent(1L, ME))
                .isInstanceOf(CommunityException.class).extracting("status").isEqualTo(HttpStatus.NOT_FOUND);
        var own = service.getContent(1L, OTHER);
        assertThat(own.hidden()).isTrue();
        assertThat(own.viewCount()).isEqualTo(1);
    }

    @Test
    @DisplayName("공유 글 상세: 첨부 스냅샷 JSON 을 그대로 돌려준다")
    void attachmentPost() throws Exception {
        when(contentRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        var snap = new ObjectMapper().readTree("{\"name\":\"전략\",\"config\":{\"a\":1}}");
        var d = service.createAttachmentPost(new ContentDto.AttachmentPostCommand(ME, ContentCategory.STRATEGY_SHARE, "t", "",
                io.tbill.backendapi.domain.content.entity.AttachmentType.STRATEGY, snap, "KR_STOCK:005930", 0.12, -0.2));
        assertThat(d.attachment().path("config").path("a").asInt()).isEqualTo(1);
        ArgumentCaptor<Content> captor = ArgumentCaptor.forClass(Content.class);
        verify(contentRepository).save(captor.capture());
        assertThat(captor.getValue().getMetricReturn()).isEqualTo(0.12);
    }
}
