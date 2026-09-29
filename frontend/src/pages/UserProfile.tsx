import { Link, useParams } from "react-router-dom";
import { UserCheck, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useGetContentsQuery, useGetProfileQuery, useSetFollowMutation } from "@/api/community.api";
import { CATEGORY_LABELS, timeAgo } from "@/lib/community";

/** 사용자 프로필: 게시글·팔로워·팔로잉 수, 팔로우 버튼, 작성한 글 */
export function UserProfile() {
  const { username = "" } = useParams();
  const { data: profile, isError } = useGetProfileQuery(username);
  const { data: posts } = useGetContentsQuery({ author: username, size: 30 });
  const [setFollow, { isLoading }] = useSetFollowMutation();

  if (isError) return <p className="py-16 text-center text-sm text-muted-foreground">사용자를 찾을 수 없습니다.</p>;
  if (!profile) return <Skeleton className="mx-auto h-40 max-w-3xl" />;

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <Card>
        <CardContent className="flex flex-wrap items-center gap-4 p-6">
          <Avatar className="h-14 w-14"><AvatarFallback>{profile.username.slice(0, 2).toUpperCase()}</AvatarFallback></Avatar>
          <div className="flex-1">
            <p className="text-xl font-semibold">{profile.username}</p>
            <p className="text-sm text-muted-foreground">
              글 <b className="text-foreground">{profile.postCount}</b> · 팔로워 <b className="text-foreground">{profile.followerCount}</b> ·
              팔로잉 <b className="text-foreground">{profile.followingCount}</b>
            </p>
          </div>
          {!profile.me && (
            <Button variant={profile.following ? "outline" : "default"} disabled={isLoading} className="gap-2"
                    onClick={() => setFollow({ username, follow: !profile.following }).unwrap()
                      .catch((e: { message?: string }) => toast.error(e.message ?? "처리하지 못했습니다."))}>
              {profile.following ? <><UserCheck className="h-4 w-4" />팔로잉</> : <><UserPlus className="h-4 w-4" />팔로우</>}
            </Button>
          )}
        </CardContent>
      </Card>
      <h2 className="text-sm font-semibold text-muted-foreground">작성한 글</h2>
      {posts?.content.length === 0 && <p className="text-sm text-muted-foreground">아직 글이 없습니다.</p>}
      <ul className="divide-y rounded-md border">
        {posts?.content.map((p) => (
          <li key={p.id}>
            <Link to={`/community/${p.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-muted">
              <span className="w-16 shrink-0 text-xs text-muted-foreground">{CATEGORY_LABELS[p.category]}</span>
              <span className="flex-1 truncate">{p.title}</span>
              <span className="text-xs text-muted-foreground">{timeAgo(p.createdAt)}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
