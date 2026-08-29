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
import {
  Download,
  Users,
  RefreshCw,
  TrendingUp,
  Calendar,
  Week,
  Building2,
  UserCircle,
  BarChart3,
  Zap,
} from "lucide-react";

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

interface WaitlistStats {
  total: number;
  todayCount: number;
  weekCount: number;
  statusCounts: Record<string, number>;
  sourceCounts: Record<string, number>;
  priorityCounts: Record<string, number>;
  dailyTrend: Array<{ date: string; count: number }>;
  topCompanies: string[];
  topRoles: string[];
}

export default function WaitlistAdminPage() {
  const [entries, setEntries] = useState<WaitlistEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [stats, setStats] = useState<WaitlistStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);

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

  const fetchStats = async () => {
    setStatsLoading(true);
    try {
      const res = await fetch("/api/waitlist/stats");
      const data = await res.json();
      setStats(data);
    } catch (error) {
      console.error("Failed to fetch stats:", error);
    } finally {
      setStatsLoading(false);
    }
  };

  useEffect(() => {
    fetchEntries();
    fetchStats();
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
      fetchStats();
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

  const statusLabels: Record<string, string> = {
    pending: "待处理",
    active: "已激活",
    rejected: "已拒绝",
    archived: "已归档",
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">等待名单管理</h1>
          <p className="text-muted-foreground">
            共 {total} 人订阅 · 最后更新: {new Date().toLocaleString("zh-CN")}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => { fetchEntries(); fetchStats(); }} disabled={loading || statsLoading}>
            <RefreshCw className="h-4 w-4 mr-1" />
            刷新
          </Button>
          <Button variant="outline" size="sm" onClick={handleExport} disabled={entries.length === 0}>
            <Download className="h-4 w-4 mr-1" />
            导出 CSV
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              总订阅数
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {statsLoading ? "..." : stats?.total || total}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              累计加入等待名单
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              今日新增
            </CardTitle>
            <Calendar className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">
              {statsLoading ? "..." : stats?.todayCount || 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              今天新加入
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              本周新增
            </CardTitle>
            <Week className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600">
              {statsLoading ? "..." : stats?.weekCount || 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              近7天新增
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              待处理
            </CardTitle>
            <BarChart3 className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-yellow-600">
              {statsLoading ? "..." : stats?.statusCounts?.pending || 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              待激活用户
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Trend Chart */}
      {stats?.dailyTrend && stats.dailyTrend.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              近7天订阅趋势
            </CardTitle>
            <CardDescription>
              每日新增订阅数量
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-2 h-32">
              {stats.dailyTrend.map((day, i) => {
                const maxCount = Math.max(...stats.dailyTrend.map(d => d.count), 1);
                const height = (day.count / maxCount) * 100;
                return (
                  <div key={day.date} className="flex-1 flex flex-col items-center gap-1">
                    <span className="text-xs font-medium">{day.count}</span>
                    <div
                      className="w-full bg-primary rounded-t-sm transition-all"
                      style={{ height: `${Math.max(height, 4)}%` }}
                    />
                    <span className="text-xs text-muted-foreground">
                      {day.date.slice(5)}
                    </span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Insights */}
      {stats && (stats.topCompanies.length > 0 || stats.topRoles.length > 0 || stats.priorityCounts) && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Priority Distribution */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm">
                <Zap className="h-4 w-4" />
                优先级分布
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {(["high", "medium", "low"] as const).map((p) => {
                  const count = stats.priorityCounts?.[p] || 0;
                  const total = Object.values(stats.priorityCounts || {}).reduce((a: number, b: number) => a + b, 0) || 1;
                  const pct = Math.round((count / total) * 100);
                  const colors: Record<string, string> = {
                    high: "bg-red-500",
                    medium: "bg-yellow-500",
                    low: "bg-green-500",
                  };
                  const labels: Record<string, string> = {
                    high: "高优先级",
                    medium: "中优先级",
                    low: "低优先级",
                  };
                  return (
                    <div key={p} className="flex items-center gap-3">
                      <span className="text-xs w-16 text-muted-foreground">{labels[p]}</span>
                      <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                        <div className={`h-full ${colors[p]} rounded-full`} style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-xs font-medium w-8 text-right">{count} ({pct}%)</span>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm">
                <Building2 className="h-4 w-4" />
                公司分布 (Top 5)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {stats.topCompanies.map((c) => (
                  <Badge key={c} variant="secondary">{c}</Badge>
                ))}
                {stats.topCompanies.length === 0 && (
                  <span className="text-sm text-muted-foreground">暂无公司数据</span>
                )}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm">
                <UserCircle className="h-4 w-4" />
                角色分布 (Top 5)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {stats.topRoles.map((r) => (
                  <Badge key={r} variant="outline">{r}</Badge>
                ))}
                {stats.topRoles.length === 0 && (
                  <span className="text-sm text-muted-foreground">暂无角色数据</span>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filter and List */}
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
                      {statusLabels[entry.status] || entry.status}
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
