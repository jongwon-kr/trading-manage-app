package io.tbill.backendapi.global.utils;

import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.jsoup.safety.Safelist;

/**
 * 사용자 HTML(Tiptap 에디터 출력) 정화. 스크립트·이벤트 속성·javascript: 링크를 제거한다.
 * 이미지는 에디터가 base64(data:) 로 넣으므로 img src 에 data 프로토콜을 허용한다.
 * 프론트도 렌더링 시 DOMPurify 로 한 번 더 정화한다 (이중 방어).
 */
public final class HtmlSanitizer {

    private static final Safelist SAFELIST = Safelist.relaxed()
            .addTags("s", "u", "hr")
            .addProtocols("img", "src", "http", "https", "data")
            .addAttributes("a", "target", "rel")
            .addEnforcedAttribute("a", "rel", "nofollow noopener noreferrer");

    private static final Document.OutputSettings OUTPUT = new Document.OutputSettings().prettyPrint(false);

    private HtmlSanitizer() {
    }

    public static String clean(String html) {
        if (html == null) {
            return null;
        }
        return Jsoup.clean(html, "", SAFELIST, OUTPUT);
    }

    /** 목록 미리보기용 평문 (태그 제거, 최대 max 자) */
    public static String excerpt(String html, int max) {
        if (html == null || html.isBlank()) {
            return "";
        }
        String text = Jsoup.parse(html).text().trim();
        return text.length() > max ? text.substring(0, max) + "…" : text;
    }
}
