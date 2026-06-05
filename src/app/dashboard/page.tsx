"use client"

import { useState, useEffect, useCallback } from "react"
import { useSession, signOut } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { AlertTriangle, CheckCircle2, Workflow, Loader2, FileText, Activity, Plus, Sparkles } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { NavBar } from "@/components/NavBar"
import { TaskCreateDialog } from "@/components/TaskCreateDialog"
import { ensureDemoWorkflow } from "@/lib/demo-setup"
import DashboardTrendChart from "@/components/features/DashboardTrendChart"
import ExecutionTimeline from "@/components/features/ExecutionTimeline"

type DashboardStats = {
  pendingApproval: number
  completedToday: number
  activeWorkflows: number
  workflowQuota: number
  totalTasks: number
  approvalUsed: number
  approvalQuota: number
}

type RecentActivity = {
  id: string
  type: string
  status: string
  title: string
  created_at: string
}

export default function DashboardPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [stats, setStats] = useState<DashboardStats>({
    pendingApproval: 0,
    completedToday: 0,
    activeWorkflows: 0,
    workflowQuota: 2,
    totalTasks: 0,
    approvalUsed: 0,
    approvalQuota: 100,
  })
  const [loading, setLoading] = useState(true)
  const [recentTasks, setRecentTasks] = useState<RecentActivity[]>([])

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/login")
    }
  }, [status, router])

  useEffect(() => {
    if (session?.user?.id) {
      // 后台静默创建 Demo 工作流（新用户首次登录）
      ensureDemoWorkflow(session.user.id)
      loadStats()
      loadRecentTasks()
    }
  }, [session])

  const loadStats = async () => {
    if (!session?.user?.id) return
    setLoading(true)

    try {
      const today = new Date().toISOString().slice(0, 10)
      
      const [
        { count: pendingCount },
        { count: todayCount },
        { count: activeCount },
        { count: totalCount },
        profileResult,
      ] = await Promise.all([
        supabase
          .from("tasks")
          .select("*", { count: "exact", head: true })
          .eq("user_id", session.user.id)
          .eq("status", "waiting_approval"),
        supabase
          .from("tasks")
          .select("*", { count: "exact", head: true })
          .eq("user_id", session.user.id)
          .in("status", ["approved", "completed"])
          .gte("updated_at", today),
        supabase
          .from("workflows")
          .select("*", { count: "exact", head: true })
          .eq("user_id", session.user.id)
          .eq("is_active", true),
        supabase
          .from("tasks")
          .select("*", { count: "exact", head: true })
          .eq("user_id", session.user.id)
          .neq("status", "pending"),
        supabase
          .from("profiles")
          .select("workflow_quota, approval_quota, approval_used")
          .eq("id", session.user.id)
          .single(),
      ])

      setStats({
        pendingApproval: pendingCount ?? 0,
        completedToday: todayCount ?? 0,
        activeWorkflows: activeCount ?? 0,
        workflowQuota: profileResult?.data?.workflow_quota ?? 2,
        totalTasks: totalCount ?? 0,
        approvalUsed: profileResult?.data?.approval_used ?? 0,
        approvalQuota: profileResult?.data?.approval_quota ?? 100,
      })
    } catch (err) {
      console.error("加载统计数据失败:", err)
    } finally {
      setLoading(false)
    }
  }

  const loadRecentTasks = async () => {
    if (!session?.user?.id) return
    try {
      const { data } = await supabase
        .from("tasks")
        .select("id, type, status, title, created_at")
        .eq("user_id", session.user.id)
        .order("created_at", { ascending: false })
        .limit(5)

      setRecentTasks(data ?? [])
    } catch (err) {
      console.error("加载最近任务失败:", err)
    }
  }

  const handleTaskCreated = useCallback(() => {
    loadStats()
    loadRecentTasks()
  }, [])

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">加载中...</p>
      </div>
    )
  }

  if (!session?.user) return null

  const STATUS_BADGES: Record<string, { label: string; color: string }> = {
    pending: { label: "待处理", color: "bg-slate-100 text-slate-700" },
    ai_processing: { label: "AI 处理中", color: "bg-purple-100 text-purple-700" },
    waiting_approval: { label: "待审批", color: "bg-amber-100 text-amber-700" },
    approved: { label: "已通过", color: "bg-green-100 text-green-700" },
    rejected: { label: "已驳回", color: "bg-red-100 text-red-700" },
    completed: { label: "已完成", color: "bg-blue-100 text-blue-700" },
    failed: { label: "失败", color: "bg-red-100 text-red-700" },
  }

  const TYPE_ICONS: Record<string, string> = {
    customer_service: "🎧",
    content_publish: "📝",
    data_entry: "📊",
  }

  const TYPE_LABELS: Record<string, string> = {
    customer_service: "客服工单",
    content_publish: "内容发布",
    data_entry: "数据录入",
  }

  return (
    <div className="min-h-screen bg-muted/30">
      <NavBar />

      <main className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-1">仪表盘</h1>
            <p className="text-muted-foreground">
              欢迎回来，{session.user.name ?? "用户"}
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={loadStats} disabled={loading}>
            {loading ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
            刷新数据
          </Button>
        </div>

        {/* 统计概览 */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Link href="/tasks?filter=waiting_approval">
            <Card className="cursor-pointer hover:border-amber-400/50 transition-colors h-full">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-amber-600 flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  待审批任务
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                ) : (
                  <>
                    <p className="text-3xl font-bold text-amber-600">{stats.pendingApproval}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      占总任务 {stats.totalTasks > 0 ? Math.round(stats.pendingApproval / stats.totalTasks * 100) : 0}%
                    </p>
                  </>
                )}
              </CardContent>
            </Card>
          </Link>

          <Link href="/tasks?filter=completed">
            <Card className="cursor-pointer hover:border-green-400/50 transition-colors h-full">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-green-600 flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3" />
                  今日已完成
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                ) : (
                  <>
                    <p className="text-3xl font-bold text-green-600">{stats.completedToday}</p>
                    <p className="text-xs text-muted-foreground mt-1">今日通过 + 完成</p>
                  </>
                )}
              </CardContent>
            </Card>
          </Link>

          <Link href="/workflows/new">
            <Card className="cursor-pointer hover:border-blue-400/50 transition-colors h-full">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-blue-600 flex items-center gap-1">
                  <Workflow className="h-3 w-3" />
                  活跃工作流
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                ) : (
                  <>
                    <p className="text-3xl font-bold text-blue-600">{stats.activeWorkflows}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      配额：{stats.workflowQuota} 个
                    </p>
                  </>
                )}
              </CardContent>
            </Card>
          </Link>

          <Link href="/audit-logs">
            <Card className="cursor-pointer hover:border-purple-400/50 transition-colors h-full">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-purple-600 flex items-center gap-1">
                  <Activity className="h-3 w-3" />
                  总任务量
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                ) : (
                  <>
                    <p className="text-3xl font-bold text-purple-600">{stats.totalTasks}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      审批用量：{stats.approvalUsed}/{stats.approvalQuota}
                    </p>
                  </>
                )}
              </CardContent>
            </Card>
          </Link>
        </div>

        {/* 近 7 日趋势图 */}
        <DashboardTrendChart userId={session.user.id} />

        {/* 最近活动 + 快速开始 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 执行时间线 */}
          <ExecutionTimeline userId={session.user.id} refreshKey={Date.now()} />

          {/* 快速开始 */}
          <Card>
            <CardHeader>
              <CardTitle>快速开始</CardTitle>
              <CardDescription>
                选择一个工作流模板开始使用
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-3">
                <Link href="/workflows/new?template=customer-service">
                  <div className="border rounded-lg p-3 hover:bg-muted/50 cursor-pointer transition-colors flex items-center gap-3">
                    <span className="text-2xl">🎧</span>
                    <div>
                      <h3 className="font-semibold text-sm">客服工单审批流</h3>
                      <p className="text-xs text-muted-foreground">AI 生成回复，人工审核后发送</p>
                    </div>
                  </div>
                </Link>
                <Link href="/workflows/new?template=content-publish">
                  <div className="border rounded-lg p-3 hover:bg-muted/50 cursor-pointer transition-colors flex items-center gap-3">
                    <span className="text-2xl">📝</span>
                    <div>
                      <h3 className="font-semibold text-sm">内容发布审批流</h3>
                      <p className="text-xs text-muted-foreground">AI 生成内容，编辑审批后发布</p>
                    </div>
                  </div>
                </Link>
                <Link href="/workflows/new?template=data-entry">
                  <div className="border rounded-lg p-3 hover:bg-muted/50 cursor-pointer transition-colors flex items-center gap-3">
                    <span className="text-2xl">📊</span>
                    <div>
                      <h3 className="font-semibold text-sm">数据录入审批流</h3>
                      <p className="text-xs text-muted-foreground">AI 提取数据，人工确认后写入</p>
                    </div>
                  </div>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>

      {/* Floating Action Button + Task Create Dialog */}
      <TaskCreateDialog userId={session.user.id} onTaskCreated={handleTaskCreated} />
    </div>
  )
}
