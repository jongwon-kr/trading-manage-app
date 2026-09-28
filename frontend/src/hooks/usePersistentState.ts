import { useEffect, useState } from "react";

/** localStorage 에 저장되는 상태 (차트 지표 선택 같은 개인 설정용). 저장소 접근 실패 시 메모리 상태로 동작. */
export function usePersistentState<T extends object>(key: string, initial: T): [T, (v: T) => void] {
  const [value, setValue] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(key);
      return raw ? { ...initial, ...JSON.parse(raw) } : initial;
    } catch {
      return initial;
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // 사생활 보호 모드 등에서는 저장하지 않는다
    }
  }, [key, value]);
  return [value, setValue];
}
