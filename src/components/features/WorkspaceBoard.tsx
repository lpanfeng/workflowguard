"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { supabase } from "@/lib/supabase"
import { AlertTriangle, CheckCircle2, Clock, ArrowRight, Plus, Workflow, FileText, Loader2 } from "lucide-react"
import Link from "next/link"

type PendingTask = {
  id: string
  title: string
  type: string
  created_at: string
}

type QuickActions = {
  label: string
  href: string
  icon: React.ReactNode
  description: string
  color: string
}

export default function WorkspaceBoard({ userId }: { userId: string }) {
  const [pendingTasks, setPendingTasks] = useState<PendingTask[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!userId) return
    loadPendingTasks()
  }, [userId])

  const loadPendingTasks = async () => {
    if (!userId) return
    setLoading(true)
    try {
      const { data } = await supabase
        .from("tasks")
        .select("id, title, type, created_at")
        .eq("user_id", userId)
        .eq("status", "waiting_approval")
        .order("created_at", { ascending: false })
        .limit(5)

      setPendingTasks(data ?? [])
    } catch (err) {
      console.error("加载待审批任务失败:", err)
    } finally {
      setLoading(false)
    }
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "customer_service": return "🎧"
      case "content_publish": return "📝"
      case "data_entry": return "📊"
      default: return "📋"
    }
  }

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "customer_service": return "客服工单"
      case "content_publish": return "内容发布"
      case "data_entry": return "数据录入"
      default: return "工作流"
    }
  }

  const getTimeAgo = (createdAt: string) => {
    const now = new Date()
    const created = new Date(createdAt)
    const diffMins = Math.floor((now.getTime() - created.getTime()) / 60000)
    if (diffMins < 1) return "刚刚"
    if (diffMins < 60) return `${diffMins}分钟前`
    const diffHours = Math.floor(diffMins / 60)
    if (diffHours < 24) return `${diffHours}小时前`
    return `${Math.floor(diffHours / 24)}天前`
  }

  const myWorkflows = [
    { label: "全部工作流", href: "/workflows/list", icon: <Workflow className="h-4 w-4" />, color: "bg-blue-50" },
    { label: "新建工作流", href: "/workflows/new", icon: <Plus className="h-4 w-4" />, color: "bg-green-50" },
    { label: "模板库", href: "/templates", icon: <FileText className="h-4 w-4" />, color: "bg-purple-50" },
  ]

  return (
    <div className="space-y-6">
      {/* 待办事项区 */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              待办事项
            </CardTitle>
            <CardDescription>
              {pendingTasks.length > 0 
                ? `你有 ${pendingTasks.length} 个待审批任务` 
                : "暂无待办事项"}
            </CardDescription>
          </div>
          <Link href="/tasks">
            <Button variant="outline" size="sm" className="gap-1">
              查看全部 <ArrowRight className="h-3 w-3" />
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : pendingTasks.length === 0 ? (
            <div className="text-center py-8">
              <CheckCircle2 className="h-10 w-10 text-green-500 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">所有任务已处理完毕！</p>
            </div>
          ) : (
            <div className="space-y-3">
              {pendingTasks.map((task) => (
                <Link
                  key={task.id}
                  href={`/tasks/${task.id}`}
                  className="flex items-center gap-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <span className="text-2xl">{getTypeIcon(task.type)}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm truncate">{task.title}</span>
                      <Badge variant="outline" className="text-[10px] text-amber-600">
                        待审批
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-muted-foreground">{getTypeLabel(task.type)}</span>
                      <span className="text-xs text-muted-foreground">·</span>
                      <span className="text-xs text-muted-foreground">{getTimeAgo(task.created_at)}</span>
                    </div>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 快捷操作区 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">快捷操作</CardTitle>
          <CardDescription>
            快速开始使用 WorkflowGuard
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {myWorkflows.map((action) => (
              <Link
                key={action.label}
                href={action.href}
                className="flex items-center gap-3 p-4 border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className={`h-10 w-10 rounded-full flex items-center justify-center ${action.color}`}>
                  {action.icon}
                </div>
                <div>
                  <h3 className="font-medium text-sm">{action.label}</h3>
                </div>
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
