import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { WatchlistTable } from "@/components/market/WatchlistTable";

export function Watchlist() {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">관심종목</CardTitle>
        <p className="text-sm text-muted-foreground">주식은 장중 20초마다, 암호화폐는 실시간으로 갱신됩니다.</p>
      </CardHeader>
      <CardContent className="px-2">
        <WatchlistTable />
      </CardContent>
    </Card>
  );
}
