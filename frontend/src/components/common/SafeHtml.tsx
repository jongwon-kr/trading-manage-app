import { useMemo } from "react";
import DOMPurify from "dompurify";
import { cn } from "@/utils/shadcn-util";

// 링크는 새 탭 + opener 차단 (정화 후 모든 <a> 에 적용)
DOMPurify.addHook("afterSanitizeAttributes", (node) => {
  if (node.tagName === "A") {
    node.setAttribute("target", "_blank");
    node.setAttribute("rel", "nofollow noopener noreferrer");
  }
});

/**
 * 사용자 HTML(에디터 출력) 렌더링. 서버(jsoup)에서 이미 정화하지만, 렌더링 직전에 DOMPurify 로 한 번 더 정화한다.
 * dangerouslySetInnerHTML 은 이 컴포넌트에서만 쓴다.
 */
export function SafeHtml({ html, className, empty }: { html: string | null | undefined; className?: string; empty?: string }) {
  const clean = useMemo(
    () => DOMPurify.sanitize(html ?? "", { USE_PROFILES: { html: true }, ADD_DATA_URI_TAGS: ["img"] }),
    [html]
  );
  if (!clean.trim()) return <p className={cn("text-sm text-muted-foreground", className)}>{empty ?? "내용이 없습니다."}</p>;
  return <div className={cn("prose prose-sm max-w-none dark:prose-invert", className)} dangerouslySetInnerHTML={{ __html: clean }} />;
}
