import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useGetNotificationsQuery, useGetUnreadCountQuery, useMarkAllReadMutation, useMarkReadMutation } from "@/api/community.api";
import { notificationText, timeAgo } from "@/lib/community";
import type { NotificationInfo } from "@/types/community.types";

/** 헤더 알림: 안 읽은 수는 60초마다 폴링, 열면 최근 20개 */
export function NotificationBell() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const { data: unread } = useGetUnreadCountQuery(undefined, { pollingInterval: 60_000, skipPollingIfUnfocused: true });
  const { data: list, isFetching } = useGetNotificationsQuery({ size: 20 }, { skip: !open });
  const [markRead] = useMarkReadMutation();
  const [markAll] = useMarkAllReadMutation();
  const count = unread?.count ?? 0;

  const go = (n: NotificationInfo) => {
    if (!n.read) void markRead(n.id);
    setOpen(false);
    if (n.contentId) navigate(`/community/${n.contentId}`);
    else if (n.type === "FOLLOW" && n.actorName) navigate(`/users/${encodeURIComponent(n.actorName)}`);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="relative" aria-label={`알림 ${count}개`}>
          <Bell className="h-4 w-4" />
          {count > 0 && (
            <span className="absolute -right-1 -top-1 min-w-4 rounded-full bg-red-500 px-1 text-[10px] leading-4 text-white">
              {count > 99 ? "99+" : count}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-96 p-0">
        <div className="flex items-center justify-between border-b px-4 py-2">
          <p className="text-sm font-semibold">알림</p>
          <Button variant="ghost" size="sm" className="h-7 text-xs" disabled={count === 0} onClick={() => void markAll()}>
            모두 읽음
          </Button>
        </div>
        <ScrollArea className="max-h-96">
          {isFetching && !list && <p className="p-4 text-sm text-muted-foreground">불러오는 중…</p>}
          {list && list.content.length === 0 && <p className="p-4 text-sm text-muted-foreground">알림이 없습니다.</p>}
          <ul>
            {list?.content.map((n) => (
              <li key={n.id}>
                <button type="button" onClick={() => go(n)}
                        className={`flex w-full items-start gap-2 px-4 py-2 text-left text-sm hover:bg-muted ${n.read ? "text-muted-foreground" : ""}`}>
                  {!n.read && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" />}
                  <span className="flex-1">
                    {notificationText(n)}
                    <span className="block text-xs text-muted-foreground">{timeAgo(n.createdAt)}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
