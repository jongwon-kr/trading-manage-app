package io.tbill.backendapi.domain.content.repository;

import io.tbill.backendapi.domain.content.entity.AttachmentType;
import io.tbill.backendapi.domain.content.entity.Content;
import io.tbill.backendapi.domain.content.entity.ContentCategory;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.test.context.ActiveProfiles;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

@DataJpaTest
@ActiveProfiles("test") // 없으면 local 프로필로 떠서 개발 DB(Postgres)에 붙는다
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE) // H2 (PostgreSQL 모드)
class ContentRepositoryTest {

    @Autowired
    private ContentRepository repository;

    @BeforeEach
    void setUp() {
        repository.save(Content.builder().category(ContentCategory.FREE_BOARD).title("삼성전자 매수 후기").content("<p>좋음</p>")
                .authorEmail("a@x.io").build());
        Content hidden = Content.builder().category(ContentCategory.FREE_BOARD).title("광고 100%_할인").content("")
                .authorEmail("b@x.io").build();
        hidden.hide();
        repository.save(hidden);
        repository.save(Content.builder().category(ContentCategory.STRATEGY_SHARE).title("추세 전략").content("")
                .authorEmail("a@x.io").attachmentType(AttachmentType.STRATEGY).metricReturn(0.3).metricMdd(-0.25).build());
        repository.save(Content.builder().category(ContentCategory.STRATEGY_SHARE).title("역추세 전략").content("")
                .authorEmail("b@x.io").attachmentType(AttachmentType.STRATEGY).metricReturn(0.1).metricMdd(-0.1).build());
        repository.save(Content.builder().category(ContentCategory.STRATEGY_SHARE).title("성과 없는 전략").content("")
                .authorEmail("c@x.io").attachmentType(AttachmentType.STRATEGY).build());
    }

    private List<String> titles(Specification<Content> spec, Sort sort) {
        return repository.findAll(spec, PageRequest.of(0, 20, sort)).map(Content::getTitle).getContent();
    }

    @Test
    @DisplayName("숨김 글은 작성자에게만 보이고, 키워드의 % _ 는 문자 그대로 검색된다")
    void visibilityAndKeyword() {
        Sort latest = Sort.by(Sort.Order.desc("createdAt"));
        assertThat(titles(ContentSpecs.visibleTo("a@x.io").and(ContentSpecs.category(ContentCategory.FREE_BOARD)), latest))
                .containsExactly("삼성전자 매수 후기");
        assertThat(titles(ContentSpecs.visibleTo("b@x.io").and(ContentSpecs.category(ContentCategory.FREE_BOARD)), latest))
                .hasSize(2);
        assertThat(titles(ContentSpecs.visibleTo("b@x.io").and(ContentSpecs.keyword("100%_")), latest))
                .containsExactly("광고 100%_할인");
        assertThat(titles(ContentSpecs.visibleTo("a@x.io").and(ContentSpecs.keyword("좋음")), latest))
                .containsExactly("삼성전자 매수 후기"); // 본문 검색
    }

    @Test
    @DisplayName("전략 성과순: 지표가 있는 글만 수익률·MDD 순 (JPA 정렬은 NULLS LAST 를 보장하지 않아 필터로 뺀다)")
    void metricSort() {
        Specification<Content> spec = ContentSpecs.visibleTo("z@x.io").and(ContentSpecs.category(ContentCategory.STRATEGY_SHARE));
        assertThat(titles(spec.and(ContentSpecs.hasMetric("metricReturn")), Sort.by(Sort.Order.desc("metricReturn"))))
                .containsExactly("추세 전략", "역추세 전략");
        assertThat(titles(spec.and(ContentSpecs.hasMetric("metricMdd")), Sort.by(Sort.Order.desc("metricMdd"))))
                .containsExactly("역추세 전략", "추세 전략");
        assertThat(titles(spec.and(ContentSpecs.authors(List.of("b@x.io"))), Sort.unsorted())).containsExactly("역추세 전략");
    }
}
