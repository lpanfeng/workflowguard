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
import { formatDistanceToNow } from "date-fns";
import { zhCN } from "date-fns/locale";
import {
  BarChart3,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  MessageSquare,
  Star,
  Download,
  RefreshCw,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

const CATEGORY_COLORS: Record<string, string> = {
  general: "#6366f1",
  bug: "#ef4444",
  feature: "#22c55e",
  pricing: "#f59e0b",
  onboarding: "#8b5cf6",
};

const CATEGORY_LABELS: Record<string, string> = {
  general: "一般反馈",
  bug: "Bug报告",
  feature: "功能建议",
  pricing: "定价反馈",
  onboarding: "使用问题",
};

interface FeedbackStats {
  total: number;
  categoryCounts: Record<string, number>;
  ratingDistribution: Record<string, number>;
  sourceCounts: Record<string, number>;
  recentFeedbacks: Array<{
    id: string;
    name: string;
    email: string;
    category: string;
    rating: number | null;
    message: string;
    created_at: string;
  }>;
  productSuggestions: Array<{ name: string; count: number }>;
  iterationPriorities: Array<{
    priority: string;
    item: string;
    reason: string;
    votes: number;
  }>;
}

export default function FeedbackAnalyticsPage() {
  const [stats, setStats] = useState<FeedbackStats | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/feedback/stats");
      const data = await res.json();
      setStats(data);
    } catch (error) {
      console.error("Failed to fetch feedback stats:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  // Prepare chart data
  const categoryData = stats
    ? Object.entries(stats.categoryCounts).map(([name, value]) => ({
        name: CATEGORY_LABELS[name] || name,
        value,
        rawName: name,
      }))
    : [];

  const ratingData = stats
    ? Object.entries(stats.ratingDistribution).map(([name, value]) => ({
        name: `${name}星`,
        value,
      }))
    : [];

  const suggestionData = stats
    ? stats.productSuggestions.map(s => ({ name: s.name, value: s.count }))
    : [];

  const priorityData = stats
    ? stats.iterationPriorities.map(p => ({ name: p.item, priority: p.priority, votes: p.votes }))
    : [];

  const PRIORITY_COLORS = { P0: "#ef4444", P1: "#f59e0b", P2: "#6366f1" };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-2" />
          <p className="text-muted-foreground">加载反馈数据中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">反馈数据分析</h1>
          <p className="text-muted-foreground">
            共 {stats?.total || 0} 条反馈 · 最后更新: {new Date().toLocaleString("zh-CN")}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchStats} disabled={loading}>
          <RefreshCw className="h-4 w-4 mr-1" />
          刷新
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">总反馈数</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats?.total || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">累计收到反馈</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">功能建议</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">
              {stats?.categoryCounts?.feature || 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">功能改进建议</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Bug报告</CardTitle>
            <AlertCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-600">
              {stats?.categoryCounts?.bug || 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">需要修复的问题</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">平均评分</CardTitle>
            <Star className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-yellow-600">
              {stats?.ratingDistribution
                ? Object.entries(stats.ratingDistribution)
                    .reduce((sum, [r, c]) => sum + Number(r) * c, 0) /
                  Object.values(stats.ratingDistribution).reduce((a, b) => a + b, 1)
                    .toFixed(1)
                : "--"}
            </div>
            <p className="text-xs text-muted-foreground mt-1">基于评分反馈</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Category Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              反馈分类分布
            </CardTitle>
            <CardDescription>按反馈类型统计</CardDescription>
          </CardHeader>
          <CardContent>
            {categoryData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {categoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={CATEGORY_COLORS[entry.rawName] || "#8884d8"} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-64 flex items-center justify-center text-muted-foreground">
                暂无分类数据
              </div>
            )}
          </CardContent>
        </Card>

        {/* Rating Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Star className="h-4 w-4" />
              评分分布
            </CardTitle>
            <CardDescription>用户满意度评分</CardDescription>
          </CardHeader>
          <CardContent>
            {ratingData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={ratingData}>
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="value" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-64 flex items-center justify-center text-muted-foreground">
                暂无评分数据
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Product Suggestions */}
      {suggestionData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              产品需求关键词
            </CardTitle>
            <CardDescription>基于反馈内容提取的高频需求词</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={suggestionData} layout="horizontal">
                <XAxis type="number" />
                <YAxis dataKey="name" type="category" width={80} />
                <Tooltip />
                <Bar dataKey="value" fill="#6366f1" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Iteration Priorities */}
      {priorityData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4" />
              产品迭代优先级建议
            </CardTitle>
            <CardDescription>基于反馈数据的优先级排序</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats?.iterationPriorities.map((p, i) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-3">
                    <Badge style={{ backgroundColor: PRIORITY_COLORS[p.priority] || "#6366f1" }}>
                      {p.priority}
                    </Badge>
                    <div>
                      <span className="font-medium">{p.item}</span>
                      <span className="text-muted-foreground text-sm ml-2">{p.reason}</span>
                    </div>
                  </div>
                  <span className="text-sm text-muted-foreground">{p.votes}次提及</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Feedbacks */}
      {stats?.recentFeedbacks.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>最近反馈</CardTitle>
            <CardDescription>最新的10条用户反馈</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stats.recentFeedbacks.map((f) => (
                <div key={f.id} className="flex items-start justify-between p-3 rounded-lg border">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium">{f.name}</span>
                      <span className="text-xs text-muted-foreground">{f.email}</span>
                      <Badge variant="outline" className="text-xs">
                        {CATEGORY_LABELS[f.category] || f.category}
                      </Badge>
                      {f.rating && (
                        <div className="flex items-center gap-0.5">
                          {Array.from({ length: f.rating }).map((_, i) => (
                            <Star key={i} className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                          ))}
                        </div>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">{f.message}</p>
                  </div>
                  <span className="text-xs text-muted-foreground whitespace-nowrap ml-4">
                    {formatDistanceToNow(new Date(f.created_at), { addSuffix: true, locale: zhCN })}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {stats?.total === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">暂无反馈数据</h3>
            <p className="text-muted-foreground">用户反馈将在这里显示</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
