"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter, useParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { NavBar } from "@/components/NavBar"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"
import Link from "next/link"
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  XCircle,
  Loader2,
  MessageSquare,
  FileText,
  AlertTriangle,
  UserCheck,
  Bot,
  ExternalLink,
  Undo2,
} from "lucide-react"

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
  approved_result: Record<string, unknown> | null
  approval_comment: string | null
  approved_at: string | null
  started_at: string | null
  completed_at: string | null
  error_message: string | null
  created_at: string
  workflow?: {
    id: string
    name: string
    template_id: string
    is_active: boolean
  }
  approval_history?: Array<{
    id: string
    action: string
    comment: string | null
    approved_by: string | null
    created_at: string
  }>
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  pending: { label: "待执行", color: "text-gray-600", bg: "bg-gray-100", icon: <Clock className="h-3 w-3" /> },
  running: { label: "执行中", color: "text-blue-600", bg: "bg-blue-100", icon: <Loader2 className="h-3 w-3 animate-spin" /> },
  waiting_approval: { label: "待审批", color: "text-amber-600", bg: "bg-amber-100", icon: <UserCheck className="h-3 w-3" /> },
  approved: { label: "已批准", color: "text-green-600", bg: "bg-green-100", icon: <CheckCircle2 className="h-3 w-3" /> },
  rejected: { label: "已驳回", color: "text-red-600", bg: "bg-red-100", icon: <XCircle className="h-3 w-3" /> },
  completed: { label: "已完成", color: "text-green-600", bg: "bg-green-100", icon: <CheckCircle2 className="h-3 w-3" /> },
  failed: { label: "失败", color: "text-red-600", bg: "bg-red-100", icon: <AlertTriangle className="h-3 w-3" /> },
}

export default function TaskDetailPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const params = useParams()
  const taskId = params.id as string

  const [task, setTask] = useState<TaskRecord | null>(null)
  const [loading, setLoading] = useState(true)
  const [approving, setApproving] = useState(false)
  const [rejecting, setRejecting] = useState(false)
  const [comment, setComment] = useState("")
  const [showRejectModal, setShowRejectModal] = useState(false)

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/login")
    }
  }, [status, router])

  useEffect(() => {
    if (session?.user?.id && taskId) {
      loadTaskDetail()
    }
  }, [session, taskId])

  const loadTaskDetail = async () => {
    if (!session?.user?.id || !taskId) return
    setLoading(true)

    try {
      // 获取任务详情
      const { data: taskData, error: taskError } = await supabase
        .from("tasks")
        .select(`
          *,
          workflow:workflows!inner (
            id,
            name,
            template_id,
            is_active
          )
        `)
        .eq("id", taskId)
        .eq("user_id", session.user.id)
        .single()

      if (taskError || !taskData) {
        toast.error("任务不存在或无权访问")
        router.push("/tasks")
        return
      }

      // 获取审批历史
      const { data: historyData } = await supabase
        .from("audit_logs")
        .select("*")
        .eq("user_id", session.user.id)
        .eq("entity_type", "task")
        .eq("entity_id", taskId)
        .order("created_at", { ascending: false })
        .limit(10)

      const approvalHistory = historyData
        ?.filter((log: any) => ["task_approved", "task_rejected", "task_created"].includes(log.action))
        .map((log: any) => ({
          id: log.id,
          action: log.action,
          comment: log.details?.comment || null,
          approved_by: log.user_id,
          created_at: log.created_at,
        })) || []

      setTask({ ...taskData, approval_history: approvalHistory })
    } catch (err) {
      console.error("Load task detail error:", err)
      toast.error("加载任务详情失败")
    } finally {
      setLoading(false)
    }
  }

  const handleApprove = async () => {
    if (!session?.user?.id || !taskId) return
    setApproving(true)

    try {
      const response = await fetch(`/api/tasks/${taskId}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: session.user.id,
          comment: comment || undefined,
        }),
      })

      const result = await response.json()

      if (response.ok) {
        toast.success("审批通过！")
        setComment("")
        setShowRejectModal(false)
        loadTaskDetail()
      } else {
        toast.error(result.error || "审批失败")
      }
    } catch (err) {
      console.error("Approve error:", err)
      toast.error("网络错误，请重试")
    } finally {
      setApproving(false)
    }
  }

  const handleReject = async () => {
    if (!session?.user?.id || !taskId) return
    setRejecting(true)

    try {
      const response = await fetch(`/api/tasks/${taskId}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: session.user.id,
          comment: comment || "未通过审批",
        }),
      })

      const result = await response.json()

      if (response.ok) {
        toast.success("已驳回该任务")
        setComment("")
        setShowRejectModal(false)
        loadTaskDetail()
      } else {
        toast.error(result.error || "驳回失败")
      }
    } catch (err) {
      console.error("Reject error:", err)
      toast.error("网络错误，请重试")
    } finally {
      setRejecting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
        <NavBar />
        <div className="container mx-auto px-4 py-8">
          <div className="flex justify-center items-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="ml-2 text-muted-foreground">加载中...</span>
          </div>
        </div>
      </div>
    )
  }

  if (!task) return null

  const statusConfig = STATUS_CONFIG[task.status] || STATUS_CONFIG.pending
  const isWaitingApproval = task.status === "waiting_approval"
  const stepType = task.type || "unknown"
  const stepConfig = {
    ai_execute: { label: "AI 执行", icon: <Bot className="h-4 w-4" />, color: "bg-purple-100 text-purple-700" },
    human_approve: { label: "人工审批", icon: <UserCheck className="h-4 w-4" />, color: "bg-amber-100 text-amber-700" },
    notify: { label: "通知", icon: <MessageSquare className="h-4 w-4" />, color: "bg-blue-100 text-blue-700" },
    action: { label: "操作", icon: <FileText className="h-4 w-4" />, color: "bg-slate-100 text-slate-700" },
  }[stepType] || { label: stepType, icon: <FileText className="h-4 w-4" />, color: "bg-gray-100 text-gray-700" }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <NavBar />
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* 返回按钮 */}
        <Link href="/tasks" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors">
          <ArrowLeft className="h-4 w-4 mr-1" />
          返回任务列表
        </Link>

        {/* 任务头部 */}
        <Card className="mb-6 border-l-4 border-l-primary">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-xl flex items-center gap-2">
                  {task.title}
                  <Badge className={`${statusConfig.bg} ${statusConfig.color} border-0`}>
                    {statusConfig.icon}
                    <span className="ml-1">{statusConfig.label}</span>
                  </Badge>
                </CardTitle>
                <CardDescription className="mt-2 flex items-center gap-4">
                  <span className="flex items-center gap-1">
                    <ExternalLink className="h-3.5 w-3.5" />
                    工作流：<Link href={`/workflows/${task.workflow_id}`} className="text-primary hover:underline">{task.workflow?.name || "未知"}</Link>
                  </span>
                  <span>创建于 {new Date(task.created_at).toLocaleString("zh-CN")}</span>
                  {task.started_at && <span>执行于 {new Date(task.started_at).toLocaleString("zh-CN")}</span>}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* 步骤信息 */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              {stepConfig.icon}
              步骤类型：{stepConfig.label}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* 输入数据 */}
              <div>
                <h4 className="text-sm font-semibold text-muted-foreground mb-2 flex items-center gap-1">
                  <FileText className="h-3.5 w-3.5" />
                  输入数据
                </h4>
                <pre className="bg-slate-50 rounded-lg p-3 text-xs overflow-x-auto border">
                  {JSON.stringify(task.input_data, null, 2)}
                </pre>
              </div>

              {/* AI 执行结果 */}
              {(task.agent_result || task.approved_result || task.error_message) && (
                <div>
                  <h4 className="text-sm font-semibold text-muted-foreground mb-2 flex items-center gap-1">
                    <Bot className="h-3.5 w-3.5" />
                    {task.approved_result ? "审批结果" : task.error_message ? "错误信息" : "AI 执行结果"}
                  </h4>
                  <pre className="bg-slate-50 rounded-lg p-3 text-xs overflow-x-auto border">
                    {task.error_message
                      ? `⚠️ ${task.error_message}`
                      : task.approved_result
                        ? JSON.stringify(task.approved_result, null, 2)
                        : JSON.stringify(task.agent_result, null, 2)
                    }
                  </pre>
                  {task.agent_confidence && (
                    <p className="text-xs text-muted-foreground mt-2">
                      AI 置信度：{task.agent_confidence}
                    </p>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* 审批操作区（仅待审批状态显示） */}
        {isWaitingApproval && (
          <Card className="mb-6 border-amber-200 bg-amber-50/50">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2 text-amber-700">
                <UserCheck className="h-5 w-5" />
                需要您的审批
              </CardTitle>
              <CardDescription>请审查 AI 的执行结果，决定批准或驳回</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Textarea
                  placeholder="审批备注（可选）..."
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  rows={3}
                />
                <div className="flex gap-3">
                  <Button
                    onClick={handleApprove}
                    disabled={approving}
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                  >
                    {approving ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        审批中...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="h-4 w-4 mr-2" />
                        批准
                      </>
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1 border-red-300 text-red-600 hover:bg-red-50"
                    onClick={() => setShowRejectModal(true)}
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    驳回
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* 审批历史 */}
        {task.approval_history && task.approval_history.length > 0 && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Undo2 className="h-4 w-4" />
                审批历史
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {task.approval_history.map((log) => (
                  <div key={log.id} className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg border">
                    {log.action === "task_approved" ? (
                      <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                    ) : log.action === "task_rejected" ? (
                      <XCircle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
                    ) : (
                      <Clock className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm">
                        {log.action === "task_approved" && "✅ 任务已批准"}
                        {log.action === "task_rejected" && "❌ 任务已驳回"}
                        {log.action === "task_created" && "📋 任务已创建"}
                      </p>
                      {log.comment && (
                        <p className="text-xs text-muted-foreground mt-1">{log.comment}</p>
                      )}
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(log.created_at).toLocaleString("zh-CN")}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* 完成时间 */}
        {task.completed_at && (
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">
                完成时间：{new Date(task.completed_at).toLocaleString("zh-CN")}
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* 驳回确认弹窗 */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle className="text-red-600 flex items-center gap-2">
                <XCircle className="h-5 w-5" />
                确认驳回
              </CardTitle>
              <CardDescription>驳回后任务将标记为 rejected，请确认驳回理由</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                placeholder="请输入驳回理由（必填）..."
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={3}
              />
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => setShowRejectModal(false)}
                  className="flex-1"
                >
                  取消
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleReject}
                  disabled={rejecting || !comment.trim()}
                  className="flex-1"
                >
                  {rejecting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      处理中...
                    </>
                  ) : (
                    "确认驳回"
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
