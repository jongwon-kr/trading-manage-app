// 커뮤니티 타입 (원본: backend-java domain/content/dto/ContentDto.java, domain/social/dto/SocialDto.java)
import type { StrategyConfig } from "./model.types";
import type { BacktestMetrics } from "./strategy.types";

export type ContentCategory = "NOTICE" | "FREE_BOARD" | "JOURNAL_SHARE" | "STRATEGY_SHARE" | "QNA";
export type AttachmentType = "NONE" | "JOURNAL" | "STRATEGY";
export type ContentSort = "latest" | "likes" | "comments" | "imports" | "views" | "return" | "mdd";

/** 매매일지 공유 스냅샷 (hideAmounts 면 quantity·realizedPnL 없음) */
export interface JournalAttachment {
  journalId: number;
  market: "STOCK" | "CRYPTO" | "FOREX" | "FUTURES";
  symbol: string;
  tradeType: "LONG" | "SHORT";
  entryPrice: number;
  stopLossPrice: number | null;
  closed: boolean;
  hideAmounts: boolean;
  quantity?: number;
  realizedPnL?: number | null;
  pnlPct?: number;
  rMultiple?: number;
  /** 상세에서만 */
  reasoningHtml?: string;
  tradedAt: string | null;
}

export interface StrategyAttachment {
  presetId: number;
  name: string;
  description: string | null;
  configHash: string;
  /** 상세에서만 */
  config?: StrategyConfig;
  backtest?: {
    market: string;
    symbol: string;
    name: string;
    from: string;
    to: string;
    bars: number;
    requestId: string;
    metrics: Partial<BacktestMetrics>;
    benchmarkMetrics: Partial<BacktestMetrics>;
  };
}

interface ContentBase {
  id: number;
  category: ContentCategory;
  title: string;
  authorName: string;
  mine: boolean;
  liked: boolean;
  viewCount: number;
  likeCount: number;
  commentCount: number;
  importCount: number;
  attachmentType: AttachmentType;
  symbolKey: string | null;
  hidden: boolean;
  createdAt: string;
}

export interface ContentListItem extends ContentBase {
  excerpt: string;
  attachmentSummary: JournalAttachment | StrategyAttachment | null;
}

export interface CommentInfo {
  id: number;
  contentId: number;
  authorName: string;
  comment: string;
  mine: boolean;
  hidden: boolean;
  createdAt: string;
}

export interface ContentDetail extends ContentBase {
  body: string;
  attachment: JournalAttachment | StrategyAttachment | null;
  comments: CommentInfo[];
  updatedAt: string;
}

export interface PageResult<T> {
  content: T[];
  pageNumber: number;
  pageSize: number;
  totalElements: number;
  totalPages: number;
  isLast: boolean;
}

export interface ContentQuery {
  category?: ContentCategory;
  q?: string;
  symbol?: string;
  author?: string;
  following?: boolean;
  sort?: ContentSort;
  page?: number;
  size?: number;
}

export interface Profile {
  username: string;
  postCount: number;
  followerCount: number;
  followingCount: number;
  following: boolean;
  me: boolean;
}

export type NotificationType = "COMMENT" | "LIKE" | "IMPORT" | "FOLLOW" | "NEW_POST_FROM_FOLLOWEE" | "POST_HIDDEN";

export interface NotificationInfo {
  id: number;
  type: NotificationType;
  actorName: string | null;
  contentId: number | null;
  message: string | null;
  read: boolean;
  createdAt: string;
}

export type ReportReason = "SPAM" | "ABUSE" | "ILLEGAL" | "MISINFORMATION" | "OTHER";
export type ReportStatus = "OPEN" | "RESOLVED" | "REJECTED";

export interface ReportInfo {
  id: number;
  targetType: "CONTENT" | "COMMENT";
  targetId: number;
  contentId: number;
  targetTitle: string | null;
  targetPreview: string | null;
  targetHidden: boolean;
  reporterName: string;
  reason: ReportReason;
  memo: string | null;
  status: ReportStatus;
  resolvedBy: string | null;
  createdAt: string;
}
