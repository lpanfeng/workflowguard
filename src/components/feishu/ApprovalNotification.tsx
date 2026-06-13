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
} from "lucide-react"

interface PendingTask {
  id: string
  title: string
  status: string
  type: string
  created_at: string
  workflow_id: string
  feishu_instance_code?: string
}

export function ApprovalNotification({ workflowId }: { workflowId?: string }) {
  const [tasks, setTasks] = useState<PendingTask[]>([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)

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
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{task.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(task.created_at).toLocaleString("zh-CN")}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant="outline"
                      className="bg-amber-50 text-amber-700 border-amber-200"
                    >
                      <Clock className="h-3 w-3 mr-1" />
                      待审批
                    </Badge>
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
