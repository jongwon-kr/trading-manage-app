package io.tbill.backendapi.domain.content.service;

import io.tbill.backendapi.domain.content.dto.ContentDto;
import io.tbill.backendapi.domain.content.entity.Comment;
import io.tbill.backendapi.domain.content.entity.Content;
import io.tbill.backendapi.domain.content.repository.CommentRepository;
import io.tbill.backendapi.domain.content.repository.ContentRepository;
import io.tbill.backendapi.global.exception.CommunityException;
import lombok.RequiredArgsConstructor;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** 댓글은 평문이다 (프론트가 텍스트로 렌더링). 게시글의 commentCount 를 함께 갱신한다. */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class CommentServiceImpl implements CommentService {

    static final int MAX_COMMENT_LENGTH = 2000;

    private final CommentRepository commentRepository;
    private final ContentRepository contentRepository;
    private final AuthorDirectory authorDirectory;
    private final ApplicationEventPublisher events;

    static ContentDto.CommentInfo toInfo(Comment c, Long contentId, String authorName, String viewerEmail) {
        return new ContentDto.CommentInfo(c.getId(), contentId, authorName, c.getComment(),
                c.getAuthorEmail().equals(viewerEmail), c.isHidden(), c.getCreatedAt());
    }

    @Override
    @Transactional
    public ContentDto.CommentInfo createComment(Long contentId, String authorEmail, String comment) {
        Content content = contentRepository.findByIdNotDeleted(contentId)
                .filter(c -> c.isVisibleTo(authorEmail))
                .orElseThrow(() -> CommunityException.notFound("게시글을 찾을 수 없습니다."));
        Comment saved = commentRepository.save(Comment.builder()
                .content(content).authorEmail(authorEmail).comment(validate(comment)).build());
        content.getComments().add(saved);
        content.increaseCommentCount();
        events.publishEvent(new CommunityEvents.Commented(content.getId(), content.getAuthorEmail(), authorEmail,
                content.getTitle()));
        return toInfo(saved, contentId, authorDirectory.name(authorEmail), authorEmail);
    }

    @Override
    @Transactional
    public ContentDto.CommentInfo updateComment(Long commentId, String authorEmail, String comment) {
        Comment c = findOwned(commentId, authorEmail);
        c.update(validate(comment));
        return toInfo(c, c.getContent().getId(), authorDirectory.name(authorEmail), authorEmail);
    }

    @Override
    @Transactional
    public void deleteComment(Long commentId, String authorEmail) {
        Comment c = findOwned(commentId, authorEmail);
        c.softDelete();
        c.getContent().decreaseCommentCount();
    }

    private Comment findOwned(Long commentId, String authorEmail) {
        Comment c = commentRepository.findById(commentId)
                .filter(cm -> !cm.getIsDeleted() && !cm.getContent().getIsDeleted())
                .orElseThrow(() -> CommunityException.notFound("댓글을 찾을 수 없습니다."));
        if (!c.getAuthorEmail().equals(authorEmail)) {
            throw CommunityException.forbidden("본인이 쓴 댓글만 수정·삭제할 수 있습니다.");
        }
        return c;
    }

    private static String validate(String comment) {
        String text = comment == null ? "" : comment.trim();
        if (text.isEmpty() || text.length() > MAX_COMMENT_LENGTH) {
            throw CommunityException.badRequest("댓글은 1~" + MAX_COMMENT_LENGTH + "자여야 합니다.");
        }
        return text;
    }
}
