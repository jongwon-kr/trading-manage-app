import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { AlertTriangle, ArrowLeft, FlaskConical, Loader2, Play, Save, Search } from "lucide-react";
import { toast } from "sonner";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { SignalBadge } from "@/components/analysis/SignalBadge";
import { FactorEditor } from "@/components/strategy/FactorEditor";
import { SignalRiskEditor, WeightsEditor } from "@/components/strategy/SettingsEditors";
import { SymbolSearchDialog } from "@/components/market/SymbolSearchDialog";
import { useGetPresetQuery, useUpdatePresetMutation } from "@/api/strategy-preset.api";
import { useGetAnalysisModelQuery } from "@/api/strategy.api";
import { useGetSymbolQuery } from "@/api/market.api";
import { useStrategyJob } from "@/hooks/useStrategyJob";
import { fillTemplate } from "@/lib/bands";
import { changeColorClass } from "@/lib/format";
import { marketSlug } from "@/lib/market";
import { changeLabels, diffPaths, validateConfig, type FieldError } from "@/lib/strategy-config";
import type { ApiError } from "@/api/base.api";
import type { AnalysisModel, StrategyConfig } from "@/types/model.types";
import type { MarketCode } from "@/types/market.types";
import type { StrategyResult } from "@/types/strategy.types";

function FactorsTab({ model, draft, setDraft, errors }: {
  model: AnalysisModel; draft: StrategyConfig; setDraft: (c: StrategyConfig) => void; errors: FieldError[];
}) {
  const base = model.defaultConfig;
  const sections: { key: string; title: string; keys: string[] }[] = [
    ...model.subGroups.map((s) => ({
      key: `technical.${s.key}`, title: `기술적 분석 · ${s.label}`,
      keys: model.factors.filter((f) => f.group === "technical" && f.subGroup === s.key).map((f) => f.key),
    })),
    ...model.groups.filter((g) => g.key !== "technical").map((g) => ({
      key: g.key, title: g.label, keys: model.factors.filter((f) => f.group === g.key).map((f) => f.key),
    })),
  ];
  return (
    <Accordion type="multiple" defaultValue={sections.map((sec) => sec.key)}>
      {sections.map((sec) => {
        const on = sec.keys.filter((k) => draft.factors[k].enabled).length;
        const changed = sec.keys.filter((k) => JSON.stringify(draft.factors[k]) !== JSON.stringify(base.factors[k])).length;
        return (
          <AccordionItem key={sec.key} value={sec.key}>
            <AccordionTrigger>
              <span className="flex items-center gap-2">
                {sec.title}
                <span className="text-xs font-normal text-muted-foreground">사용 {on}/{sec.keys.length}</span>
                {changed > 0 && <Badge variant="secondary" className="font-normal">변경 {changed}</Badge>}
              </span>
            </AccordionTrigger>
            <AccordionContent className="space-y-3">
              {sec.keys.map((k) => {
                const spec = model.factors.find((f) => f.key === k)!;
                return (
                  <FactorEditor key={k} spec={spec} value={draft.factors[k]} baseline={base.factors[k]} errors={errors}
                                onChange={(fc) => setDraft({ ...draft, factors: { ...draft.factors, [k]: fc } })} />
                );
              })}
            </AccordionContent>
          </AccordionItem>
        );
      })}
    </Accordion>
  );
}

/** 기본 모델 vs 편집 중인 설정: 같은 종목 점수·신호, 기여도가 많이 달라진 팩터 */
function Comparison({ base, mine }: { base: StrategyResult; mine: StrategyResult }) {
  const contrib = (r: StrategyResult) =>
    new Map(r.groups.flatMap((g) => g.factors.map((f) => [f.key, { label: f.label, c: f.contribution }] as const)));
  const b = contrib(base);
  const m = contrib(mine);
  const keys = new Set([...b.keys(), ...m.keys()]);
  const diffs = [...keys]
    .map((k) => ({ k, label: m.get(k)?.label ?? b.get(k)?.label ?? k, d: (m.get(k)?.c ?? 0) - (b.get(k)?.c ?? 0) }))
    .filter((x) => Math.abs(x.d) >= 0.05)
    .sort((x, y) => Math.abs(y.d) - Math.abs(x.d))
    .slice(0, 6);
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2 text-center">
        {([["기본 모델", base], ["편집 중인 설정", mine]] as const).map(([label, r]) => (
          <div key={label} className="rounded-md border p-2">
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="text-2xl font-semibold tabular-nums">{r.score.toFixed(1)}</p>
            <SignalBadge strength={r.strength} />
          </div>
        ))}
      </div>
      <p className={`text-center text-sm tabular-nums ${changeColorClass(mine.score - base.score)}`}>
        차이 {mine.score - base.score >= 0 ? "+" : ""}{(mine.score - base.score).toFixed(2)}점
      </p>
      {diffs.length > 0 && (
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground">기여도가 달라진 팩터</p>
          {diffs.map((x) => (
            <div key={x.k} className="flex justify-between text-sm">
              <span>{x.label}</span>
              <span className={`tabular-nums ${changeColorClass(x.d)}`}>{x.d >= 0 ? "+" : ""}{x.d.toFixed(2)}점</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function StrategyEditor() {
  const { id } = useParams();
  const presetId = Number(id);
  const navigate = useNavigate();
  const { data: preset, isLoading, isError } = useGetPresetQuery(presetId, { skip: !Number.isFinite(presetId) });
  const { data: model } = useGetAnalysisModelQuery();
  const [update, { isLoading: saving }] = useUpdatePresetMutation();

  const [draft, setDraft] = useState<StrategyConfig | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [serverErrors, setServerErrors] = useState<FieldError[]>([]);
  const [target, setTarget] = useState<{ market: MarketCode; code: string }>({ market: "KR_STOCK", code: "005930" });
  const [pickerOpen, setPickerOpen] = useState(false);

  useEffect(() => {
    if (!preset) return;
    setDraft(preset.config);
    setName(preset.name);
    setDescription(preset.description ?? "");
    setServerErrors([]);
  }, [preset]);

  const { data: symbolInfo } = useGetSymbolQuery({ market: target.market, code: target.code });
  const baseJob = useStrategyJob(target.market, target.code);
  const mineJob = useStrategyJob(target.market, target.code);

  const clientErrors = useMemo(() => (draft && model ? validateConfig(draft, model) : []), [draft, model]);
  const errors = clientErrors.length ? clientErrors : serverErrors;
  const changed = useMemo(() => (draft && model ? diffPaths(model.defaultConfig, draft) : []), [draft, model]);
  const dirty = !!preset && !!draft && (JSON.stringify(draft) !== JSON.stringify(preset.config) || name !== preset.name ||
    description !== (preset.description ?? ""));

  if (isError) {
    return <p className="py-12 text-center text-sm text-muted-foreground">전략을 찾을 수 없습니다. <Link to="/strategies" className="text-primary">목록으로</Link></p>;
  }
  if (isLoading || !preset || !model || !draft) return <Skeleton className="h-[600px] w-full" />;

  const save = async () => {
    try {
      const saved = await update({ id: presetId, name, description, config: draft }).unwrap();
      setServerErrors([]);
      setDraft(saved.config);
      toast.success("저장했습니다.");
    } catch (e) {
      const err = e as ApiError;
      setServerErrors(err.errors ?? []);
      toast.error(err.message ?? "저장하지 못했습니다.");
    }
  };
  const preview = () => {
    void baseJob.run({});
    void mineJob.run({ config: draft });
  };
  const previewBusy = baseJob.busy || mineJob.busy;
  const labels = changeLabels(changed, model, draft);

  return (
    <div className="space-y-4">
      <Link to="/strategies" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> 내 전략
      </Link>
      <div className="grid gap-4 xl:grid-cols-3">
        <div className="space-y-4 xl:col-span-2">
          <Card>
            <CardContent className="grid gap-3 p-4 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label htmlFor="preset-name">이름</Label>
                <Input id="preset-name" value={name} maxLength={50} onChange={(e) => setName(e.target.value)} />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="preset-desc">설명</Label>
                <Textarea id="preset-desc" value={description} maxLength={500} rows={1} className="min-h-9"
                          onChange={(e) => setDescription(e.target.value)} placeholder="어떤 생각으로 바꿨는지 적어 두세요" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <Tabs defaultValue="factors">
                <TabsList>
                  <TabsTrigger value="factors">팩터</TabsTrigger>
                  <TabsTrigger value="weights">그룹 비중</TabsTrigger>
                  <TabsTrigger value="signal">신호·리스크</TabsTrigger>
                </TabsList>
                <TabsContent value="factors" className="pt-2">
                  <FactorsTab model={model} draft={draft} setDraft={setDraft} errors={errors} />
                </TabsContent>
                <TabsContent value="weights" className="pt-4">
                  <WeightsEditor model={model} value={draft} onChange={setDraft} errors={errors} />
                </TabsContent>
                <TabsContent value="signal" className="pt-4">
                  <SignalRiskEditor model={model} value={draft} onChange={setDraft} errors={errors} />
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4 xl:sticky xl:top-4 xl:self-start">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">저장</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex flex-wrap gap-1">
                {changed.length === 0 ? (
                  <Badge variant="outline" className="font-normal">기본 모델과 같음</Badge>
                ) : (
                  <>
                    <Badge className="font-normal">기본 대비 변경 {changed.length}곳</Badge>
                    {labels.map((l) => <Badge key={l} variant="outline" className="font-normal">{l}</Badge>)}
                  </>
                )}
              </div>
              {errors.length > 0 && (
                <div className="space-y-1 rounded-md border border-destructive/40 bg-destructive/10 p-2 text-xs">
                  {errors.slice(0, 5).map((e) => (
                    <p key={e.path + e.msg}><code>{e.path}</code> — {e.msg}</p>
                  ))}
                  {errors.length > 5 && <p>외 {errors.length - 5}건</p>}
                </div>
              )}
              <div className="flex gap-2">
                <Button onClick={save} disabled={!dirty || saving || clientErrors.length > 0 || !name.trim()} className="gap-2">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}저장
                </Button>
                <Button variant="outline" disabled={!dirty} onClick={() => {
                  setDraft(preset.config); setName(preset.name); setDescription(preset.description ?? ""); setServerErrors([]);
                }}>되돌리기</Button>
              </div>
              <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500" />
                과거 데이터에 맞춰 밴드를 세밀하게 조정할수록 과최적화 위험이 커집니다. 백테스트는 여러 종목·기간에서 확인하세요.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">미리보기</CardTitle>
              <p className="text-xs text-muted-foreground">저장하지 않은 설정으로 바로 분석해 기본 모델과 비교합니다.</p>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" className="flex-1 justify-start gap-2" onClick={() => setPickerOpen(true)}>
                  <Search className="h-4 w-4" />
                  {symbolInfo ? `${symbolInfo.name} (${symbolInfo.code})` : target.code}
                </Button>
                <Button onClick={preview} disabled={previewBusy || clientErrors.length > 0} className="gap-2">
                  {previewBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}이 설정으로 분석
                </Button>
              </div>
              {(mineJob.job.status === "FAILED" || mineJob.job.status === "TIMEOUT") && (
                <p className="text-sm text-destructive">{mineJob.job.error}</p>
              )}
              {baseJob.job.result && mineJob.job.result && <Comparison base={baseJob.job.result} mine={mineJob.job.result} />}
              <Button variant="secondary" className="w-full gap-2" disabled={dirty}
                      onClick={() => navigate(`/backtest?market=${marketSlug(target.market)}&symbol=${target.code}&preset=${presetId}&compare=1`)}>
                <FlaskConical className="h-4 w-4" />
                {dirty ? "저장 후 백테스트로 비교할 수 있습니다" : "백테스트로 기본 모델과 비교"}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="space-y-1 p-4 text-xs text-muted-foreground">
              <p className="font-medium text-foreground">바꾼 팩터로 바로 이동</p>
              {model.factors.filter((f) => changed.some((p) => p.startsWith(`factors.${f.key}.`))).map((f) => (
                <a key={f.key} href={`#edit-${f.key}`} className="block text-primary hover:underline">
                  {fillTemplate(f.label, draft.factors[f.key].params)}
                </a>
              ))}
              {!changed.some((p) => p.startsWith("factors.")) && <p>아직 바꾼 팩터가 없습니다.</p>}
            </CardContent>
          </Card>
        </div>
      </div>
      <SymbolSearchDialog open={pickerOpen} onOpenChange={setPickerOpen}
                          onSelect={(s) => setTarget({ market: s.market, code: s.code })} />
    </div>
  );
}
