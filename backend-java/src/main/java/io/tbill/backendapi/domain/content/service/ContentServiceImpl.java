package io.tbill.backendapi.domain.content.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import io.tbill.backendapi.domain.content.dto.ContentDto;
import io.tbill.backendapi.domain.content.entity.Comment;
import io.tbill.backendapi.domain.content.entity.Content;
import io.tbill.backendapi.domain.content.entity.ContentCategory;
import io.tbill.backendapi.domain.content.entity.ContentLike;
import io.tbill.backendapi.domain.content.repository.ContentLikeRepository;
import io.tbill.backendapi.domain.content.repository.ContentRepository;
import io.tbill.backendapi.domain.content.repository.ContentSpecs;
import io.tbill.backendapi.global.exception.CommunityException;
import io.tbill.backendapi.global.utils.HtmlSanitizer;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Stream;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ContentServiceImpl implements ContentService {

    /** 본문 최대 길이 (base64 이미지 인라인 포함, 약 2MB) */
    static final int MAX_BODY_LENGTH = 2_000_000;
    static final int MAX_PAGE_SIZE = 50;
    private static final Set<ContentCategory> WRITABLE = Set.of(ContentCategory.FREE_BOARD, ContentCategory.QNA);

    private final ContentRepository contentRepository;
    private final ContentLikeRepository contentLikeRepository;
    private final AuthorDirectory authorDirectory;
    private final FollowingProvider followingProvider;
    private final ObjectMapper objectMapper;
    private final ApplicationEventPublisher events;

    @Override
    public ContentDto.PageResult<ContentDto.ListItem> search(ContentDto.SearchCondition c) {
        Specification<Content> spec = Specification.where(ContentSpecs.visibleTo(c.viewerEmail()))
                .and(ContentSpecs.category(c.category()))
                .and(ContentSpecs.symbolKey(c.symbolKey()))
                .and(ContentSpecs.keyword(c.keyword()));
        if (c.authorName() != null && !c.authorName().isBlank()) {
            List<String> author = authorDirectory.emailOf(c.authorName().trim()).map(List::of).orElse(List.of());
            spec = spec.and(ContentSpecs.authors(author));
        }
        if (c.following()) {
            spec = spec.and(ContentSpecs.authors(followingProvider.followeeEmails(c.viewerEmail())));
        }
        if (c.sort() == ContentDto.SortKey.RETURN || c.sort() == ContentDto.SortKey.MDD) {
            spec = spec.and(ContentSpecs.hasMetric(c.sort() == ContentDto.SortKey.RETURN ? "metricReturn" : "metricMdd"));
        }
        int size = Math.min(Math.max(c.size(), 1), MAX_PAGE_SIZE);
        Page<Content> page = contentRepository.findAll(spec, PageRequest.of(Math.max(c.page(), 0), size, sortOf(c.sort())));

        List<Content> rows = page.getContent();
        Map<String, String> names = authorDirectory.names(rows.stream().map(Content::getAuthorEmail).toList());
        Set<Long> liked = rows.isEmpty() ? Set.of()
                : contentLikeRepository.findLikedContentIds(c.viewerEmail(), rows.stream().map(Content::getId).toList());
        List<ContentDto.ListItem> items = rows.stream().map(ct -> new ContentDto.ListItem(
                ct.getId(), ct.getCategory(), ct.getTitle(), HtmlSanitizer.excerpt(ct.getContent(), 140),
                names.get(ct.getAuthorEmail()), ct.getAuthorEmail().equals(c.viewerEmail()), liked.contains(ct.getId()),
                ct.getViewCount(), ct.getLikeCount(), ct.getCommentCount(), ct.getImportCount(), ct.getAttachmentType(),
                summary(ct.getAttachment()), ct.getSymbolKey(), ct.isHidden(), ct.getCreatedAt())).toList();
        return new ContentDto.PageResult<>(items, page.getNumber(), page.getSize(), page.getTotalElements(),
                page.getTotalPages(), page.isLast());
    }

    @Override
    @Transactional
    public ContentDto.Detail getContent(Long contentId, String viewerEmail) {
        Content content = findVisible(contentId, viewerEmail);
        content.increaseViewCount();
        return toDetail(content, viewerEmail);
    }

    @Override
    @Transactional
    public ContentDto.Detail createContent(ContentDto.CreateCommand command) {
        boolean notice = command.category() == ContentCategory.NOTICE && command.admin();
        if (!WRITABLE.contains(command.category()) && !notice) {
            throw CommunityException.badRequest("이 게시판에는 직접 글을 쓸 수 없습니다.");
        }
        Content saved = contentRepository.save(Content.builder()
                .category(command.category())
                .title(command.title().trim())
                .content(cleanBody(command.body()))
                .authorEmail(command.authorEmail())
                .build());
        events.publishEvent(new CommunityEvents.Posted(saved.getId(), saved.getAuthorEmail(), saved.getTitle()));
        return toDetail(saved, command.authorEmail());
    }

    @Override
    @Transactional
    public ContentDto.Detail createAttachmentPost(ContentDto.AttachmentPostCommand command) {
        Content saved = contentRepository.save(Content.builder()
                .category(command.category())
                .title(command.title().trim())
                .content(cleanBody(command.body()))
                .authorEmail(command.authorEmail())
                .attachmentType(command.attachmentType())
                .attachment(command.attachment() != null ? command.attachment().toString() : null)
                .symbolKey(command.symbolKey())
                .metricReturn(command.metricReturn())
                .metricMdd(command.metricMdd())
                .build());
        log.info("공유 글 작성: id={}, type={}, author={}", saved.getId(), saved.getAttachmentType(), command.authorEmail());
        events.publishEvent(new CommunityEvents.Posted(saved.getId(), saved.getAuthorEmail(), saved.getTitle()));
        return toDetail(saved, command.authorEmail());
    }

    @Override
    @Transactional
    public ContentDto.Detail updateContent(ContentDto.UpdateCommand command) {
        Content content = findOwned(command.id(), command.authorEmail());
        content.update(command.title().trim(), cleanBody(command.body()));
        return toDetail(content, command.authorEmail());
    }

    @Override
    @Transactional
    public void deleteContent(Long contentId, String authorEmail) {
        findOwned(contentId, authorEmail).softDelete();
    }

    @Override
    @Transactional
    public ContentDto.LikeResult like(Long contentId, String userEmail) {
        Content content = findVisible(contentId, userEmail);
        if (!contentLikeRepository.existsByContentIdAndUserEmail(contentId, userEmail)) {
            contentLikeRepository.save(new ContentLike(contentId, userEmail));
            content.increaseLikeCount();
            events.publishEvent(new CommunityEvents.Liked(contentId, content.getAuthorEmail(), userEmail, content.getTitle()));
        }
        return new ContentDto.LikeResult(true, content.getLikeCount());
    }

    @Override
    @Transactional
    public ContentDto.LikeResult unlike(Long contentId, String userEmail) {
        Content content = findVisible(contentId, userEmail);
        contentLikeRepository.findByContentIdAndUserEmail(contentId, userEmail).ifPresent(like -> {
            contentLikeRepository.delete(like);
            content.decreaseLikeCount();
        });
        return new ContentDto.LikeResult(false, content.getLikeCount());
    }

    // ------------------------------------------------------------------ 내부

    Content findVisible(Long contentId, String viewerEmail) {
        Content content = contentRepository.findByIdNotDeleted(contentId)
                .orElseThrow(() -> CommunityException.notFound("게시글을 찾을 수 없습니다."));
        if (!content.isVisibleTo(viewerEmail)) {
            throw CommunityException.notFound("게시글을 찾을 수 없습니다.");
        }
        return content;
    }

    private Content findOwned(Long contentId, String authorEmail) {
        Content content = contentRepository.findByIdNotDeleted(contentId)
                .orElseThrow(() -> CommunityException.notFound("게시글을 찾을 수 없습니다."));
        if (!content.getAuthorEmail().equals(authorEmail)) {
            throw CommunityException.forbidden("본인이 쓴 글만 수정·삭제할 수 있습니다.");
        }
        return content;
    }

    private static String cleanBody(String body) {
        if (body != null && body.length() > MAX_BODY_LENGTH) {
            throw CommunityException.badRequest("본문이 너무 깁니다 (이미지 포함 약 2MB 이하).");
        }
        return HtmlSanitizer.clean(body == null ? "" : body);
    }

    private static Sort sortOf(ContentDto.SortKey key) {
        Sort latest = Sort.by(Sort.Order.desc("createdAt"));
        return switch (key == null ? ContentDto.SortKey.LATEST : key) {
            case LIKES -> Sort.by(Sort.Order.desc("likeCount")).and(latest);
            case COMMENTS -> Sort.by(Sort.Order.desc("commentCount")).and(latest);
            case IMPORTS -> Sort.by(Sort.Order.desc("importCount")).and(latest);
            case VIEWS -> Sort.by(Sort.Order.desc("viewCount")).and(latest);
            case RETURN -> Sort.by(Sort.Order.desc("metricReturn")).and(latest); // 성과가 있는 글만 (search 에서 필터)
            case MDD -> Sort.by(Sort.Order.desc("metricMdd")).and(latest); // MDD 는 음수: 클수록 낙폭이 작다
            case LATEST -> latest;
        };
    }

    private JsonNode parse(String json) {
        if (json == null) {
            return null;
        }
        try {
            return objectMapper.readTree(json);
        } catch (JsonProcessingException e) {
            log.warn("첨부 JSON 을 읽을 수 없습니다: {}", e.getMessage());
            return null;
        }
    }

    /** 목록용 첨부 요약: 무거운 필드(전략 설정 전체, 일지 근거 HTML) 제외 */
    private JsonNode summary(String json) {
        JsonNode node = parse(json);
        if (node instanceof ObjectNode obj) {
            obj.remove(List.of("config", "reasoningHtml"));
        }
        return node;
    }

    private ContentDto.Detail toDetail(Content c, String viewerEmail) {
        List<Comment> comments = c.getComments().stream()
                .filter(cm -> !cm.getIsDeleted() && (!cm.isHidden() || cm.getAuthorEmail().equals(viewerEmail)))
                .toList();
        Collection<String> emails = Stream.concat(Stream.of(c.getAuthorEmail()), comments.stream().map(Comment::getAuthorEmail))
                .toList();
        Map<String, String> names = authorDirectory.names(emails);
        List<ContentDto.CommentInfo> commentInfos = new ArrayList<>();
        for (Comment cm : comments) {
            commentInfos.add(CommentServiceImpl.toInfo(cm, c.getId(), names.get(cm.getAuthorEmail()), viewerEmail));
        }
        boolean liked = c.getId() != null && contentLikeRepository.existsByContentIdAndUserEmail(c.getId(), viewerEmail);
        return new ContentDto.Detail(c.getId(), c.getCategory(), c.getTitle(), c.getContent(), names.get(c.getAuthorEmail()),
                c.getAuthorEmail().equals(viewerEmail), liked, c.getViewCount(), c.getLikeCount(), c.getCommentCount(),
                c.getImportCount(), c.getAttachmentType(), parse(c.getAttachment()), c.getSymbolKey(), c.isHidden(),
                commentInfos, c.getCreatedAt(), c.getUpdatedAt());
    }
}
