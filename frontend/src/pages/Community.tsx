import { Link, useSearchParams } from "react-router-dom";
import { Eye, Heart, MessageSquare, PenSquare, Download, EyeOff } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { JournalShareCard, StrategyShareCard } from "@/components/community/AttachmentCards";
import { useGetContentsQuery } from "@/api/community.api";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { CATEGORY_LABELS, SORT_LABELS, timeAgo } from "@/lib/community";
import type { ContentCategory, ContentListItem, ContentSort, JournalAttachment, StrategyAttachment } from "@/types/community.types";

const TABS: { key: string; label: string; category?: ContentCategory }[] = [
  { key: "all", label: "전체" },
  { key: "STRATEGY_SHARE", label: "전략", category: "STRATEGY_SHARE" },
  { key: "JOURNAL_SHARE", label: "매매일지", category: "JOURNAL_SHARE" },
  { key: "FREE_BOARD", label: "자유", category: "FREE_BOARD" },
  { key: "QNA", label: "질문", category: "QNA" },
  { key: "NOTICE", label: "공지", category: "NOTICE" },
];
const BASE_SORTS: ContentSort[] = ["latest", "likes", "comments", "views"];
const STRATEGY_SORTS: ContentSort[] = ["latest", "return", "mdd", "imports", "likes"];

function PostRow({ p }: { p: ContentListItem }) {
  return (
    <Card>
      <CardContent className="space-y-2 p-4">
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <Badge variant="secondary" className="font-normal">{CATEGORY_LABELS[p.category] ?? p.category}</Badge>
          <Link to={`/users/${encodeURIComponent(p.authorName)}`} className="font-medium text-foreground hover:underline">
            {p.authorName}
          </Link>
          <span>{timeAgo(p.createdAt)}</span>
          {p.hidden && <span className="flex items-center gap-1 text-destructive"><EyeOff className="h-3 w-3" />숨김 처리됨</span>}
        </div>
        <Link to={`/community/${p.id}`} className="block">
          <h3 className="text-base font-semibold hover:underline">{p.title}</h3>
          {p.excerpt && <p className="line-clamp-2 text-sm text-muted-foreground">{p.excerpt}</p>}
        </Link>
        {p.attachmentType === "STRATEGY" && p.attachmentSummary && (
          <StrategyShareCard a={p.attachmentSummary as StrategyAttachment} compact />
        )}
        {p.attachmentType === "JOURNAL" && p.attachmentSummary && (
          <JournalShareCard a={p.attachmentSummary as JournalAttachment} compact />
        )}
        <div className="flex gap-4 text-xs text-muted-foreground">
          <span className={`flex items-center gap-1 ${p.liked ? "text-price-up" : ""}`}><Heart className="h-3.5 w-3.5" />{p.likeCount}</span>
          <span className="flex items-center gap-1"><MessageSquare className="h-3.5 w-3.5" />{p.commentCount}</span>
          <span className="flex items-center gap-1"><Eye className="h-3.5 w-3.5" />{p.viewCount}</span>
          {p.attachmentType === "STRATEGY" && <span className="flex items-center gap-1"><Download className="h-3.5 w-3.5" />{p.importCount}</span>}
        </div>
      </CardContent>
    </Card>
  );
}

/** 커뮤니티: 전략·매매일지 공유와 자유·질문 게시판 */
export function Community() {
  const [params, setParams] = useSearchParams();
  const tab = params.get("tab") ?? "all";
  const category = TABS.find((t) => t.key === tab)?.category;
  const sorts = category === "STRATEGY_SHARE" ? STRATEGY_SORTS : BASE_SORTS;
  const sort = (sorts.includes(params.get("sort") as ContentSort) ? params.get("sort") : "latest") as ContentSort;
  const following = params.get("following") === "1";
  const page = Number(params.get("page") ?? 0);
  const q = params.get("q") ?? "";
  const debouncedQ = useDebouncedValue(q, 300);
  const { data, isFetching } = useGetContentsQuery({ category, sort, following, q: debouncedQ || undefined, page, size: 20 });

  const update = (patch: Record<string, string | null>) => {
    const next = new URLSearchParams(params);
    for (const [k, v] of Object.entries(patch)) {
      if (v == null || v === "") next.delete(k);
      else next.set(k, v);
    }
    if (!("page" in patch)) next.delete("page");
    setParams(next, { replace: true });
  };

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Tabs value={tab} onValueChange={(v) => update({ tab: v === "all" ? null : v, sort: null })}>
          <TabsList>{TABS.map((t) => <TabsTrigger key={t.key} value={t.key}>{t.label}</TabsTrigger>)}</TabsList>
        </Tabs>
        <Button asChild className="ml-auto gap-2">
          <Link to="/community/write"><PenSquare className="h-4 w-4" />글쓰기</Link>
        </Button>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <Input value={q} onChange={(e) => update({ q: e.target.value })} placeholder="제목·본문 검색" className="w-60" aria-label="검색" />
        <Select value={sort} onValueChange={(v) => update({ sort: v })}>
          <SelectTrigger className="w-40" aria-label="정렬"><SelectValue /></SelectTrigger>
          <SelectContent>{sorts.map((s) => <SelectItem key={s} value={s}>{SORT_LABELS[s]}</SelectItem>)}</SelectContent>
        </Select>
        <label className="flex items-center gap-2 text-sm">
          <Switch checked={following} onCheckedChange={(v) => update({ following: v ? "1" : null })} aria-label="팔로잉만" />
          팔로잉만
        </label>
        {(sort === "return" || sort === "mdd") && (
          <span className="text-xs text-muted-foreground">백테스트 성과가 첨부된 전략만 표시합니다.</span>
        )}
      </div>

      {!data && isFetching && <Skeleton className="h-60 w-full" />}
      {data && data.content.length === 0 && (
        <p className="py-16 text-center text-sm text-muted-foreground">
          {following ? "팔로우한 사람의 글이 없습니다." : "아직 글이 없습니다. 첫 글을 써 보세요."}
        </p>
      )}
      <div className="space-y-3">{data?.content.map((p) => <PostRow key={p.id} p={p} />)}</div>
      {data && data.totalPages > 1 && (
        <div className="flex items-center justify-center gap-3">
          <Button variant="outline" size="sm" disabled={page === 0} onClick={() => update({ page: String(page - 1) })}>이전</Button>
          <span className="text-sm tabular-nums">{page + 1} / {data.totalPages}</span>
          <Button variant="outline" size="sm" disabled={data.isLast} onClick={() => update({ page: String(page + 1) })}>다음</Button>
        </div>
      )}
    </div>
  );
}
