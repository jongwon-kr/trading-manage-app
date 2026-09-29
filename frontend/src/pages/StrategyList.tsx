import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Copy, Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useCreatePresetMutation,
  useDeletePresetMutation,
  useDuplicatePresetMutation,
  useGetPresetsQuery,
} from "@/api/strategy-preset.api";
import { useGetAnalysisModelQuery } from "@/api/strategy.api";
import { changeLabels, diffPaths } from "@/lib/strategy-config";
import type { StrategyPreset } from "@/types/model.types";

const dateFmt = new Intl.DateTimeFormat("ko-KR", { dateStyle: "medium", timeStyle: "short" });

/** 내 전략 목록: 기본 모델 v1 에서 바꾼 곳 요약, 편집·복제·삭제 */
export function StrategyList() {
  const navigate = useNavigate();
  const { data: presets, isLoading } = useGetPresetsQuery();
  const { data: model } = useGetAnalysisModelQuery();
  const [create, { isLoading: creating }] = useCreatePresetMutation();
  const [duplicate] = useDuplicatePresetMutation();
  const [remove, { isLoading: removing }] = useDeletePresetMutation();
  const [deleting, setDeleting] = useState<StrategyPreset | null>(null);

  const createNew = async () => {
    const names = new Set((presets ?? []).map((p) => p.name));
    let n = (presets?.length ?? 0) + 1;
    while (names.has(`새 전략 ${n}`)) n++;
    try {
      const p = await create({ name: `새 전략 ${n}`, description: null, config: null }).unwrap();
      navigate(`/strategies/${p.id}`);
    } catch (e) {
      toast.error((e as { message?: string }).message ?? "전략을 만들지 못했습니다.");
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-4 space-y-0">
          <div className="space-y-1">
            <CardTitle className="text-base">내 전략</CardTitle>
            <p className="max-w-2xl text-sm text-muted-foreground">
              기본 모델(v1)을 복제해 팩터 사용 여부, 가중치, 지표 기간, 밴드(값→점수), 신호 임계값, 게이트, 손절·목표 배수를
              바꿀 수 있습니다. 만든 전략은 전략 분석·종목 상세·백테스트에서 선택해 쓰고, 백테스트로 기본 모델과 비교하세요.
            </p>
            <Link to="/analysis/methodology" className="text-xs text-primary hover:underline">기본 모델 계산 방법 보기</Link>
          </div>
          <Button onClick={createNew} disabled={creating} className="gap-2">
            {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}새 전략
          </Button>
        </CardHeader>
      </Card>

      {isLoading && <Skeleton className="h-40 w-full" />}
      {presets && presets.length === 0 && (
        <p className="py-12 text-center text-sm text-muted-foreground">
          아직 만든 전략이 없습니다. <b>새 전략</b>을 눌러 기본 모델에서 시작하세요.
        </p>
      )}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {presets?.map((p) => {
          const paths = model ? diffPaths(model.defaultConfig, p.config) : [];
          const labels = model ? changeLabels(paths, model, p.config) : [];
          return (
            <Card key={p.id} className="flex flex-col">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Link to={`/strategies/${p.id}`} className="hover:underline">{p.name}</Link>
                  {p.forkedFromPostId && <Badge variant="secondary" className="font-normal">가져온 전략</Badge>}
                </CardTitle>
                <p className="line-clamp-2 min-h-[2.5rem] text-sm text-muted-foreground">{p.description || "설명 없음"}</p>
              </CardHeader>
              <CardContent className="mt-auto space-y-3">
                <div className="flex flex-wrap gap-1">
                  {paths.length === 0 ? (
                    <Badge variant="outline" className="font-normal">기본 모델과 같음</Badge>
                  ) : (
                    <>
                      <Badge className="font-normal">변경 {paths.length}곳</Badge>
                      {labels.slice(0, 4).map((l) => <Badge key={l} variant="outline" className="font-normal">{l}</Badge>)}
                      {labels.length > 4 && <Badge variant="outline" className="font-normal">+{labels.length - 4}</Badge>}
                    </>
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">{dateFmt.format(new Date(p.updatedAt))}</span>
                  <div className="flex gap-1">
                    <Button asChild variant="ghost" size="icon" aria-label="편집">
                      <Link to={`/strategies/${p.id}`}><Pencil className="h-4 w-4" /></Link>
                    </Button>
                    <Button variant="ghost" size="icon" aria-label="복제" onClick={() =>
                      duplicate(p.id).unwrap().then(() => toast.success("복제했습니다."))
                        .catch((e: { message?: string }) => toast.error(e.message ?? "복제하지 못했습니다."))}>
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" aria-label="삭제" onClick={() => setDeleting(p)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Dialog open={deleting != null} onOpenChange={(o) => !o && setDeleting(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>전략 삭제</DialogTitle>
            <DialogDescription>‘{deleting?.name}’ 전략을 삭제합니다. 되돌릴 수 없습니다.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleting(null)}>취소</Button>
            <Button variant="destructive" disabled={removing} onClick={async () => {
              if (!deleting) return;
              await remove(deleting.id).unwrap().catch(() => toast.error("삭제하지 못했습니다."));
              setDeleting(null);
            }}>삭제</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
