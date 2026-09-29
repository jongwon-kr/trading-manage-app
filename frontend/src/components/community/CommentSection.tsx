import { useState } from "react";
import { Link } from "react-router-dom";
import { Flag, Loader2, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useCreateCommentMutation, useDeleteCommentMutation, useUpdateCommentMutation } from "@/api/community.api";
import { timeAgo } from "@/lib/community";
import type { CommentInfo } from "@/types/community.types";
import type { ReportTargetRef } from "./ReportDialog";

/** 댓글 목록·작성·수정·삭제. 댓글은 평문으로 렌더링한다 (HTML 해석 없음) */
export function CommentSection({ contentId, comments, onReport }: {
  contentId: number; comments: CommentInfo[]; onReport: (t: ReportTargetRef) => void;
}) {
  const [text, setText] = useState("");
  const [editing, setEditing] = useState<{ id: number; text: string } | null>(null);
  const [create, { isLoading }] = useCreateCommentMutation();
  const [update] = useUpdateCommentMutation();
  const [remove] = useDeleteCommentMutation();
  const fail = (e: unknown) => toast.error((e as { message?: string }).message ?? "처리하지 못했습니다.");

  const submit = async () => {
    if (!text.trim()) return;
    try {
      await create({ contentId, comment: text }).unwrap();
      setText("");
    } catch (e) {
      fail(e);
    }
  };

  return (
    <section className="space-y-3">
      <h3 className="text-sm font-semibold">댓글 {comments.length}</h3>
      <ul className="space-y-3">
        {comments.map((c) => (
          <li key={c.id} className="rounded-md border p-3">
            <div className="mb-1 flex items-center gap-2 text-xs text-muted-foreground">
              <Link to={`/users/${encodeURIComponent(c.authorName)}`} className="font-medium text-foreground hover:underline">
                {c.authorName}
              </Link>
              <span>{timeAgo(c.createdAt)}</span>
              {c.hidden && <span className="text-destructive">숨김 처리됨</span>}
              <span className="ml-auto flex gap-1">
                {c.mine ? (
                  <>
                    <Button variant="ghost" size="icon" className="h-6 w-6" aria-label="댓글 수정"
                            onClick={() => setEditing({ id: c.id, text: c.comment })}><Pencil className="h-3 w-3" /></Button>
                    <Button variant="ghost" size="icon" className="h-6 w-6" aria-label="댓글 삭제"
                            onClick={() => remove({ id: c.id, contentId }).unwrap().catch(fail)}><Trash2 className="h-3 w-3" /></Button>
                  </>
                ) : (
                  <Button variant="ghost" size="icon" className="h-6 w-6" aria-label="댓글 신고"
                          onClick={() => onReport({ kind: "comment", id: c.id })}><Flag className="h-3 w-3" /></Button>
                )}
              </span>
            </div>
            {editing?.id === c.id ? (
              <div className="space-y-2">
                <Textarea value={editing.text} rows={2} maxLength={2000} onChange={(e) => setEditing({ id: c.id, text: e.target.value })} />
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => update({ id: c.id, contentId, comment: editing.text }).unwrap()
                    .then(() => setEditing(null)).catch(fail)}>저장</Button>
                  <Button size="sm" variant="outline" onClick={() => setEditing(null)}>취소</Button>
                </div>
              </div>
            ) : (
              <p className="whitespace-pre-wrap break-words text-sm">{c.comment}</p>
            )}
          </li>
        ))}
      </ul>
      <div className="space-y-2">
        <Textarea value={text} rows={3} maxLength={2000} placeholder="댓글을 입력하세요" onChange={(e) => setText(e.target.value)} />
        <div className="flex justify-end">
          <Button onClick={submit} disabled={isLoading || !text.trim()} className="gap-2">
            {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}댓글 등록
          </Button>
        </div>
      </div>
    </section>
  );
}
