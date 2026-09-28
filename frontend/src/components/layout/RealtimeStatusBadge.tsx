import { Badge } from "@/components/ui/badge";
import { useRealtimeStatus } from "@/hooks/useRealtime";
import { cn } from "@/utils/shadcn-util";

const LABELS = {
  connecting: { text: "실시간 연결 중", dot: "bg-amber-500 animate-pulse" },
  reconnecting: { text: "재연결 중", dot: "bg-amber-500 animate-pulse" },
  open: { text: "실시간", dot: "bg-emerald-500" },
} as const;

/** 코인 실시간 시세 연결 상태. 구독 중인 종목이 없으면(idle) 표시하지 않는다. */
export function RealtimeStatusBadge() {
  const status = useRealtimeStatus();
  if (status === "idle") return null;
  const { text, dot } = LABELS[status];
  return (
    <Badge variant="secondary" className="hidden gap-1.5 md:flex">
      <span className={cn("h-2 w-2 rounded-full", dot)} />
      {text}
    </Badge>
  );
}
