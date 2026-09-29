// 커뮤니티 표시 도우미
import type { ContentCategory, ContentSort, NotificationInfo, ReportReason } from "@/types/community.types";

export const REPORT_REASONS: Record<ReportReason, string> = {
  SPAM: "광고·도배",
  ABUSE: "욕설·비방",
  ILLEGAL: "불법·리딩방 유도",
  MISINFORMATION: "허위 정보",
  OTHER: "기타",
};

export const CATEGORY_LABELS: Record<ContentCategory, string> = {
  NOTICE: "공지",
  FREE_BOARD: "자유",
  JOURNAL_SHARE: "매매일지",
  STRATEGY_SHARE: "전략",
  QNA: "질문",
};

export const SORT_LABELS: Record<ContentSort, string> = {
  latest: "최신순",
  likes: "좋아요순",
  comments: "댓글순",
  views: "조회순",
  imports: "가져오기순",
  return: "수익률순",
  mdd: "낙폭 작은 순",
};

/** 서버 LocalDateTime(ISO, 시간대 없음 = 서버 로컬 KST) → '3분 전' */
export function timeAgo(iso: string, now = Date.now()): string {
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return "";
  const s = Math.max(0, Math.floor((now - t) / 1000));
  if (s < 60) return "방금";
  if (s < 3600) return `${Math.floor(s / 60)}분 전`;
  if (s < 86400) return `${Math.floor(s / 3600)}시간 전`;
  if (s < 86400 * 7) return `${Math.floor(s / 86400)}일 전`;
  return new Date(t).toLocaleDateString("ko-KR");
}

export function notificationText(n: NotificationInfo): string {
  const who = n.actorName ?? "누군가";
  const title = n.message ? `‘${n.message}’` : "";
  switch (n.type) {
    case "COMMENT": return `${who}님이 ${title}에 댓글을 남겼습니다.`;
    case "LIKE": return `${who}님이 ${title}을 좋아합니다.`;
    case "IMPORT": return `${who}님이 전략 ${title}을 가져갔습니다.`;
    case "FOLLOW": return `${who}님이 나를 팔로우합니다.`;
    case "NEW_POST_FROM_FOLLOWEE": return `${who}님의 새 글 ${title}`;
    case "POST_HIDDEN": return `${title}이 관리자에 의해 숨김 처리되었습니다.`;
    default: return title;
  }
}
