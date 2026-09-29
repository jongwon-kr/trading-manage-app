import { useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useGetReportsQuery, useResolveReportMutation } from "@/api/community.api";
import { useAppSelector } from "@/store/hooks";
import { REPORT_REASONS, timeAgo } from "@/lib/community";
import type { ReportStatus } from "@/types/community.types";

const STATUS_LABELS: Record<ReportStatus, string> = { OPEN: "대기", RESOLVED: "숨김 처리", REJECTED: "기각" };

/** 관리자: 신고 목록과 처리 (서버가 ROLE_ADMIN 을 확인하고, 화면은 일반 사용자에게 숨긴다) */
export function AdminReports() {
  const isAdmin = useAppSelector((s) => s.auth.user?.role === "ADMIN");
  const [status, setStatus] = useState<ReportStatus>("OPEN");
  const { data, isFetching } = useGetReportsQuery({ status }, { skip: !isAdmin });
  const [resolve, { isLoading }] = useResolveReportMutation();
  if (!isAdmin) return <Navigate to="/dashboard" replace />;

  const act = (id: number, hide: boolean) =>
    resolve({ id, hide }).unwrap().then(() => toast.success(hide ? "숨김 처리했습니다." : "기각했습니다."))
      .catch((e: { message?: string }) => toast.error(e.message ?? "처리하지 못했습니다."));

  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3 space-y-0">
        <CardTitle className="text-base">신고 관리</CardTitle>
        <Tabs value={status} onValueChange={(v) => setStatus(v as ReportStatus)}>
          <TabsList>{(Object.keys(STATUS_LABELS) as ReportStatus[]).map((s) => <TabsTrigger key={s} value={s}>{STATUS_LABELS[s]}</TabsTrigger>)}</TabsList>
        </Tabs>
      </CardHeader>
      <CardContent className="px-2">
        {data && data.content.length === 0 && !isFetching && <p className="p-6 text-center text-sm text-muted-foreground">신고가 없습니다.</p>}
        {data && data.content.length > 0 && (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>대상</TableHead>
                <TableHead>사유</TableHead>
                <TableHead>신고자</TableHead>
                <TableHead>접수</TableHead>
                <TableHead className="text-right">처리</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.content.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="max-w-[340px]">
                    <Badge variant="outline" className="mr-1 font-normal">{r.targetType === "CONTENT" ? "글" : "댓글"}</Badge>
                    {r.targetHidden && <Badge variant="secondary" className="mr-1 font-normal">숨김</Badge>}
                    <Link to={`/community/${r.contentId}`} className="font-medium hover:underline">{r.targetTitle ?? "(삭제됨)"}</Link>
                    {r.targetPreview && <p className="truncate text-xs text-muted-foreground">{r.targetPreview}</p>}
                  </TableCell>
                  <TableCell>
                    {REPORT_REASONS[r.reason]}
                    {r.memo && <p className="max-w-[200px] truncate text-xs text-muted-foreground">{r.memo}</p>}
                  </TableCell>
                  <TableCell>{r.reporterName}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{timeAgo(r.createdAt)}</TableCell>
                  <TableCell className="text-right">
                    {r.status === "OPEN" ? (
                      <div className="flex justify-end gap-2">
                        <Button size="sm" variant="destructive" disabled={isLoading} onClick={() => act(r.id, true)}>숨김</Button>
                        <Button size="sm" variant="outline" disabled={isLoading} onClick={() => act(r.id, false)}>기각</Button>
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">{STATUS_LABELS[r.status]}</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
