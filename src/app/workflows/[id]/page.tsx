"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter, useParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { NavBar } from "@/components/NavBar"
import { supabase } from "@/lib/supabase"
import { WORKFLOW_TEMPLATES } from "@/lib/workflow-templates"
import { toast } from "sonner"
import Link from "next/link"
import {
  Loader2,
  ArrowLeft,
  Play,
  Pause,
  Trash2,
  CheckCircle2,
  Clock,
  XCircle,
  AlertTriangle,
  Activity,
  ChevronRight,
  FileText,
  RefreshCw,
  ExternalLink,
  UserCheck,
  TrendingUp,
  Flame,
  BarChart3,
} from "lucide-react"

// Step type icon/label mapping
const STEP_TYPE_CONFIG: Record<string, { label: string; color: string }> = {
  ai_execute: { label: "AI 执行", color: "bg-purple-100 text-purple-700" },
  human_approve: { label: "人工审批", color: "bg-amber-100 text-amber-700" },
  notify: { label: "通知", color: "bg-blue-100 text-blue-700" },
  action: { label: "操作", color: "bg-slate-100 text-slate-700" },
}

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  idle: { label: "待开始", color: "text-gray-400" },
  triggered: { label: "已触发", color: "text-blue-600" },
  running: { label: "运行中", color: "text-blue-600" },
  step_in_progress: { label: "步骤执行中", color: "text-blue-600" },
  step_completed: { label: "步骤完成", color: "text-green-600" },
  waiting_approval: { label: "待审批", color: "text-amber-600" },
  approved: { label: "已审批", color: "text-green-600" },
  completed: { label: "已完成", color: "text-green-600" },
  failed: { label: "失败", color: "text-red-600" },
  cancelled: { label: "已取消", color: "text-gray-500" },
}

type WorkflowRecord = {
  id: string
  user_id: string
  template_id: string
  name: string
  description: string | null
  config: Record<string, unknown>
  is_active: boolean
  created_at: string
  updated_at: string
}

type ExecutionRecord = {
  id: string
  workflow_id: string
  user_id: string
  status: string
  current_step_index: number
  steps: Array<{
    stepId: string
    stepName: string
    stepType: string
    status: string
    startedAt: string | null
    completedAt: string | null
    result?: unknown
    error?: string
  }>
  input_data: Record<string, unknown>
  output_data: Record<string, unknown>
  started_at: string
  completed_at: string | null
  error?: string
}

export default function WorkflowDetailPage() {
  const { data: session, status: authStatus } = useSession()
  const router = useRouter()
  const params = useParams()
  const workflowId = params.id as string

  const [workflow, setWorkflow] = useState<WorkflowRecord | null>(null)
  const [executions, setExecutions] = useState<ExecutionRecord[]>([])
  const [relatedTasks, setRelatedTasks] = useState<unknown[]>([])
  const [loading, setLoading] = useState(true)
  const [executing, setExecuting] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [execHistoryStats, setExecHistoryStats] = useState<{
    total: number; completed: number; failed: number; successRate: number; avgDurationSeconds: number | null
  } | null>(null)
  const [historyLoading, setHistoryLoading] = useState(false)

  useEffect(() => {
    if (authStatus === "unauthenticated") {
      router.push("/auth/login")
    }
  }, [authStatus, router])

  useEffect(() => {
    if (session?.user?.id && workflowId) {
      loadWorkflow()
    }
  }, [session, workflowId])

  const loadWorkflow = async () => {
    if (!session?.user?.id) return
    setLoading(true)

    try {
      // Load workflow
      const { data: wf, error: wfError } = await supabase
        .from("workflows")
        .select("*")
        .eq("id", workflowId)
        .eq("user_id", session.user.id)
        .single()

      if (wfError || !wf) {
        toast.error("工作流不存在或无权访问")
        router.push("/workflows/list")
        return
      }

      setWorkflow(wf)

      // Load executions
      fetchExecutions()
      fetchExecutionHistory()

      // Load related tasks
      const { data: tasks } = await supabase
        .from("tasks")
        .select("id, title, status, type, created_at")
        .eq("workflow_id", workflowId)
        .eq("user_id", session.user.id)
        .order("created_at", { ascending: false })
        .limit(20)

      setRelatedTasks(tasks ?? [])
    } catch (err) {
      console.error("加载工作流失败:", err)
      toast.error("加载工作流失败")
    } finally {
      setLoading(false)
    }
  }

  const fetchExecutions = async () => {
    try {
      const res = await fetch(`/api/workflows/execute?workflowId=${workflowId}&limit=10`)
      const data = await res.json()
      if (data.executions) {
        setExecutions(data.executions)
      }
    } catch {
      // Executions API may not have data yet, that's OK
    }
  }

  const fetchExecutionHistory = async () => {
    setHistoryLoading(true)
    try {
      const res = await fetch(`/api/workflows/${workflowId}/execute-history?limit=50`)
      const data = await res.json()
      if (data.stats) {
        setExecHistoryStats(data.stats)
      }
      if (data.executions) {
        setExecutions(data.executions)
      }
    } catch (err) {
      console.error("加载执行历史失败:", err)
    } finally {
      setHistoryLoading(false)
    }
  }

  const handleTrigger = async () => {
    if (!workflow || !session?.user?.id) return
    setExecuting(true)
    try {
      const res = await fetch("/api/workflows/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workflowId: workflow.id,
          userId: session.user.id,
          triggerType: "manual",
          inputData: {},
        }),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error ?? "触发失败")
      }

      toast.success("工作流已触发")
      fetchExecutions()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "触发失败")
    } finally {
      setExecuting(false)
    }
  }

  const handleDelete = async () => {
    if (!workflow || !session?.user?.id) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/workflows/${workflow.id}/delete`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: session.user.id }),
      })
      if (!res.ok) throw new Error("删除失败")

      toast.success("工作流已删除")
      router.push("/workflows/list")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "删除失败")
    } finally {
      setDeleting(false)
    }
  }

  const handleDeleteWithConfirm = async () => {
    if (!workflow) return
    if (!confirm("⚠️ 二次确认：此操作不可撤销，所有执行记录和关联任务将被删除。是否继续？")) return
    await handleDelete()
  }

  const toggleActive = async () => {
    if (!workflow || !session?.user?.id) return
    try {
      const action = workflow.is_active ? 'pause' : 'resume'
      const res = await fetch(`/api/workflows/${workflow.id}/${action}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: session.user.id }),
      })
      if (!res.ok) throw new Error("操作失败")
      setWorkflow({ ...workflow, is_active: !workflow.is_active })
      toast.success(workflow.is_active ? "已停用" : "已激活")
    } catch {
      toast.error("操作失败")
    }
  }

  const template = workflow ? WORKFLOW_TEMPLATES.find((t) => t.id === workflow.template_id) : null

  const formatTime = (iso: string | null) => {
    if (!iso) return "-"
    return new Date(iso).toLocaleString("zh-CN", {
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  if (authStatus === "loading" || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!session?.user || !workflow) return null

  const getExecutionStatusIcon = (status: string) => {
    switch (status) {
      case "completed": return <CheckCircle2 className="h-5 w-5 text-green-500" />
      case "failed": return <XCircle className="h-5 w-5 text-red-500" />
      case "running":
      case "step_in_progress": return <Activity className="h-5 w-5 text-blue-500 animate-pulse" />
      case "waiting_approval": return <Clock className="h-5 w-5 text-amber-500" />
      case "cancelled": return <XCircle className="h-5 w-5 text-gray-400" />
      default: return <Clock className="h-5 w-5 text-gray-400" />
    }
  }

  return (
    <div className="min-h-screen bg-muted/30">
      <NavBar />

      <main className="container mx-auto px-4 py-8">
        {/* 返回 + 操作栏 */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Link href="/workflows/list">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-1" />
                返回
              </Button>
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold">{workflow.name}</h1>
                <Badge variant={workflow.is_active ? "default" : "secondary"}>
                  {workflow.is_active ? "激活" : "停用"}
                </Badge>
              </div>
              {workflow.description && (
                <p className="text-sm text-muted-foreground mt-1">{workflow.description}</p>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={toggleActive}
            >
              {workflow.is_active ? <Pause className="h-4 w-4 mr-1" /> : <Play className="h-4 w-4 mr-1" />}
              {workflow.is_active ? "停用" : "激活"}
            </Button>
            <Button
              size="sm"
              onClick={handleTrigger}
              disabled={executing || !workflow.is_active}
            >
              {executing ? (
                <Loader2 className="h-4 w-4 animate-spin mr-1" />
              ) : (
                <Play className="h-4 w-4 mr-1" />
              )}
              触发执行
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleDeleteWithConfirm}
              disabled={deleting}
            >
              {deleting ? (
                <Loader2 className="h-4 w-4 animate-spin mr-1" />
              ) : (
                <Trash2 className="h-4 w-4 mr-1" />
              )}
              删除
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 左侧：工作流步骤 + 信息 */}
          <div className="lg:col-span-2 space-y-6">
            {/* 工作流模板信息 */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  工作流模板
                </CardTitle>
              </CardHeader>
              <CardContent>
                {template ? (
                  <div>
                    <p className="font-medium">{template.name}</p>
                    <p className="text-sm text-muted-foreground mt-1">{template.description}</p>
                    <p className="text-xs text-muted-foreground mt-2">分类: {template.category}</p>

                    {/* 步骤流程 */}
                    <div className="mt-4 relative">
                      {template.steps.map((step, idx) => {
                        const stepConfig = STEP_TYPE_CONFIG[step.type] ?? { label: step.type, color: "bg-gray-100 text-gray-700" }
                        return (
                          <div key={step.id} className="flex items-start gap-4 pb-6 relative last:pb-0">
                            {/* 连线 */}
                            {idx < template.steps.length - 1 && (
                              <div className="absolute left-[15px] top-8 bottom-0 w-0.5 bg-border" />
                            )}
                            {/* 序号圆点 */}
                            <div className="relative z-10 w-8 h-8 rounded-full bg-primary/10 border-2 border-primary flex items-center justify-center shrink-0">
                              <span className="text-xs font-bold text-primary">{idx + 1}</span>
                            </div>
                            <div className="flex-1 min-w-0 pt-1">
                              <div className="flex items-center gap-2">
                                <p className="font-medium text-sm">{step.name}</p>
                                <Badge variant="outline" className={`text-xs ${stepConfig.color}`}>
                                  {stepConfig.label}
                                </Badge>
                              </div>
                              <p className="text-xs text-muted-foreground mt-1">{step.description}</p>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">未找到模板信息</p>
                )}
              </CardContent>
            </Card>

            {/* 执行历史 */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Activity className="h-5 w-5" />
                      执行历史
                    </CardTitle>
                    {execHistoryStats && (
                      <Badge variant={execHistoryStats.successRate >= 80 ? "default" : execHistoryStats.successRate >= 50 ? "secondary" : "destructive"}>
                        <TrendingUp className="h-3 w-3 mr-1" />
                        成功率 {execHistoryStats.successRate}%
                      </Badge>
                    )}
                  </div>
                  <Button variant="ghost" size="sm" onClick={fetchExecutionHistory} disabled={historyLoading}>
                    {historyLoading ? (
                      <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                    ) : (
                      <RefreshCw className="h-3 w-3 mr-1" />
                    )}
                    刷新
                  </Button>
                </div>
                <CardDescription>最近执行记录与成功率统计</CardDescription>
              </CardHeader>
              <CardContent>
                {execHistoryStats && execHistoryStats.total > 0 && (
                  <div className="grid grid-cols-3 gap-3 mb-4 p-3 rounded-lg bg-muted/50">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-green-600">{execHistoryStats.completed}</p>
                      <p className="text-xs text-muted-foreground">已完成</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-red-600">{execHistoryStats.failed}</p>
                      <p className="text-xs text-muted-foreground">失败</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-blue-600">
                        {execHistoryStats.avgDurationSeconds != null ? `${execHistoryStats.avgDurationSeconds}s` : '-'}
                      </p>
                      <p className="text-xs text-muted-foreground">平均耗时</p>
                    </div>
                  </div>
                )}
                {executions.length === 0 ? (
                  <div className="text-center py-8">
                    <Play className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                    <p className="text-sm text-muted-foreground">暂无执行记录</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      点击「触发执行」开始第一个工作流运行
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {executions.map((exec) => {
                      const statusCfg = STATUS_CONFIG[exec.status] ?? { label: exec.status, color: "text-gray-500" }
                      const completedSteps = exec.steps.filter((s) => s.status === "completed" || s.status === "approved").length

                      return (
                        <div key={exec.id} className="flex items-start gap-3 p-3 rounded-lg border hover:bg-accent/50 transition-colors">
                          {getExecutionStatusIcon(exec.status)}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className={`font-medium text-sm ${statusCfg.color}`}>
                                {statusCfg.label}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {completedSteps}/{exec.steps.length} 步骤
                              </span>
                            </div>
                            <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {formatTime(exec.started_at)}
                              </span>
                              {exec.completed_at && (
                                <span>耗时 {(new Date(exec.completed_at).getTime() - new Date(exec.started_at).getTime()) / 1000}s</span>
                              )}
                            </div>
                            {exec.error && (
                              <p className="text-xs text-red-500 mt-1 truncate">{exec.error}</p>
                            )}

                            {/* 步骤进度条 */}
                            <div className="flex gap-1 mt-2">
                              {exec.steps.map((step, idx) => {
                                const stepColors: Record<string, string> = {
                                  completed: "bg-green-400",
                                  approved: "bg-green-400",
                                  running: "bg-blue-400 animate-pulse",
                                  step_in_progress: "bg-blue-400 animate-pulse",
                                  waiting_approval: "bg-amber-400",
                                  failed: "bg-red-400",
                                  cancelled: "bg-gray-300",
                                }
                                return (
                                  <div
                                    key={step.stepId}
                                    className={`h-1.5 flex-1 rounded-full ${stepColors[step.status] ?? "bg-gray-200"}`}
                                    title={`${step.stepName}: ${STATUS_CONFIG[step.status]?.label ?? step.status}`}
                                  />
                                )
                              })}
                            </div>
                          </div>
                          <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                        </div>
                      )
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* 关联任务列表 */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  关联任务
                </CardTitle>
                <CardDescription>此工作流产生的任务记录</CardDescription>
              </CardHeader>
              <CardContent>
                {relatedTasks.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">暂无关联任务</p>
                ) : (
                  <div className="space-y-2">
                    {(relatedTasks as Array<{ id: string; title: string; status: string; type: string; created_at: string }>).map((task) => (
                      <Link key={task.id} href={`/tasks?id=${task.id}`}>
                        <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-accent/50 transition-colors">
                          <Badge variant="outline" className="text-xs font-mono shrink-0">
                            #{task.id.slice(0, 8)}
                          </Badge>
                          <span className="text-sm flex-1 min-w-0 truncate">{task.title}</span>
                          <Badge variant={task.status === "completed" ? "default" : "secondary"} className="text-xs shrink-0">
                            {task.status}
                          </Badge>
                          <ExternalLink className="h-3 w-3 text-muted-foreground shrink-0" />
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* 右侧：工作信息 */}
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">基本信息</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">创建时间</span>
                  <span>{formatTime(workflow.created_at)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">更新时间</span>
                  <span>{formatTime(workflow.updated_at)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">模板</span>
                  <span>{template?.name ?? workflow.template_id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">状态</span>
                  <Badge variant={workflow.is_active ? "default" : "secondary"}>
                    {workflow.is_active ? "激活" : "停用"}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">执行次数</span>
                  <span>{execHistoryStats?.total ?? executions.length}</span>
                </div>
                {execHistoryStats && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">成功率</span>
                    <Badge variant={execHistoryStats.successRate >= 80 ? "default" : "secondary"} className="text-xs">
                      {execHistoryStats.successRate}%
                    </Badge>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">关联任务</span>
                  <span>{(relatedTasks as unknown[]).length}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">操作入口</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button
                  className="w-full"
                  size="sm"
                  onClick={handleTrigger}
                  disabled={executing || !workflow.is_active}
                >
                  {executing ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Play className="h-4 w-4 mr-2" />
                  )}
                  触发执行
                </Button>
                <Link href={`/tasks?workflowId=${workflow.id}`}>
                  <Button variant="outline" className="w-full" size="sm">
                    <FileText className="h-4 w-4 mr-2" />
                    查看所有任务
                  </Button>
                </Link>
                <Link href="/workflows/list">
                  <Button variant="ghost" className="w-full" size="sm">
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    返回列表
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  )
}
