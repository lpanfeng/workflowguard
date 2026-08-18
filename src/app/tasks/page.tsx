"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { supabase, supabaseAdmin } from "@/lib/supabase"
import { toast } from "sonner"
import { MobileNav } from "@/components/MobileNav"
import {
  CheckCircle2,
  Clock,
  XCircle,
  AlertTriangle,
  Loader2,
  Search,
  Activity,
  Cpu,
  ChevronRight,
  Eye,
  History,
} from "lucide-react"
import Link from "next/link"
import ExecutionTimeline from "@/components/features/ExecutionTimeline"

type TaskRecord = {
  id: string
  workflow_id: string
  user_id: string
  type: string
  status: string
  title: string
  input_data: Record<string, unknown>
  agent_result: { content: string } | null
  agent_confidence: string | null
  agent_model?: string | null
  approved_result: Record<string, unknown> | null
  approval_comment: string | null
  approved_at: string | null
  started_at: string | null
  completed_at: string | null
  error_message: string | null
  created_at: string
  updated_at: string
}

const STATUS_CONFIG: Record<
  string,
  { label: string; color: string; icon: React.ReactNode; bg: string; border: string }
> = {
  pending: {
    label: "待处理",
    color: "text-slate-700",
    icon: <Clock className="h-3 w-3" />,
    bg: "bg-slate-100",
    border: "border-slate-200",
  },
  ai_processing: {
    label: "AI 处理中",
    color: "text-purple-700",
    icon: <Loader2 className="h-3 w-3 animate-spin" />,
    bg: "bg-purple-100",
    border: "border-purple-200",
  },
  waiting_approval: {
    label: "待审批",
    color: "text-amber-700",
    icon: <AlertTriangle className="h-3 w-3" />,
    bg: "bg-amber-100",
    border: "border-amber-200",
  },
  approved: {
    label: "已通过",
    color: "text-green-700",
    icon: <CheckCircle2 className="h-3 w-3" />,
    bg: "bg-green-100",
    border: "border-green-200",
  },
  rejected: {
    label: "已驳回",
    color: "text-red-700",
    icon: <XCircle className="h-3 w-3" />,
    bg: "bg-red-100",
    border: "border-red-200",
  },
  completed: {
    label: "已完成",
    color: "text-blue-700",
    icon: <CheckCircle2 className="h-3 w-3" />,
    bg: "bg-blue-100",
    border: "border-blue-200",
  },
  failed: {
    label: "失败",
    color: "text-red-700",
    icon: <XCircle className="h-3 w-3" />,
    bg: "bg-red-100",
    border: "border-red-200",
  },
}

const TYPE_LABELS: Record<string, string> = {
  customer_service: "客服工单",
  content_publish: "内容发布",
  data_entry: "数据录入",
}

// 任务执行时间线步骤
const STEP_CONFIG = [
  { key: "created", label: "创建", icon: <Clock className="h-3 w-3" /> },
  { key: "ai_processing", label: "AI处理", icon: <Cpu className="h-3 w-3" /> },
  { key: "waiting_approval", label: "待审批", icon: <AlertTriangle className="h-3 w-3" /> },
  { key: "completed", label: "完成", icon: <CheckCircle2 className="h-3 w-3" /> },
]

function TaskTimeline({ task }: { task: TaskRecord }) {
  const status = task.status
  const steps = [
    { key: "created", label: "创建", done: true, time: task.created_at },
    {
      key: "ai_processing",
      label: "AI处理",
      done: ["ai_processing", "waiting_approval", "approved", "rejected", "completed", "failed"].includes(status),
      time: task.started_at,
      detail: task.agent_model ? `模型: ${task.agent_model}` : null,
    },
    {
      key: "waiting_approval",
      label: "审批",
      done: ["approved", "rejected", "completed"].includes(status),
      time: task.approved_at,
      detail: task.approval_comment ? `备注: ${task.approval_comment}` : null,
    },
    {
      key: "completed",
      label: "完成",
      done: ["approved", "completed"].includes(status),
      time: task.completed_at,
      detail: status === "failed" ? `错误: ${task.error_message ?? "未知"}` : null,
    },
  ]

  return (
    <div className="mt-3 pt-3 border-t border-border">
      <div className="flex items-center gap-1 mb-2">
        <History className="h-3 w-3 text-muted-foreground" />
        <span className="text-xs text-muted-foreground font-medium">执行时间线</span>
      </div>
      <div className="flex items-center gap-0">
        {steps.map((step, idx) => (
          <div key={step.key} className="flex items-center">
            <div className="flex flex-col items-center gap-1">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center border-2 transition-all ${
                  step.done
                    ? "bg-green-500 border-green-500 text-white"
                    : status === step.key ||
                      (step.key === "ai_processing" && status === "ai_processing")
                    ? "bg-purple-500 border-purple-500 text-white animate-pulse"
                    : "bg-muted border-muted-foreground/30 text-muted-foreground"
                }`}
              >
                {step.done ? (
                  <CheckCircle2 className="h-3.5 w-3.5" />
                ) : step.key === "ai_processing" && status === "ai_processing" ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <span className="text-[10px] font-bold">{idx + 1}</span>
                )}
              </div>
              <span
                className={`text-[10px] ${
                  step.done ? "text-green-600 font-medium" : "text-muted-foreground"
                }`}
              >
                {step.label}
              </span>
              {step.time && (
                <span className="text-[9px] text-muted-foreground/60">
                  {new Date(step.time).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })}
                </span>
              )}
            </div>
            {idx < steps.length - 1 && (
              <div
                className={`w-6 h-0.5 mb-3 ${
                  step.done ? "bg-green-500" : "bg-muted-foreground/20"
                }`}
              />
            )}
          </div>
        ))}
      </div>
      {task.agent_confidence && (
        <div className="flex items-center gap-1 mt-1.5">
          <Cpu className="h-3 w-3 text-purple-500" />
          <span className="text-[10px] text-muted-foreground">
            置信度: {task.agent_confidence}
            {task.agent_model ? ` · ${task.agent_model}` : ""}
          </span>
        </div>
      )}
    </div>
  )
}

export default function TasksPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [tasks, setTasks] = useState<TaskRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<string>("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [approvingTask, setApprovingTask] = useState<string | null>(null)
  const [comment, setComment] = useState("")
  const [showApproveDialog, setShowApproveDialog] = useState<TaskRecord | null>(null)
  const [viewMode, setViewMode] = useState<"list" | "timeline">("list")

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/login")
    }
  }, [status, router])

  useEffect(() => {
    if (session?.user?.id) {
      fetchTasks()
    }
  }, [session, filter])

  const fetchTasks = async () => {
    setLoading(true)
    try {
      let query = supabase
        .from("tasks")
        .select("*")
        .eq("user_id", session!.user!.id)
        .order("created_at", { ascending: false })

      if (filter !== "all") {
        query = query.eq("status", filter)
      }

      const { data, error } = await query

      if (error) throw error
      setTasks(data ?? [])
    } catch (err) {
      console.error("获取任务列表失败:", err)
      toast.error("加载任务列表失败")
    } finally {
      setLoading(false)
    }
  }

  const handleApprove = async (taskId: string, approved: boolean) => {
    setApprovingTask(taskId)
    try {
      const res = await fetch("/api/tasks/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          taskId,
          action: approved ? "approve" : "reject",
          userId: session!.user!.id,
          comment: comment || null,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        toast.error(data.error ?? "操作失败")
        return
      }

      toast.success(approved ? "已通过审批" : "已驳回")
      setShowApproveDialog(null)
      setComment("")
      fetchTasks()
    } catch (err) {
      console.error(err)
      toast.error("操作失败")
    } finally {
      setApprovingTask(null)
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

  const filteredTasks = tasks.filter((t) =>
    searchQuery
      ? t.title.toLowerCase().includes(searchQuery.toLowerCase())
      : true
  )

  const stats = {
    total: tasks.length,
    pending: tasks.filter((t) => t.status === "pending").length,
    waiting_approval: tasks.filter((t) => t.status === "waiting_approval").length,
    approved: tasks.filter((t) => t.status === "approved").length,
    rejected: tasks.filter((t) => t.status === "rejected").length,
  }

  return (
    <div className="min-h-screen bg-muted/30">
      {/* 顶部导航 */}
      <header className="border-b bg-background">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/" className="text-xl font-bold">
            WorkflowGuard
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/dashboard">
              <Button variant="ghost" size="sm">
                仪表盘
              </Button>
            </Link>
            <Avatar className="h-8 w-8">
              <AvatarFallback>{session.user.name?.charAt(0) ?? "U"}</AvatarFallback>
            </Avatar>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* 标题 */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">任务列表</h1>
            <p className="text-muted-foreground mt-1">
              查看和管理你的所有任务与审批
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              <Activity className="h-3 w-3 mr-1" />
              {tasks.filter((t) => t.status === "completed" || t.status === "approved").length} 已完成
            </Badge>
            <div className="flex border rounded-lg overflow-hidden">
              <Button
                variant={viewMode === "list" ? "default" : "ghost"}
                size="sm"
                className="rounded-none"
                onClick={() => setViewMode("list")}
              >
                <Eye className="h-3 w-3 mr-1" />列表
              </Button>
              <Button
                variant={viewMode === "timeline" ? "default" : "ghost"}
                size="sm"
                className="rounded-none"
                onClick={() => setViewMode("timeline")}
              >
                <History className="h-3 w-3 mr-1" />时间线
              </Button>
            </div>
          </div>
        </div>

        {/* 统计 */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-8">
          <Card className="cursor-pointer" onClick={() => setFilter("all")}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">全部</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{stats.total}</p>
            </CardContent>
          </Card>
          <Card
            className={`cursor-pointer ${
              filter === "waiting_approval" ? "ring-2 ring-amber-400" : ""
            }`}
            onClick={() => setFilter("waiting_approval")}
          >
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-amber-600 flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" />
                待审批
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-amber-600">
                {stats.waiting_approval}
              </p>
            </CardContent>
          </Card>
          <Card
            className={`cursor-pointer ${
              filter === "pending" ? "ring-2 ring-slate-400" : ""
            }`}
            onClick={() => setFilter("pending")}
          >
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">待处理</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{stats.pending}</p>
            </CardContent>
          </Card>
          <Card
            className={`cursor-pointer ${
              filter === "approved" ? "ring-2 ring-green-400" : ""
            }`}
            onClick={() => setFilter("approved")}
          >
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-green-600">已通过</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-green-600">{stats.approved}</p>
            </CardContent>
          </Card>
          <Card
            className={`cursor-pointer ${
              filter === "rejected" ? "ring-2 ring-red-400" : ""
            }`}
            onClick={() => setFilter("rejected")}
          >
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-red-600">已驳回</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-red-600">{stats.rejected}</p>
            </CardContent>
          </Card>
        </div>

        {/* 搜索 */}
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="搜索任务..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* 视图模式 */}
        {viewMode === "timeline" ? (
          <ExecutionTimeline userId={session.user.id} />
        ) : loading ? (
          <div className="text-center py-12">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
            <p className="text-muted-foreground mt-4">加载中...</p>
          </div>
        ) : filteredTasks.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground mb-4">暂无任务</p>
              <Link href="/workflows/new">
                <Button variant="outline">创建工作流</Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {filteredTasks.map((task) => {
              const statusCfg = STATUS_CONFIG[task.status] ?? STATUS_CONFIG.pending
              return (
                <Card key={task.id} className="hover:shadow-sm transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${statusCfg.bg} ${statusCfg.color} border ${statusCfg.border}`}
                          >
                            {statusCfg.icon}
                            {statusCfg.label}
                          </span>
                          <Badge variant="outline" className="text-xs">
                            {TYPE_LABELS[task.type] ?? task.type}
                          </Badge>
                          {task.agent_confidence && (
                            <Badge variant="secondary" className="text-xs">
                              置信度: {task.agent_confidence}
                            </Badge>
                          )}
                        </div>
                        <p className="font-medium truncate">{task.title}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          创建于{" "}
                          {new Date(task.created_at).toLocaleString("zh-CN")}
                          {task.started_at && ` · AI处理于 ${new Date(task.started_at).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })}`}
                        </p>

                        {/* 执行时间线 */}
                        <TaskTimeline task={task} />
                      </div>

                      {/* 操作按钮 */}
                      <div className="flex items-center gap-2 shrink-0">
                        {task.status === "waiting_approval" && (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-red-600 border-red-200 hover:bg-red-50"
                              onClick={() => handleApprove(task.id, false)}
                              disabled={approvingTask === task.id}
                            >
                              {approvingTask === task.id ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                "驳回"
                              )}
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => handleApprove(task.id, true)}
                              disabled={approvingTask === task.id}
                            >
                              {approvingTask === task.id ? (
                                <Loader2 className="h-3 w-3 animate-spin mr-1" />
                              ) : null}
                              通过
                            </Button>
                          </>
                        )}
                        {task.agent_result && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setShowApproveDialog(task)}
                          >
                            <Eye className="h-3 w-3 mr-1" />查看
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </main>

      {/* 任务详情弹窗 */}
      {showApproveDialog && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-2xl max-h-[80vh] overflow-y-auto">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>{showApproveDialog.title}</CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowApproveDialog(null)}
                >
                  ✕
                </Button>
              </div>
              <CardDescription>
                类型: {TYPE_LABELS[showApproveDialog.type] ?? showApproveDialog.type}
                {" | "}
                置信度: {showApproveDialog.agent_confidence ?? "未知"}
                {showApproveDialog.agent_model && ` | 模型: ${showApproveDialog.agent_model}`}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* 执行时间线 */}
              <TaskTimeline task={showApproveDialog} />

              {/* AI 输出内容 */}
              <div>
                <h4 className="text-sm font-medium mb-2">AI 生成结果</h4>
                <div className="bg-muted rounded-lg p-4 text-sm whitespace-pre-wrap font-mono">
                  {showApproveDialog.agent_result?.content ?? "无内容"}
                </div>
              </div>

              {/* 审批备注 */}
              {showApproveDialog.status === "waiting_approval" && (
                <div className="space-y-2">
                  <Label htmlFor="comment">审批备注（可选）</Label>
                  <Input
                    id="comment"
                    placeholder="添加审批意见..."
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                  />
                </div>
              )}

              {/* 操作 */}
              {showApproveDialog.status === "waiting_approval" && (
                <div className="flex gap-3 justify-end pt-4 border-t">
                  <Button
                    variant="outline"
                    className="text-red-600 border-red-200 hover:bg-red-50"
                    onClick={() => handleApprove(showApproveDialog.id, false)}
                    disabled={approvingTask === showApproveDialog.id}
                  >
                    {approvingTask === showApproveDialog.id ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-1" />
                    ) : null}
                    驳回
                  </Button>
                  <Button
                    onClick={() => handleApprove(showApproveDialog.id, true)}
                    disabled={approvingTask === showApproveDialog.id}
                  >
                    {approvingTask === showApproveDialog.id ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-1" />
                    ) : null}
                    通过审批
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Mobile Bottom Tab Navigation */}
      <MobileNav />
    </div>
  )
}
