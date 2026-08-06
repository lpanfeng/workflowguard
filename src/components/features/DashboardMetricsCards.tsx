"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Loader2, TrendingUp, TrendingDown, CheckCircle2, Clock, AlertTriangle } from "lucide-react"

type MetricCardProps = {
  title: string
  value: string | number
  subtitle: string
  trend?: "up" | "down" | "neutral"
  trendValue?: string
  icon: React.ReactNode
  color: string
}

function MetricCard({ title, value, subtitle, trend, trendValue, icon, color }: MetricCardProps) {
  return (
    <Card className="h-full">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <div className={`h-8 w-8 rounded-full flex items-center justify-center ${color}`}>
          {icon}
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
        {trend && trendValue && (
          <div className={`flex items-center gap-1 mt-2 text-xs ${trend === "up" ? "text-green-600" : trend === "down" ? "text-red-600" : "text-gray-500"}`}>
            {trend === "up" ? <TrendingUp className="h-3 w-3" /> : trend === "down" ? <TrendingDown className="h-3 w-3" /> : null}
            <span>{trendValue}</span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

type DashboardMetrics = {
  pendingApproval: number
  completedToday: number
  activeWorkflows: number
  successRate: number
  avgApprovalTime: number
  highRiskOps: number
}

export function DashboardMetricsCards({ userId }: { userId?: string }) {
  const [metrics, setMetrics] = useState<DashboardMetrics>({
    pendingApproval: 0,
    completedToday: 0,
    activeWorkflows: 0,
    successRate: 0,
    avgApprovalTime: 0,
    highRiskOps: 0,
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!userId) return
    loadMetrics()
  }, [userId])

  const loadMetrics = async () => {
    if (!userId) return
    setLoading(true)

    try {
      const today = new Date().toISOString().slice(0, 10)

      // 并行获取各项指标
      const [
        pendingResult,
        todayResult,
        workflowsResult,
        metricsResult,
        auditStatsResult,
      ] = await Promise.all([
        // 待审批数
        fetch(`/api/tasks/list?userId=${userId}&status=waiting_approval`).then(r => r.json()),
        // 今日完成数
        fetch(`/api/tasks/list?userId=${userId}&date_from=${today}`).then(r => r.json()),
        // 活跃工作流数
        fetch(`/api/workflows/list?userId=${userId}&active=true`).then(r => r.json()),
        // 成功率
        fetch(`/api/metrics?userId=${userId}`).then(r => r.json()),
        // 审计统计
        fetch(`/api/metrics/audit-stats?userId=${userId}`).then(r => r.json()),
      ])

      const pendingCount = pendingResult?.tasks?.length ?? pendingResult?.count ?? 0
      const todayCount = todayResult?.tasks?.filter((t: any) => 
        ["approved", "completed"].includes(t.status)
      ).length ?? 0
      const activeWorkflows = workflowsResult?.workflows?.length ?? workflowsResult?.count ?? 0
      const successRate = metricsResult?.successRate ?? 0
      const avgApprovalTime = auditStatsResult?.data?.avgApprovalTime ?? 0
      const highRiskOps = auditStatsResult?.data?.highRiskCount ?? 0

      setMetrics({
        pendingApproval: pendingCount,
        completedToday: todayCount,
        activeWorkflows: activeWorkflows,
        successRate: successRate,
        avgApprovalTime: avgApprovalTime,
        highRiskOps: highRiskOps,
      })
    } catch (err) {
      console.error("加载指标失败:", err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
        {[...Array(6)].map((_, i) => (
          <Card key={i}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-center h-20">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  // 计算平均审批时长（分钟）
  const formatApprovalTime = (minutes: number) => {
    if (minutes === 0) return "暂无数据"
    if (minutes < 60) return `${Math.round(minutes)}分钟`
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return mins > 0 ? `${hours}小时${mins}分` : `${hours}小时`
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
      <MetricCard
        title="待审批"
        value={metrics.pendingApproval}
        subtitle="需要处理的任务"
        icon={<AlertTriangle className="h-4 w-4 text-amber-600" />}
        color="bg-amber-50"
      />
      <MetricCard
        title="今日完成"
        value={metrics.completedToday}
        subtitle="已通过 + 已完成"
        trend="up"
        trendValue="+12% vs 昨日"
        icon={<CheckCircle2 className="h-4 w-4 text-green-600" />}
        color="bg-green-50"
      />
      <MetricCard
        title="成功率"
        value={`${metrics.successRate}%`}
        subtitle="任务成功率"
        trend={metrics.successRate >= 90 ? "up" : "down"}
        trendValue={metrics.successRate >= 90 ? "表现良好" : "需关注"}
        icon={<TrendingUp className="h-4 w-4 text-blue-600" />}
        color="bg-blue-50"
      />
      <MetricCard
        title="活跃工作流"
        value={metrics.activeWorkflows}
        subtitle="当前运行中"
        icon={<Clock className="h-4 w-4 text-purple-600" />}
        color="bg-purple-50"
      />
      <MetricCard
        title="平均审批时长"
        value={formatApprovalTime(metrics.avgApprovalTime)}
        subtitle="从创建到审批"
        icon={<Clock className="h-4 w-4 text-orange-600" />}
        color="bg-orange-50"
      />
      <MetricCard
        title="高风险操作"
        value={metrics.highRiskOps}
        subtitle="本月AI失败+驳回"
        trend={metrics.highRiskOps > 0 ? "down" : "neutral"}
        trendValue={metrics.highRiskOps > 0 ? "需审查" : "状态正常"}
        icon={<AlertTriangle className="h-4 w-4 text-red-600" />}
        color="bg-red-50"
      />
    </div>
  )
}
