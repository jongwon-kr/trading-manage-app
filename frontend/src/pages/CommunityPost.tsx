import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, EyeOff, Flag, Heart, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { SafeHtml } from "@/components/common/SafeHtml";
import { JournalShareCard, StrategyShareCard } from "@/components/community/AttachmentCards";
import { CommentSection } from "@/components/community/CommentSection";
import { ReportDialog, type ReportTargetRef } from "@/components/community/ReportDialog";
import { useDeleteContentMutation, useGetContentQuery, useSetHiddenMutation, useSetLikeMutation } from "@/api/community.api";
import { useAppSelector } from "@/store/hooks";
import { CATEGORY_LABELS, timeAgo } from "@/lib/community";
import type { JournalAttachment, StrategyAttachment } from "@/types/community.types";

export function CommunityPost() {
  const { id } = useParams();
  const contentId = Number(id);
  const navigate = useNavigate();
  const isAdmin = useAppSelector((s) => s.auth.user?.role === "ADMIN");
  const { data: post, isLoading, isError } = useGetContentQuery(contentId, { skip: !Number.isFinite(contentId) });
  const [setLike] = useSetLikeMutation();
  const [remove] = useDeleteContentMutation();
  const [setHidden] = useSetHiddenMutation();
  const [report, setReport] = useState<ReportTargetRef | null>(null);

  if (isError) {
    return (
      <p className="py-16 text-center text-sm text-muted-foreground">
        글을 찾을 수 없습니다. <Link to="/community" className="text-primary">목록으로</Link>
      </p>
    );
  }
  if (isLoading || !post) return <Skeleton className="mx-auto h-96 max-w-3xl" />;

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <Link to="/community" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> 커뮤니티
      </Link>
      <Card>
        <CardContent className="space-y-4 p-6">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              <Badge variant="secondary" className="font-normal">{CATEGORY_LABELS[post.category] ?? post.category}</Badge>
              <Link to={`/users/${encodeURIComponent(post.authorName)}`} className="font-medium text-foreground hover:underline">
                {post.authorName}
              </Link>
              <span>{timeAgo(post.createdAt)}</span>
              <span>조회 {post.viewCount}</span>
              {post.hidden && <span className="flex items-center gap-1 text-destructive"><EyeOff className="h-3.5 w-3.5" />관리자에 의해 숨김 처리됨</span>}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="ml-auto h-8 w-8" aria-label="더보기"><MoreHorizontal className="h-4 w-4" /></Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {post.mine && post.attachmentType === "NONE" && (
                    <DropdownMenuItem onClick={() => navigate(`/community/write?edit=${post.id}`)}><Pencil className="mr-2 h-4 w-4" />수정</DropdownMenuItem>
                  )}
                  {post.mine && (
                    <DropdownMenuItem onClick={async () => {
                      await remove(post.id).unwrap().then(() => navigate("/community")).catch(() => toast.error("삭제하지 못했습니다."));
                    }}><Trash2 className="mr-2 h-4 w-4" />삭제</DropdownMenuItem>
                  )}
                  {!post.mine && (
                    <DropdownMenuItem onClick={() => setReport({ kind: "content", id: post.id })}><Flag className="mr-2 h-4 w-4" />신고</DropdownMenuItem>
                  )}
                  {isAdmin && (
                    <DropdownMenuItem onClick={() => setHidden({ kind: "contents", id: post.id, hide: !post.hidden }).unwrap()
                      .then(() => toast.success(post.hidden ? "숨김을 해제했습니다." : "숨김 처리했습니다."))}>
                      <EyeOff className="mr-2 h-4 w-4" />{post.hidden ? "숨김 해제 (관리자)" : "숨김 (관리자)"}
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            <h1 className="text-2xl font-semibold">{post.title}</h1>
          </div>
          {post.attachmentType === "STRATEGY" && post.attachment && (
            <StrategyShareCard a={post.attachment as StrategyAttachment} contentId={post.id} />
          )}
          {post.attachmentType === "JOURNAL" && post.attachment && <JournalShareCard a={post.attachment as JournalAttachment} />}
          <SafeHtml html={post.body} empty="" />
          <div className="flex items-center gap-3">
            <Button variant={post.liked ? "default" : "outline"} className="gap-2" aria-pressed={post.liked}
                    onClick={() => setLike({ id: post.id, like: !post.liked })}>
              <Heart className={`h-4 w-4 ${post.liked ? "fill-current" : ""}`} />좋아요 {post.likeCount}
            </Button>
            {post.attachmentType === "STRATEGY" && <span className="text-sm text-muted-foreground">가져간 사람 {post.importCount}</span>}
          </div>
          <Separator />
          <CommentSection contentId={post.id} comments={post.comments} onReport={setReport} />
        </CardContent>
      </Card>
      <ReportDialog target={report} onClose={() => setReport(null)} />
    </div>
  );
}
