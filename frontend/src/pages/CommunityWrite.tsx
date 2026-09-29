import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TradingJournalEditor } from "@/components/editor/TradingJournalEditor";
import { useCreateContentMutation, useGetContentQuery, useUpdateContentMutation } from "@/api/community.api";
import { useAppSelector } from "@/store/hooks";
import type { ContentCategory } from "@/types/community.types";

/** 자유·질문(관리자는 공지) 글쓰기·수정. 매매일지·전략은 각 화면의 ‘공유’로 올린다 */
export function CommunityWrite() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const editId = params.get("edit") ? Number(params.get("edit")) : null;
  const isAdmin = useAppSelector((s) => s.auth.user?.role === "ADMIN");
  const { data: existing } = useGetContentQuery(editId ?? 0, { skip: editId == null });
  const [category, setCategory] = useState<ContentCategory>("FREE_BOARD");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [loaded, setLoaded] = useState(editId == null);
  const [create, { isLoading: creating }] = useCreateContentMutation();
  const [update, { isLoading: updating }] = useUpdateContentMutation();

  useEffect(() => {
    if (existing && !loaded) {
      setCategory(existing.category);
      setTitle(existing.title);
      setBody(existing.body);
      setLoaded(true);
    }
  }, [existing, loaded]);

  const submit = async () => {
    try {
      const post = editId != null
        ? await update({ id: editId, title, body }).unwrap()
        : await create({ category, title, body }).unwrap();
      navigate(`/community/${post.id}`);
    } catch (e) {
      toast.error((e as { message?: string }).message ?? "저장하지 못했습니다.");
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <Link to="/community" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> 커뮤니티
      </Link>
      <Card>
        <CardContent className="space-y-4 p-6">
          <div className="flex flex-wrap gap-3">
            <div className="space-y-1.5">
              <Label>게시판</Label>
              <Select value={category} onValueChange={(v) => setCategory(v as ContentCategory)} disabled={editId != null}>
                <SelectTrigger className="w-36" aria-label="게시판"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="FREE_BOARD">자유</SelectItem>
                  <SelectItem value="QNA">질문</SelectItem>
                  {isAdmin && <SelectItem value="NOTICE">공지</SelectItem>}
                </SelectContent>
              </Select>
            </div>
            <div className="min-w-[240px] flex-1 space-y-1.5">
              <Label htmlFor="post-title">제목</Label>
              <Input id="post-title" value={title} maxLength={200} onChange={(e) => setTitle(e.target.value)} />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            매매일지와 전략은 매매 일지 상세의 <b>커뮤니티에 공유</b>, 전략 편집기의 <b>공유</b>로 올릴 수 있습니다.
          </p>
          {loaded && <TradingJournalEditor content={body} onChange={setBody} />}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => navigate(-1)}>취소</Button>
            <Button onClick={submit} disabled={!title.trim() || creating || updating} className="gap-2">
              {(creating || updating) && <Loader2 className="h-4 w-4 animate-spin" />}{editId != null ? "수정" : "등록"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
