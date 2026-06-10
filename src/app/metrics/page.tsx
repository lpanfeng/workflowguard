"use client"

// WorkflowGuard — 执行指标页
// 展示使用数据和执行统计

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { NavBar } from "@/components/NavBar"
import { Skeleton } from "@/components/Skeleton"
import {
  BarChart3,
  CheckCircle2,
  XCircle,
  Clock,
  TrendingUp,
  Activity,
  Workflow,
  Sparkles,
  AlertTriangle,
  FileText,
  MessageSquare,
  Database,
  ArrowLeft,
} from "lucide-react"
import Link from "next/link"

interface MetricsData {
  totalTasks: number
  successRate: number
  workflowCount: number
  statusBreakdown: Record<string, number>
  templateBreakdown: Record<string, { total: number; completed: number }>
  dailyTrend: Array<{ date: string; tasks: number; approvals: number }>
  approvals: { approved: number; rejected: number; waiting: number }
  aiCallCount: number
}

const TEMPLATE_LABELS: Record<string, string> = {
  customer_service: "客服工单",
  content_publish: "内容发布",
  data_entry: "数据录入",
}

const TEMPLATE_ICONS: Record<string, React.ReactNode> = {
  customer_service: <MessageSquare className="h-4 w-4" />,
  content_publish: <FileText className="h-4 w-4" />,
  data_entry: <Database className="h-4 w-4" />,
}

export default function MetricsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [metrics, setMetrics] = useState<MetricsData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/login")
    }
  }, [status, router])

  useEffect(() => {
    if (session?.user?.id) {
      loadMetrics()
    }
  }, [session])

  const loadMetrics = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/metrics?userId=${session!.user!.id}`)
      if (res.ok) {
        const data = await res.json()
        setMetrics(data)
      }
    } catch (err) {
      console.error("加载指标数据失败:", err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <NavBar />
        <main className="container mx-auto px-4 py-8">
          <Skeleton className="h-8 w-48 mb-6" />
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
          <Skeleton className="h-64 mb-6" />
          <Skeleton className="h-64" />
        </main>
      </div>
    )
  }

  if (!metrics) {
    return (
      <div className="min-h-screen bg-background">
        <NavBar />
        <main className="container mx-auto px-4 py-8">
          <p className="text-muted-foreground">无法加载指标数据</p>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <NavBar />
      <main className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Link href="/dashboard">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold">执行指标</h1>
              <p className="text-sm text-muted-foreground">查看你的工作流使用数据和执行统计</p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={loadMetrics}>
            刷新数据
          </Button>
        </div>

        {/* KPI 卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 text-muted-foreground mb-2">
                <Activity className="h-4 w-4" />
                <span className="text-xs font-medium">总任务数</span>
              </div>
              <p className="text-3xl font-bold">{metrics.totalTasks}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 text-muted-foreground mb-2">
                <TrendingUp className="h-4 w-4" />
                <span className="text-xs font-medium">执行成功率</span>
              </div>
              <p className={`text-3xl font-bold ${metrics.successRate >= 80 ? "text-green-600" : metrics.successRate >= 50 ? "text-yellow-600" : "text-red-600"}`}>
                {metrics.successRate}%
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 text-muted-foreground mb-2">
                <Workflow className="h-4 w-4" />
                <span className="text-xs font-medium">活跃工作流</span>
              </div>
              <p className="text-3xl font-bold">{metrics.workflowCount}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 text-muted-foreground mb-2">
                <Sparkles className="h-4 w-4" />
                <span className="text-xs font-medium">AI 调用</span>
              </div>
              <p className="text-3xl font-bold">{metrics.aiCallCount}</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* 状态分布 */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-primary" />
                <div>
                  <CardTitle>任务状态分布</CardTitle>
                  <CardDescription>各状态下的任务数量</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  { key: "completed", label: "已完成", color: "bg-green-500", icon: <CheckCircle2 className="h-4 w-4 text-green-500" /> },
                  { key: "approved", label: "已批准", color: "bg-blue-500", icon: <CheckCircle2 className="h-4 w-4 text-blue-500" /> },
                  { key: "waiting_approval", label: "待审批", color: "bg-yellow-500", icon: <Clock className="h-4 w-4 text-yellow-500" /> },
                  { key: "rejected", label: "已驳回", color: "bg-red-500", icon: <XCircle className="h-4 w-4 text-red-500" /> },
                  { key: "failed", label: "失败", color: "bg-gray-500", icon: <AlertTriangle className="h-4 w-4 text-gray-500" /> },
                ].map(({ key, label, color, icon }) => {
                  const count = metrics.statusBreakdown[key] ?? 0
                  const pct = metrics.totalTasks > 0 ? (count / metrics.totalTasks * 100).toFixed(1) : "0"
                  return (
                    <div key={key} className="flex items-center gap-3">
                      {icon}
                      <span className="text-sm w-20">{label}</span>
                      <div className="flex-1 bg-muted rounded-full h-2.5">
                        <div
                          className={`${color} h-2.5 rounded-full transition-all duration-500`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="text-sm font-medium w-12 text-right">{count}</span>
                      <span className="text-xs text-muted-foreground w-12 text-right">{pct}%</span>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>

          {/* 审批统计 */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-primary" />
                <div>
                  <CardTitle>审批统计</CardTitle>
                  <CardDescription>审批通过率与待处理情况</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <p className="text-2xl font-bold text-green-600">{metrics.approvals.approved}</p>
                  <p className="text-xs text-green-700">已通过</p>
                </div>
                <div className="text-center p-4 bg-red-50 rounded-lg">
                  <p className="text-2xl font-bold text-red-600">{metrics.approvals.rejected}</p>
                  <p className="text-xs text-red-700">已驳回</p>
                </div>
                <div className="text-center p-4 bg-yellow-50 rounded-lg">
                  <p className="text-2xl font-bold text-yellow-600">{metrics.approvals.waiting}</p>
                  <p className="text-xs text-yellow-700">待处理</p>
                </div>
              </div>
              <div className="text-center">
                <p className="text-sm text-muted-foreground">审批通过率</p>
                <p className="text-lg font-bold">
                  {metrics.approvals.approved + metrics.approvals.rejected > 0
                    ? Math.round((metrics.approvals.approved / (metrics.approvals.approved + metrics.approvals.rejected)) * 100)
                    : 0}%
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 模板统计 */}
        <Card className="mb-8">
          <CardHeader>
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              <div>
                <CardTitle>按模板统计</CardTitle>
                <CardDescription>不同工作流模板的使用分布</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {Object.entries(metrics.templateBreakdown).map(([type, stats]) => (
                <Card key={type} className="bg-muted/30">
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-2 mb-3">
                      {TEMPLATE_ICONS[type] || <FileText className="h-4 w-4" />}
                      <span className="font-medium">{TEMPLATE_LABELS[type] || type}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <p className="text-muted-foreground">总数</p>
                        <p className="text-xl font-bold">{stats.total}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">完成</p>
                        <p className="text-xl font-bold">{stats.completed}</p>
                      </div>
                    </div>
                    <div className="mt-3 bg-muted rounded-full h-2">
                      <div
                        className="bg-primary h-2 rounded-full"
                        style={{
                          width: `${stats.total > 0 ? (stats.completed / stats.total) * 100 : 0}%`,
                        }}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      完成率 {stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0}%
                    </p>
                  </CardContent>
                </Card>
              ))}
              {Object.keys(metrics.templateBreakdown).length === 0 && (
                <div className="col-span-3 text-center py-8 text-muted-foreground">
                  暂无模板数据，创建任务后这里将显示统计
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* 周趋势 */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              <div>
                <CardTitle>7日趋势</CardTitle>
                <CardDescription>过去7天的任务和审批活动</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {metrics.dailyTrend.map((day) => {
                const maxVal = Math.max(...metrics.dailyTrend.map(d => Math.max(d.tasks, d.approvals)), 1)
                const tasksPct = (day.tasks / maxVal) * 100
                const approvalsPct = (day.approvals / maxVal) * 100
                const dateLabel = new Date(day.date + "T00:00:00").toLocaleDateString("zh-CN", {
                  month: "short",
                  day: "numeric",
                })
                return (
                  <div key={day.date} className="flex items-center gap-4">
                    <span className="text-xs text-muted-foreground w-12">{dateLabel}</span>
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-blue-600 w-8">任务</span>
                        <div className="flex-1 bg-muted rounded-full h-3">
                          <div
                            className="bg-blue-500 h-3 rounded-full transition-all"
                            style={{ width: `${tasksPct}%` }}
                          />
                        </div>
                        <span className="text-xs font-medium w-6 text-right">{day.tasks}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-green-600 w-8">审批</span>
                        <div className="flex-1 bg-muted rounded-full h-3">
                          <div
                            className="bg-green-500 h-3 rounded-full transition-all"
                            style={{ width: `${approvalsPct}%` }}
                          />
                        </div>
                        <span className="text-xs font-medium w-6 text-right">{day.approvals}</span>
                      </div>
                    </div>
                  </div>
                )
              })}
              {metrics.dailyTrend.every(d => d.tasks === 0 && d.approvals === 0) && (
                <p className="text-center text-muted-foreground py-4">过去7天暂无活动</p>
              )}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
