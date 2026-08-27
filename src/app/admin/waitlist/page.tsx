"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatDistanceToNow } from "date-fns";
import { zhCN } from "date-fns/locale";
import { Download, Users, RefreshCw } from "lucide-react";

interface WaitlistEntry {
  id: string;
  email: string;
  name: string | null;
  company: string | null;
  role: string | null;
  source: string;
  status: string;
  note: string | null;
  created_at: string;
}

export default function WaitlistAdminPage() {
  const [entries, setEntries] = useState<WaitlistEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");

  const fetchEntries = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: "100" });
      if (statusFilter !== "all") params.set("status", statusFilter);
      const res = await fetch(`/api/waitlist?${params}`);
      const data = await res.json();
      setEntries(data.waitlists || []);
      setTotal(data.total || 0);
    } catch (error) {
      console.error("Failed to fetch waitlist:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEntries();
  }, [statusFilter]);

  const handleExport = () => {
    const headers = ["邮箱", "姓名", "公司", "角色", "来源", "状态", "注册时间"];
    const rows = entries.map((e) => [
      e.email,
      e.name || "",
      e.company || "",
      e.role || "",
      e.source,
      e.status,
      new Date(e.created_at).toLocaleString("zh-CN"),
    ]);
    const csv = [headers, ...rows].map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `waitlist-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleStatusChange = async (id: string, newStatus: string) => {
    try {
      await fetch(`/api/waitlist/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      fetchEntries();
    } catch (error) {
      console.error("Failed to update status:", error);
    }
  };

  const statusColors: Record<string, string> = {
    pending: "bg-yellow-100 text-yellow-800",
    active: "bg-green-100 text-green-800",
    rejected: "bg-red-100 text-red-800",
    archived: "bg-gray-100 text-gray-800",
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">等待名单管理</h1>
          <p className="text-muted-foreground">共 {total} 人订阅</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchEntries} disabled={loading}>
            <RefreshCw className="h-4 w-4 mr-1" />
            刷新
          </Button>
          <Button variant="outline" size="sm" onClick={handleExport} disabled={entries.length === 0}>
            <Download className="h-4 w-4 mr-1" />
            导出 CSV
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-primary" />
          <span className="text-2xl font-bold">{total}</span>
          <span className="text-muted-foreground">总订阅</span>
        </div>
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v || "all")}>
          <SelectTrigger className="w-32">
            <SelectValue placeholder="状态筛选" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部</SelectItem>
            <SelectItem value="pending">待处理</SelectItem>
            <SelectItem value="active">已激活</SelectItem>
            <SelectItem value="rejected">已拒绝</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>等待名单</CardTitle>
          <CardDescription>
            {loading ? "加载中..." : `${entries.length} 条记录`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">加载中...</div>
          ) : entries.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">暂无数据</div>
          ) : (
            <div className="space-y-3">
              {entries.map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border"
                >
                  <div className="flex items-center gap-4">
                    <div>
                      <div className="font-medium">
                        {entry.name || entry.email}
                        {entry.company && (
                          <span className="text-muted-foreground text-sm ml-2">
                            @{entry.company}
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {entry.email}
                        {entry.role && (
                          <span className="ml-2">· {entry.role}</span>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {formatDistanceToNow(new Date(entry.created_at), {
                          addSuffix: true,
                          locale: zhCN,
                        })}
                        {entry.source !== "web" && (
                          <span className="ml-2">来自 {entry.source}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={statusColors[entry.status] || "bg-gray-100"}>
                      {entry.status}
                    </Badge>
                    <Select
                      defaultValue={entry.status}
                      onValueChange={(v) => { if (v) handleStatusChange(entry.id, v); }}
                    >
                      <SelectTrigger className="w-24 h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">待处理</SelectItem>
                        <SelectItem value="active">已激活</SelectItem>
                        <SelectItem value="rejected">已拒绝</SelectItem>
                        <SelectItem value="archived">已归档</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
