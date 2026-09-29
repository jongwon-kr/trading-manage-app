import { Link } from "react-router-dom";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useGetPresetsQuery } from "@/api/strategy-preset.api";

const DEFAULT = "default";

interface Props {
  /** null = 기본 모델 */
  value: number | null;
  onChange: (id: number | null) => void;
  className?: string;
}

/** 분석 방법 선택: 기본 모델 v1 또는 내 전략 */
export function StrategyPresetSelect({ value, onChange, className }: Props) {
  const { data: presets = [] } = useGetPresetsQuery();
  // 삭제된 전략을 기억하고 있으면 기본 모델로 표시
  const current = value != null && presets.some((p) => p.id === value) ? String(value) : DEFAULT;
  return (
    <div className="flex items-center gap-2">
      <Select value={current} onValueChange={(v) => onChange(v === DEFAULT ? null : Number(v))}>
        <SelectTrigger className={className ?? "w-52"} aria-label="분석 방법">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={DEFAULT}>기본 모델 (v1)</SelectItem>
          {presets.map((p) => (
            <SelectItem key={p.id} value={String(p.id)}>
              {p.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Link to="/strategies" className="whitespace-nowrap text-xs text-primary hover:underline">
        내 전략 관리
      </Link>
    </div>
  );
}
