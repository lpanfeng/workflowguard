"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { supabase } from "@/lib/supabase"
import { CheckCircle2, Clock, AlertTriangle, TrendingUp, Zap, ShieldCheck } from "lucide-react"

type QuickStats = {
  pendingApproval: number
  completedToday: number
  successRate: number
  totalWorkflows: number
  aiCallsToday: number
  avgApprovalTime: string
}

export default function QuickStatsBar({ userId }: { userId: string }) {
  const [stats, setStats] = useState<QuickStats>({
    pendingApproval: 0,
    completedToday: 0,
    successRate: 0,
    totalWorkflows: 0,
    aiCallsToday: 0,
    avgApprovalTime: "—",
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadStats()
  }, [userId])

  const loadStats = async () => {
    if (!userId) return
    setLoading(true)
    try {
      const today = new Date().toISOString().slice(0, 10)

      const [pending, completed, workflows, audit] = await Promise.all([
        supabase
          .from("tasks")
          .select("id", { count: "exact", head: true })
          .eq("user_id", userId)
          .eq("status", "waiting_approval"),
        supabase
          .from("tasks")
          .select("id", { count: "exact", head: true })
          .eq("user_id", userId)
          .in("status", ["approved", "completed"])
          .gte("updated_at", today),
        supabase
          .from("workflows")
          .select("id", { count: "exact", head: true })
          .eq("user_id", userId)
          .eq("is_active", true),
        supabase
          .from("audit_logs")
          .select("action, details", { count: "exact", head: true })
          .eq("user_id", userId)
          .gte("created_at", today),
      ])

      const totalTasks = (completed.data?.length ?? 0) + (pending.data?.length ?? 0)
      const successRate = totalTasks > 0
        ? Math.round(((completed.data?.length ?? 0) / totalTasks) * 100)
        : 0

      setStats({
        pendingApproval: pending.data?.length ?? 0,
        completedToday: completed.data?.length ?? 0,
        successRate,
        totalWorkflows: workflows.data?.length ?? 0,
        aiCallsToday: audit.data?.filter((l: any) => l.action === "ai_executed").length ?? 0,
        avgApprovalTime: "—",
      })
    } catch (err) {
      console.error("加载快速统计失败:", err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) return null

  const items = [
    {
      icon: <AlertTriangle className="h-4 w-4 text-amber-600" />,
      label: "待审批",
      value: stats.pendingApproval,
      color: "border-amber-200 bg-amber-50/50",
      badge: stats.pendingApproval > 0 ? "需要处理" : undefined,
      badgeColor: stats.pendingApproval > 0 ? "bg-amber-100 text-amber-700" : "bg-green-100 text-green-700",
    },
    {
      icon: <CheckCircle2 className="h-4 w-4 text-green-600" />,
      label: "今日完成",
      value: stats.completedToday,
      color: "border-green-200 bg-green-50/50",
    },
    {
      icon: <TrendingUp className="h-4 w-4 text-blue-600" />,
      label: "成功率",
      value: `${stats.successRate}%`,
      color: "border-blue-200 bg-blue-50/50",
      badge: stats.successRate >= 90 ? "表现良好" : stats.successRate >= 70 ? "一般" : "需关注",
      badgeColor: stats.successRate >= 90 ? "bg-green-100 text-green-700" : stats.successRate >= 70 ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700",
    },
    {
      icon: <Zap className="h-4 w-4 text-purple-600" />,
      label: "今日AI调用",
      value: stats.aiCallsToday,
      color: "border-purple-200 bg-purple-50/50",
    },
    {
      icon: <Clock className="h-4 w-4 text-cyan-600" />,
      label: "活跃工作流",
      value: stats.totalWorkflows,
      color: "border-cyan-200 bg-cyan-50/50",
    },
    {
      icon: <ShieldCheck className="h-4 w-4 text-emerald-600" />,
      label: "审计记录",
      value: "实时",
      color: "border-emerald-200 bg-emerald-50/50",
      badge: "全程可追溯",
      badgeColor: "bg-emerald-100 text-emerald-700",
    },
  ]

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
      {items.map((item, i) => (
        <Card key={i} className={`border ${item.color} hover:shadow-sm transition-shadow`}>
          <CardContent className="pt-4 pb-3 px-4">
            <div className="flex items-center justify-between mb-1">
              <div className="p-1.5 rounded-full bg-white/80">{item.icon}</div>
              {item.badge && (
                <Badge variant="secondary" className={`text-xs px-1.5 py-0 ${item.badgeColor}`}>
                  {item.badge}
                </Badge>
              )}
            </div>
            <div className="text-xl font-bold">{item.value}</div>
            <div className="text-xs text-muted-foreground">{item.label}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
