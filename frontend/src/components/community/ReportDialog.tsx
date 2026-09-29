import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useReportMutation } from "@/api/community.api";
import { REPORT_REASONS } from "@/lib/community";
import type { ReportReason } from "@/types/community.types";

export interface ReportTargetRef {
  kind: "content" | "comment";
  id: number;
}

export function ReportDialog({ target, onClose }: { target: ReportTargetRef | null; onClose: () => void }) {
  const [reason, setReason] = useState<ReportReason>("SPAM");
  const [memo, setMemo] = useState("");
  const [report, { isLoading }] = useReportMutation();
  const submit = async () => {
    if (!target) return;
    try {
      await report({ ...target, reason, memo: memo.trim() || undefined }).unwrap();
      toast.success("신고가 접수되었습니다. 관리자가 확인합니다.");
      setMemo("");
      onClose();
    } catch (e) {
      toast.error((e as { message?: string }).message ?? "신고하지 못했습니다.");
    }
  };
  return (
    <Dialog open={target != null} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{target?.kind === "comment" ? "댓글 신고" : "게시글 신고"}</DialogTitle>
          <DialogDescription>같은 대상은 한 번만 신고할 수 있습니다.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>사유</Label>
            <Select value={reason} onValueChange={(v) => setReason(v as ReportReason)}>
              <SelectTrigger aria-label="신고 사유"><SelectValue /></SelectTrigger>
              <SelectContent>
                {(Object.keys(REPORT_REASONS) as ReportReason[]).map((r) => (
                  <SelectItem key={r} value={r}>{REPORT_REASONS[r]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="report-memo">설명 (선택)</Label>
            <Textarea id="report-memo" value={memo} maxLength={500} rows={3} onChange={(e) => setMemo(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>취소</Button>
          <Button variant="destructive" onClick={submit} disabled={isLoading}>신고</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
