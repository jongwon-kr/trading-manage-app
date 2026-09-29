import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/utils/shadcn-util";

interface Props {
  value: number;
  onChange: (v: number) => void;
  className?: string;
  step?: number;
  error?: string;
  "aria-label"?: string;
  disabled?: boolean;
}

/** 숫자 입력: 입력 중에는 문자열("-", "0.")을 그대로 두고, 해석 가능한 숫자일 때만 반영한다 */
export function NumberField({ value, onChange, className, step, error, disabled, ...rest }: Props) {
  const [text, setText] = useState(String(value));
  useEffect(() => {
    if (Number(text) !== value) setText(String(value));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 외부 값이 바뀔 때만 동기화
  }, [value]);
  return (
    <Input
      inputMode="decimal"
      value={text}
      step={step}
      disabled={disabled}
      aria-label={rest["aria-label"]}
      aria-invalid={!!error}
      title={error}
      className={cn("h-8 w-20 px-2 text-right tabular-nums", error && "border-destructive", className)}
      onChange={(e) => {
        setText(e.target.value);
        const n = Number(e.target.value);
        if (e.target.value.trim() !== "" && Number.isFinite(n)) onChange(n);
      }}
      onBlur={() => setText(String(value))}
    />
  );
}
