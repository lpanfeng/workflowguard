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

interface Feedback {
  id: string;
  name: string;
  email: string;
  category: string;
  message: string;
  source: string;
  rating: number | null;
  status: string;
  created_at: string;
}

const CATEGORIES: Record<string, string> = {
  general: "通用",
  bug: "Bug报告",
  feature: "功能请求",
  pricing: "定价相关",
  onboarding: "上手问题",
};

const STATUSES: Record<string, string> = {
  new: "新",
  read: "已读",
  responded: "已回复",
  archived: "已归档",
};

export default function FeedbacksPage() {
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [total, setTotal] = useState(0);
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);

  useEffect(() => {
    fetchFeedbacks();
  }, [filter, page]);

  async function fetchFeedbacks() {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        limit: "20",
        offset: String(page * 20),
      });
      if (filter !== "all") {
        params.set("status", filter);
      }
      const res = await fetch(`/api/feedback?${params}`);
      const data = await res.json();
      setFeedbacks(data.feedbacks || []);
      setTotal(data.total || 0);
    } catch (e) {
      console.error("Failed to fetch feedbacks:", e);
    } finally {
      setLoading(false);
    }
  }

  async function updateStatus(id: string, status: string) {
    try {
      const res = await fetch(`/api/feedback/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        fetchFeedbacks();
      }
    } catch (e) {
      console.error("Failed to update status:", e);
    }
  }

  const unreadCount = feedbacks.filter((f) => f.status === "new").length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">用户反馈</h1>
          <p className="text-muted-foreground">
            管理来自用户的反馈和功能请求
          </p>
        </div>
        <Badge variant="outline" className="text-lg px-3 py-1">
          {total} 条反馈
          {unreadCount > 0 && (
            <span className="ml-2 bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
              {unreadCount} 新
            </span>
          )}
        </Badge>
      </div>

      <div className="flex items-center gap-4">
        <Select value={filter} onValueChange={(v) => setFilter(v || "all")}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="筛选状态" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部状态</SelectItem>
            <SelectItem value="new">新反馈</SelectItem>
            <SelectItem value="read">已读</SelectItem>
            <SelectItem value="responded">已回复</SelectItem>
            <SelectItem value="archived">已归档</SelectItem>
          </SelectContent>
        </Select>

        <div className="flex gap-2 ml-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(Math.max(0, page - 1))}
            disabled={page === 0}
          >
            上一页
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(page + 1)}
            disabled={(page + 1) * 20 >= total}
          >
            下一页
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-muted-foreground">
          加载中...
        </div>
      ) : feedbacks.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            暂无反馈数据
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {feedbacks.map((fb) => (
            <Card key={fb.id}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-base flex items-center gap-2">
                      {fb.name}
                      <span className="text-sm text-muted-foreground font-normal">
                        ({fb.email})
                      </span>
                    </CardTitle>
                    <CardDescription className="flex items-center gap-2">
                      <span>
                        {formatDistanceToNow(new Date(fb.created_at), {
                          addSuffix: true,
                          locale: zhCN,
                        })}
                      </span>
                      <Badge variant="secondary" className="text-xs">
                        {CATEGORIES[fb.category] || fb.category}
                      </Badge>
                      <Badge
                        variant={fb.status === "new" ? "destructive" : "outline"}
                        className="text-xs"
                      >
                        {STATUSES[fb.status] || fb.status}
                      </Badge>
                      {fb.rating && (
                        <span className="text-yellow-500 text-xs">
                          {"★".repeat(fb.rating)}
                          {"☆".repeat(5 - fb.rating)}
                        </span>
                      )}
                    </CardDescription>
                  </div>
                  <div className="flex gap-1">
                    {fb.status === "new" && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => updateStatus(fb.id, "read")}
                      >
                        标为已读
                      </Button>
                    )}
                    {fb.status === "read" && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => updateStatus(fb.id, "responded")}
                      >
                        标记已回复
                      </Button>
                    )}
                    {fb.status !== "archived" && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => updateStatus(fb.id, "archived")}
                      >
                        归档
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm whitespace-pre-wrap">{fb.message}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
