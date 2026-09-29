import { useGetPresetsQuery } from "@/api/strategy-preset.api";
import { usePersistentState } from "./usePersistentState";

/**
 * 페이지 간에 공유되는 '분석 방법' 선택 (localStorage). presetId 는 실제로 있는 내 전략일 때만 값이 있다.
 * 전략 목록을 불러오기 전에는 loading=true — 기본 모델로 먼저 분석했다가 다시 분석하는 일을 막는다.
 */
export function useSelectedPreset(): { value: number | null; setValue: (id: number | null) => void; presetId?: number; loading: boolean } {
  const [state, setState] = usePersistentState<{ presetId: number | null }>("analysis.preset", { presetId: null });
  const { data: presets, isLoading, isError } = useGetPresetsQuery();
  const valid = state.presetId != null && presets?.some((p) => p.id === state.presetId);
  return {
    value: state.presetId,
    setValue: (id) => setState({ presetId: id }),
    presetId: valid ? (state.presetId as number) : undefined,
    loading: state.presetId != null && isLoading && !isError,
  };
}
