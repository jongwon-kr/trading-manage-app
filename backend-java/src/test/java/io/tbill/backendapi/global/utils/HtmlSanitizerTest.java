package io.tbill.backendapi.global.utils;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class HtmlSanitizerTest {

    @Test
    @DisplayName("스크립트·이벤트 속성·javascript: 링크를 제거한다")
    void removesDangerousMarkup() {
        String dirty = "<p onclick=\"steal()\">안녕<script>alert(1)</script></p>"
                + "<img src=\"x\" onerror=\"alert(2)\"><a href=\"javascript:alert(3)\">링크</a>"
                + "<iframe src=\"https://evil\"></iframe>";
        String clean = HtmlSanitizer.clean(dirty);
        assertThat(clean).doesNotContain("script", "onclick", "onerror", "javascript:", "iframe").contains("<p>안녕</p>");
    }

    @Test
    @DisplayName("에디터 서식과 base64 이미지는 유지하고 링크에는 rel 을 붙인다")
    void keepsEditorMarkup() {
        String html = "<h2>제목</h2><p><strong>굵게</strong> <u>밑줄</u> <s>취소</s></p>"
                + "<img src=\"data:image/png;base64,iVBORw0KGgo=\"><a href=\"https://tbill.io\">t</a>";
        String clean = HtmlSanitizer.clean(html);
        assertThat(clean).contains("<h2>제목</h2>", "<strong>굵게</strong>", "<u>밑줄</u>", "<s>취소</s>",
                "src=\"data:image/png;base64,iVBORw0KGgo=\"", "rel=\"nofollow noopener noreferrer\"");
    }

    @Test
    @DisplayName("미리보기는 태그를 뺀 평문을 길이 제한해 만든다")
    void excerpt() {
        assertThat(HtmlSanitizer.excerpt("<p>가나다</p><p>라마바사</p>", 5)).isEqualTo("가나다 라…");
        assertThat(HtmlSanitizer.excerpt(null, 5)).isEmpty();
    }
}
