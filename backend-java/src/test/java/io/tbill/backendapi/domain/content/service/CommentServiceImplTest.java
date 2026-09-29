package io.tbill.backendapi.domain.content.service;

import io.tbill.backendapi.domain.content.entity.Comment;
import io.tbill.backendapi.domain.content.entity.Content;
import io.tbill.backendapi.domain.content.entity.ContentCategory;
import io.tbill.backendapi.domain.content.repository.CommentRepository;
import io.tbill.backendapi.domain.content.repository.ContentRepository;
import io.tbill.backendapi.global.exception.CommunityException;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class CommentServiceImplTest {

    @Mock private CommentRepository commentRepository;
    @Mock private ContentRepository contentRepository;
    @Mock private AuthorDirectory authors;
    @Mock private ApplicationEventPublisher events;
    @InjectMocks private CommentServiceImpl service;

    private Content post() {
        Content c = Content.builder().category(ContentCategory.FREE_BOARD).title("글").content("").authorEmail("a@x.io").build();
        ReflectionTestUtils.setField(c, "id", 5L);
        return c;
    }

    @Test
    @DisplayName("댓글 본문이 저장된다 (Comment 생성자 본문 누락 버그 회귀) · 댓글 수 +1 · 글 작성자 알림 이벤트")
    void createStoresBody() {
        Content c = post();
        when(contentRepository.findByIdNotDeleted(5L)).thenReturn(Optional.of(c));
        when(commentRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(authors.name("b@x.io")).thenReturn("비");

        var info = service.createComment(5L, "b@x.io", "  좋은 글입니다  ");

        ArgumentCaptor<Comment> captor = ArgumentCaptor.forClass(Comment.class);
        verify(commentRepository).save(captor.capture());
        assertThat(captor.getValue().getComment()).isEqualTo("좋은 글입니다");
        assertThat(info.authorName()).isEqualTo("비");
        assertThat(c.getCommentCount()).isEqualTo(1);
        verify(events).publishEvent(new CommunityEvents.Commented(5L, "a@x.io", "b@x.io", "글"));
    }

    @Test
    @DisplayName("빈 댓글·2000자 초과는 400, 남의 댓글 삭제는 403")
    void validation() {
        when(contentRepository.findByIdNotDeleted(5L)).thenReturn(Optional.of(post()));
        assertThatThrownBy(() -> service.createComment(5L, "b@x.io", " ")).isInstanceOf(CommunityException.class);
        assertThatThrownBy(() -> service.createComment(5L, "b@x.io", "가".repeat(2001))).isInstanceOf(CommunityException.class);

        Comment cm = Comment.builder().content(post()).authorEmail("a@x.io").comment("c").build();
        when(commentRepository.findById(9L)).thenReturn(Optional.of(cm));
        assertThatThrownBy(() -> service.deleteComment(9L, "b@x.io")).isInstanceOf(CommunityException.class);
    }
}
