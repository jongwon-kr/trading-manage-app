interface Props {
  values: number[];
  width?: number;
  height?: number;
  className?: string;
}

/** 지수 카드용 미니 추세선. 색은 기간 전체 등락으로 정한다 (currentColor 사용). */
export function Sparkline({ values, width = 120, height = 36, className }: Props) {
  if (values.length < 2) return <svg width={width} height={height} className={className} />;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const points = values
    .map((v, i) => `${(i / (values.length - 1)) * width},${height - 2 - ((v - min) / span) * (height - 4)}`)
    .join(" ");
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className={className} aria-hidden>
      <polyline points={points} fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinejoin="round" />
    </svg>
  );
}
