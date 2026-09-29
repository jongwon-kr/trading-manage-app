import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, Share2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useShareJournalMutation, useShareStrategyMutation } from "@/api/community.api";
import { backtestsFor } from "@/lib/backtest-history";
import { formatPercent } from "@/lib/format";
import type { StrategyPreset } from "@/types/model.types";

const NONE = "none";
const ESC: Record<string, string> = { "<": "&lt;", ">": "&gt;", "&": "&amp;" };

/** 평문 소개 → 문단 HTML (서버 jsoup·DOMPurify 가 다시 정화) */
function textToHtml(text: string): string {
  return text.trim() ? text.split(/\n{2,}/).map((p) => `<p>${p.replace(/[<>&]/g, (c) => ESC[c])}</p>`).join("") : "";
}

/** 매매일지 공유: 금액 가리기(수량·실현손익 숨김, 수익률·R 배수만 공개) */
export function ShareJournalDialog({ journalId, symbol, open, onOpenChange }: {
  journalId: number | null; symbol?: string; open: boolean; onOpenChange: (o: boolean) => void;
}) {
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [hideAmounts, setHideAmounts] = useState(true);
  const [share, { isLoading }] = useShareJournalMutation();
  const submit = async () => {
    if (!journalId) return;
    try {
      const post = await share({ journalId, title: title.trim() || `${symbol ?? ""} 매매 기록`, body: textToHtml(body), hideAmounts }).unwrap();
      toast.success("커뮤니티에 공유했습니다.");
      onOpenChange(false);
      navigate(`/community/${post.id}`);
    } catch (e) {
      toast.error((e as { message?: string }).message ?? "공유하지 못했습니다.");
    }
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>매매일지 공유</DialogTitle>
          <DialogDescription>지금 내용을 복사해 올립니다. 이후 일지를 고쳐도 게시글은 바뀌지 않습니다.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="share-title">제목</Label>
            <Input id="share-title" value={title} maxLength={200} placeholder={`${symbol ?? ""} 매매 기록`}
                   onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="share-body">한마디 (선택)</Label>
            <Textarea id="share-body" value={body} rows={3} onChange={(e) => setBody(e.target.value)}
                      placeholder="무엇을 배웠는지 적어 보세요" />
          </div>
          <label className="flex items-center justify-between gap-3 rounded-md border p-3 text-sm">
            <span>
              <b>금액 가리기</b>
              <span className="block text-xs text-muted-foreground">수량·실현손익 금액을 빼고 수익률과 R 배수만 공개합니다.</span>
            </span>
            <Switch checked={hideAmounts} onCheckedChange={setHideAmounts} aria-label="금액 가리기" />
          </label>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>취소</Button>
          <Button onClick={submit} disabled={isLoading} className="gap-2">
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Share2 className="h-4 w-4" />}공유
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** 전략 공유: 설정 스냅샷 + (선택) 같은 설정으로 실행한 최근 백테스트 성과 */
export function ShareStrategyDialog({ preset, open, onOpenChange }: {
  preset: StrategyPreset; open: boolean; onOpenChange: (o: boolean) => void;
}) {
  const navigate = useNavigate();
  const [title, setTitle] = useState(preset.name);
  const [body, setBody] = useState(preset.description ?? "");
  const [backtest, setBacktest] = useState(NONE);
  const [share, { isLoading }] = useShareStrategyMutation();
  const runs = open ? backtestsFor(preset.configHash) : [];
  const submit = async () => {
    try {
      const post = await share({
        presetId: preset.id, title: title.trim() || preset.name, body: textToHtml(body),
        backtestRequestId: backtest === NONE ? undefined : backtest,
      }).unwrap();
      toast.success("커뮤니티에 공유했습니다.");
      onOpenChange(false);
      navigate(`/community/${post.id}`);
    } catch (e) {
      toast.error((e as { message?: string }).message ?? "공유하지 못했습니다.");
    }
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>전략 공유</DialogTitle>
          <DialogDescription>현재 저장된 설정을 복사해 올립니다. 다른 사용자가 ‘내 전략으로 가져오기’로 쓸 수 있습니다.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="ss-title">제목</Label>
            <Input id="ss-title" value={title} maxLength={200} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ss-body">설명</Label>
            <Textarea id="ss-body" value={body} rows={3} onChange={(e) => setBody(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>성과 첨부 (이 설정으로 실행한 최근 24시간 백테스트)</Label>
            <Select value={backtest} onValueChange={setBacktest}>
              <SelectTrigger aria-label="첨부할 백테스트"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>첨부하지 않음</SelectItem>
                {runs.map((r) => (
                  <SelectItem key={r.requestId} value={r.requestId}>
                    {r.name} {r.from}~{r.to} · 수익 {formatPercent(r.totalReturn, 1)} · MDD {formatPercent(r.mdd, 1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {runs.length === 0 && (
              <p className="text-xs text-muted-foreground">저장한 뒤 백테스트를 실행하면 여기서 고를 수 있습니다.</p>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>취소</Button>
          <Button onClick={submit} disabled={isLoading} className="gap-2">
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Share2 className="h-4 w-4" />}공유
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
