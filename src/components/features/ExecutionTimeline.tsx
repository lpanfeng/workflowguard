"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { supabase } from "@/lib/supabase"
import { Loader2, Activity, Clock, CheckCircle2, XCircle, AlertTriangle, ChevronRight } from "lucide-react"
import Link from "next/link"

type ExecutionEvent = {
  id: string
  workflow_id: string
  workflow_name: string
  status: string
  started_at: string
  completed_at: string | null
  error?: string
}

type TimelineData = {
  events: ExecutionEvent[]
  isLoading: boolean
}

const STATUS_CONFIG: Record<string, { label: string; icon: React.ReactNode; color: string; dot: string }> = {
  completed: {
    label: "已完成",
    icon: <CheckCircle2 className="h-3.5 w-3.5" />,
    color: "text-green-600",
    dot: "bg-green-500",
  },
  running: {
    label: "运行中",
    icon: <Activity className="h-3.5 w-3.5 animate-pulse" />,
    color: "text-blue-600",
    dot: "bg-blue-500",
  },
  failed: {
    label: "失败",
    icon: <XCircle className="h-3.5 w-3.5" />,
    color: "text-red-600",
    dot: "bg-red-500",
  },
  waiting_approval: {
    label: "待审批",
    icon: <AlertTriangle className="h-3.5 w-3.5" />,
    color: "text-amber-600",
    dot: "bg-amber-500",
  },
  pending: {
    label: "待执行",
    icon: <Clock className="h-3.5 w-3.5" />,
    color: "text-slate-400",
    dot: "bg-slate-300",
  },
}

function getDefaultStatus(key: string) {
  return STATUS_CONFIG[key] ?? {
    label: key,
    icon: <Clock className="h-3.5 w-3.5" />,
    color: "text-slate-400",
    dot: "bg-slate-300",
  }
}

export default function ExecutionTimeline({ userId, refreshKey = 0 }: { userId: string; refreshKey?: number }) {
  const [timeline, setTimeline] = useState<TimelineData>({
    events: [],
    isLoading: true,
  })

  useEffect(() => {
    if (!userId) return
    loadTimeline()
  }, [userId, refreshKey])

  const loadTimeline = async () => {
    if (!userId) return
    setTimeline((prev) => ({ ...prev, isLoading: true }))

    try {
      // Fetch recent executions by joining workflows + tasks or using workflow_executions table
      const { data: executions, error: execError } = await supabase
        .from("workflow_executions")
        .select("id, workflow_id, status, started_at, completed_at, error")
        .eq("user_id", userId)
        .order("started_at", { ascending: false })
        .limit(10)

      if (execError) {
        // Fallback: check if table doesn't exist, use tasks table instead
        console.warn("workflow_executions not available, falling back to tasks:", execError.message)
        
        const { data: tasks } = await supabase
          .from("tasks")
          .select("id, title, type, status, created_at, updated_at")
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
          .limit(10)

        if (tasks) {
          const fallbackEvents: ExecutionEvent[] = tasks.map((t) => ({
            id: t.id,
            workflow_id: t.id,
            workflow_name: t.title ?? `[${t.type}] 任务`,
            status: t.status === "completed" || t.status === "approved" 
              ? "completed" 
              : t.status === "failed" 
                ? "failed"
                : t.status === "waiting_approval"
                  ? "waiting_approval"
                  : t.status === "rejected"
                    ? "failed"
                    : "pending",
            started_at: t.created_at,
            completed_at: t.updated_at !== t.created_at ? t.updated_at : null,
          }))
          setTimeline({ events: fallbackEvents, isLoading: false })
          return
        }

        setTimeline({ events: [], isLoading: false })
        return
      }

      if (!executions || executions.length === 0) {
        setTimeline({ events: [], isLoading: false })
        return
      }

      // Get workflow names for each execution
      const workflowIds = [...new Set(executions.map((e) => e.workflow_id))]
      const { data: workflows } = await supabase
        .from("workflows")
        .select("id, name")
        .in("id", workflowIds)

      const workflowMap = new Map(workflows?.map((w) => [w.id, w.name]) ?? [])

      const events: ExecutionEvent[] = executions.map((exec) => ({
        id: exec.id,
        workflow_id: exec.workflow_id,
        workflow_name: workflowMap.get(exec.workflow_id) ?? "未知工作流",
        status: exec.status,
        started_at: exec.started_at,
        completed_at: exec.completed_at,
        error: exec.error,
      }))

      setTimeline({ events, isLoading: false })
    } catch (err) {
      console.error("加载执行时间线失败:", err)
      setTimeline((prev) => ({ ...prev, isLoading: false }))
    }
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Activity className="h-4 w-4" />
          执行时间线
        </CardTitle>
        <CardDescription>最近的工作流执行记录</CardDescription>
      </CardHeader>
      <CardContent>
        {timeline.isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : timeline.events.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p className="text-sm">暂无执行记录</p>
            <p className="text-xs mt-1">创建工作流后，执行记录将显示在这里</p>
          </div>
        ) : (
          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-[15px] top-2 bottom-2 w-px bg-border" />

            <div className="space-y-0">
              {timeline.events.map((event, idx) => {
                const statusConfig = getDefaultStatus(event.status)
                const startDate = new Date(event.started_at)
                const now = new Date()
                const diffMs = now.getTime() - startDate.getTime()
                const diffMins = Math.floor(diffMs / 60000)
                const timeAgo = diffMins < 1 ? "刚刚" : diffMins < 60 ? `${diffMins}分钟前` : `${Math.floor(diffMins / 60)}小时前`

                return (
                  <div key={event.id} className="relative flex gap-4 pb-4 last:pb-0">
                    {/* Dot */}
                    <div className={`relative z-10 mt-1 h-[30px] w-[30px] rounded-full flex items-center justify-center ring-4 ring-background ${statusConfig.dot}`}>
                      <div className="text-white">{statusConfig.icon}</div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0 pt-0.5">
                      <div className="flex items-center justify-between gap-2">
                        <Link
                          href={`/workflows/${event.workflow_id}`}
                          className="text-sm font-medium hover:underline truncate"
                        >
                          {event.workflow_name}
                        </Link>
                        <Badge
                          variant="outline"
                          className={`text-[10px] px-1.5 py-0 flex-shrink-0 ${statusConfig.color}`}
                        >
                          {statusConfig.label}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[11px] text-muted-foreground">{timeAgo}</span>
                        {event.completed_at && (
                          <>
                            <span className="text-[11px] text-muted-foreground">·</span>
                            <span className="text-[11px] text-muted-foreground">
                              耗时 {Math.round((new Date(event.completed_at).getTime() - new Date(event.started_at).getTime()) / 1000)}s
                            </span>
                          </>
                        )}
                      </div>
                      {event.error && (
                        <p className="text-xs text-red-500 mt-1 truncate">{event.error}</p>
                      )}
                    </div>

                    <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-1" />
                  </div>
                )
              })}
            </div>

            <Link
              href="/workflows/list"
              className="block text-xs text-primary hover:underline pt-2 text-center"
            >
              查看全部工作流 →
            </Link>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
