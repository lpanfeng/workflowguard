"use client"

import { useState, useEffect } from "react"
import { useSession, signOut } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { AlertTriangle, CheckCircle2, Workflow, Loader2, FileText, Activity } from "lucide-react"
import { supabase } from "@/lib/supabase"

type DashboardStats = {
  pendingApproval: number
  completedToday: number
  activeWorkflows: number
  workflowQuota: number
  totalTasks: number
  approvalUsed: number
  approvalQuota: number
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

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/login")
    }
  }, [status, router])

  useEffect(() => {
    if (session?.user?.id) {
      loadStats()
    }
  }, [session])

  const loadStats = async () => {
    if (!session?.user?.id) return
    setLoading(true)

    try {
      // 并行获取所有统计数据
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
          .gte("updated_at", new Date().toISOString().slice(0, 10)),
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

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">加载中...</p>
      </div>
    )
  }

  if (!session?.user) return null

  return (
    <div className="min-h-screen bg-muted/30">
      {/* 顶部导航 */}
      <header className="border-b bg-background">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/" className="text-xl font-bold">
            WorkflowGuard
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/workflows/new">
              <Button variant="ghost" size="sm">创建工作流</Button>
            </Link>
            <Link href="/tasks">
              <Button variant="ghost" size="sm">任务列表</Button>
            </Link>
            <Link href="/audit-logs">
              <Button variant="ghost" size="sm">审计日志</Button>
            </Link>
            <Link href="/pricing">
              <Button variant="ghost" size="sm">定价</Button>
            </Link>
            <Link href="/settings">
              <Button variant="ghost" size="sm">设置</Button>
            </Link>
            <span className="text-sm text-muted-foreground">
              {session.user.email}
            </span>
            <Avatar className="h-8 w-8">
              <AvatarImage src={session.user.image ?? undefined} />
              <AvatarFallback>
                {session.user.name?.charAt(0) ?? "U"}
              </AvatarFallback>
            </Avatar>
            <Button variant="outline" size="sm" onClick={() => signOut()}>
              退出
            </Button>
          </div>
        </div>
      </header>

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

        {/* 最近活动 + 快速开始 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 最近活动 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-4 w-4" />
                最近活动
              </CardTitle>
              <CardDescription>近期的任务和操作记录</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <p className="text-sm text-muted-foreground py-4">加载中...</p>
              ) : stats.totalTasks === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground mb-4">还没有活动记录</p>
                  <Link href="/workflows/new">
                    <Button variant="outline" size="sm">创建第一个工作流</Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-3">
                  <Link href="/tasks">
                    <p className="text-sm text-blue-600 hover:underline">
                      已处理 {stats.completedToday} 个任务（今日）
                    </p>
                  </Link>
                  <Link href="/tasks?filter=waiting_approval">
                    <p className={`text-sm ${stats.pendingApproval > 0 ? "text-amber-600 font-medium" : "text-muted-foreground"} hover:underline`}>
                      {stats.pendingApproval > 0
                        ? `${stats.pendingApproval} 个任务待审批`
                        : "暂无待审批任务"}
                    </p>
                  </Link>
                  <Link href="/audit-logs">
                    <p className="text-sm text-muted-foreground hover:underline">
                      查看完整审计日志 →
                    </p>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>

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
    </div>
  )
}
