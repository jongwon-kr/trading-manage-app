import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

export function NotFound({ message = "페이지를 찾을 수 없습니다." }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-24 text-center">
      <p className="text-5xl font-bold text-muted-foreground">404</p>
      <p className="text-muted-foreground">{message}</p>
      <Button asChild variant="outline">
        <Link to="/dashboard">대시보드로 이동</Link>
      </Button>
    </div>
  );
}
