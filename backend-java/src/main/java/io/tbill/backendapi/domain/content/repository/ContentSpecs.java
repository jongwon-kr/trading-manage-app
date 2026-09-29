package io.tbill.backendapi.domain.content.repository;

import io.tbill.backendapi.domain.content.entity.Content;
import io.tbill.backendapi.domain.content.entity.ContentCategory;
import org.springframework.data.jpa.domain.Specification;

import java.util.Collection;

/** 게시글 목록 검색 조건 (지정한 조건만 AND 로 결합) */
public final class ContentSpecs {

    private ContentSpecs() {
    }

    /** 삭제되지 않았고, 숨김이면 작성자 본인에게만 */
    public static Specification<Content> visibleTo(String viewerEmail) {
        return (root, q, cb) -> cb.and(
                cb.isFalse(root.get("isDeleted")),
                cb.or(cb.isFalse(root.get("hidden")), cb.equal(root.get("authorEmail"), viewerEmail)));
    }

    public static Specification<Content> category(ContentCategory category) {
        return (root, q, cb) -> category == null ? null : cb.equal(root.get("category"), category);
    }

    public static Specification<Content> symbolKey(String symbolKey) {
        return (root, q, cb) -> symbolKey == null || symbolKey.isBlank() ? null : cb.equal(root.get("symbolKey"), symbolKey);
    }

    public static Specification<Content> authors(Collection<String> emails) {
        return (root, q, cb) -> emails == null ? null : root.get("authorEmail").in(emails);
    }

    /** 제목·본문 부분 일치 (대소문자 무시) */
    public static Specification<Content> keyword(String keyword) {
        return (root, q, cb) -> {
            if (keyword == null || keyword.isBlank()) {
                return null;
            }
            String like = "%" + keyword.trim().toLowerCase().replace("!", "!!").replace("%", "!%").replace("_", "!_") + "%";
            return cb.or(cb.like(cb.lower(root.get("title")), like, '!'), cb.like(cb.lower(root.get("content")), like, '!'));
        };
    }

    /** 성과순 정렬용: 해당 지표(metricReturn·metricMdd)가 있는 글만 (JPA 정렬은 NULLS LAST 를 보장하지 않는다) */
    public static Specification<Content> hasMetric(String field) {
        return (root, q, cb) -> cb.isNotNull(root.get(field));
    }
}
