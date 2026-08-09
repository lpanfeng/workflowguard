"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import {
  CheckCircle2,
  XCircle,
  Clock,
  RefreshCw,
  AlertTriangle,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  UserCircle,
  Users,
} from "lucide-react"

interface ApprovalHistory {
  id: string
  action: string
  user: string
  comment?: string
  created_at: string
}

interface PendingTask {
  id: string
  title: string
  status: string
  type: string
  created_at: string
  workflow_id: string
  feishu_instance_code?: string
  approvers?: string[]
  approvalHistory?: ApprovalHistory[]
}

export function ApprovalNotification({ workflowId }: { workflowId?: string }) {
  const [tasks, setTasks] = useState<PendingTask[]>([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set())

  const fetchTasks = async () => {
    setLoading(true)
    try {
      const params = workflowId ? `?workflow_id=${workflowId}` : ""
      const res = await fetch(`/api/workflows/feishu-sync${params}`)
      const data = await res.json()
      setTasks(data.tasks ?? [])
    } catch (err) {
      toast.error("获取待审批任务失败")
    } finally {
      setLoading(false)
    }
  }

  const handleSync = async (task: PendingTask) => {
    setSyncing(true)
    try {
      const res = await fetch("/api/workflows/feishu-sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ instanceCode: task.feishu_instance_code }),
      })
      const data = await res.json()
      if (data.success) {
        toast.success(`已同步审批状态: ${data.wfg_status}`)
        fetchTasks()
      } else {
        toast.error(data.error ?? "同步失败")
      }
    } catch (err) {
      toast.error("同步失败")
    } finally {
      setSyncing(false)
    }
  }

  const handleSyncAll = async () => {
    setSyncing(true)
    try {
      const res = await fetch("/api/workflows/feishu-sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workflowId }),
      })
      const data = await res.json()
      if (data.success) {
        toast.success(`已同步 ${data.pending_count} 个任务`)
        fetchTasks()
      } else {
        toast.error(data.message ?? "同步失败")
      }
    } catch (err) {
      toast.error("同步失败")
    } finally {
      setSyncing(false)
    }
  }

  const toggleExpand = (taskId: string) => {
    setExpandedTasks(prev => {
      const next = new Set(prev)
      if (next.has(taskId)) {
        next.delete(taskId)
      } else {
        next.add(taskId)
      }
      return next
    })
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'text-green-500 bg-green-50'
      case 'rejected': return 'text-red-500 bg-red-50'
      case 'pending': return 'text-amber-500 bg-amber-50'
      case 'waiting_approval': return 'text-blue-500 bg-blue-50'
      default: return 'text-gray-500 bg-gray-50'
    }
  }

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'approve': return <CheckCircle2 className="h-3 w-3 text-green-500" />
      case 'reject': return <XCircle className="h-3 w-3 text-red-500" />
      default: return <Clock className="h-3 w-3 text-gray-500" />
    }
  }

  useEffect(() => {
    fetchTasks()
  }, [workflowId])

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Clock className="h-5 w-5 text-amber-500" />
            飞书审批同步
          </CardTitle>
          <Badge variant="secondary" className="bg-amber-100 text-amber-700">
            {tasks.length} 待审批
          </Badge>
        </div>
        <CardDescription>
          同步飞书审批状态到 WorkflowGuard 任务
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-6">
            <RefreshCw className="h-4 w-4 animate-spin mr-2" />
            <span className="text-sm text-muted-foreground">加载中...</span>
          </div>
        ) : tasks.length === 0 ? (
          <div className="flex flex-col items-center py-8 text-center">
            <CheckCircle2 className="h-10 w-10 text-green-500 mb-2" />
            <p className="text-sm text-muted-foreground">暂无待审批任务</p>
          </div>
        ) : (
          <>
            <div className="space-y-3">
              {tasks.map((task) => (
                <div
                  key={task.id}
                  className="border rounded-lg overflow-hidden transition-all hover:shadow-sm"
                >
                  <div className="flex items-center justify-between p-3 bg-gradient-to-r from-slate-50 to-white">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-medium text-muted-foreground px-2 py-0.5 rounded-full bg-slate-100">
                          {task.type}
                        </span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${getStatusColor(task.status)}`}>
                          {task.status === 'approved' ? '已批准' :
                           task.status === 'rejected' ? '已驳回' :
                           task.status === 'waiting_approval' ? '待审批' : task.status}
                        </span>
                      </div>
                      <p className="text-sm font-medium truncate">{task.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {new Date(task.created_at).toLocaleString("zh-CN")}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 ml-3">
                      {task.approvers && task.approvers.length > 0 && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground" title="审批人">
                          <Users className="h-3 w-3" />
                          <span>{task.approvers.length}</span>
                        </div>
                      )}
                      {task.approvalHistory && task.approvalHistory.length > 0 && (
                        <button
                          onClick={() => toggleExpand(task.id)}
                          className="p-1 hover:bg-slate-100 rounded transition-colors"
                        >
                          {expandedTasks.has(task.id) ?
                            <ChevronUp className="h-4 w-4 text-slate-500" /> :
                            <ChevronDown className="h-4 w-4 text-slate-500" />}
                        </button>
                      )}
                      {task.feishu_instance_code && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleSync(task)}
                          disabled={syncing}
                          className="h-7 px-2 text-xs"
                        >
                          <RefreshCw className={`h-3 w-3 mr-1 ${syncing ? "animate-spin" : ""}`} />
                          同步
                        </Button>
                      )}
                    </div>
                  </div>
                  {expandedTasks.has(task.id) && task.approvalHistory && task.approvalHistory.length > 0 && (
                    <div className="px-3 pb-3 bg-slate-50 border-t">
                      <p className="text-xs font-medium text-muted-foreground mb-2">审批历史</p>
                      <div className="space-y-2">
                        {task.approvalHistory.map((history) => (
                          <div key={history.id} className="flex items-start gap-2 text-xs">
                            {getActionIcon(history.action)}
                            <div className="flex-1">
                              <span className="font-medium">{history.user}</span>
                              <span className="text-muted-foreground ml-1">
                                {history.action === 'approve' ? '批准' : history.action === 'reject' ? '驳回' : history.action}
                              </span>
                              {history.comment && (
                                <span className="text-muted-foreground ml-1">— "{history.comment}"</span>
                              )}
                            </div>
                            <span className="text-muted-foreground">
                              {new Date(history.created_at).toLocaleString("zh-CN")}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
            <Button
              onClick={handleSyncAll}
              disabled={syncing}
              className="w-full mt-4"
              variant="outline"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${syncing ? "animate-spin" : ""}`} />
              批量同步所有任务
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  )
}
