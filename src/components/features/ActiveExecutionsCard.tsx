"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Loader2, PlayCircle, Clock, CheckCircle2, AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/button"

type ActiveExecution = {
  id: string
  workflow_id: string
  status: string
  current_step_index: number
  started_at: string
  completed_at: string | null
  error_message: string | null
  retry_count: number
  workflow_name: string
  duration_seconds: number
}

type ActiveExecutionsData = {
  total: number
  summary: {
    running: number
    stepInProgress: number
    waitingApproval: number
  }
  executions: ActiveExecution[]
}

const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
  running: { label: "执行中", color: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300", icon: PlayCircle },
  step_in_progress: { label: "步骤执行中", color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300", icon: Clock },
  waiting_approval: { label: "等待审批", color: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300", icon: AlertTriangle },
}

export function ActiveExecutionsCard({ userId }: { userId?: string }) {
  const [data, setData] = useState<ActiveExecutionsData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!userId) {
      // Demo mode: show placeholder
      const timer = setTimeout(() => {
        setData({
          total: 0,
          summary: { running: 0, stepInProgress: 0, waitingApproval: 0 },
          executions: [],
        })
        setLoading(false)
      }, 1000)
      return () => clearTimeout(timer)
    }

    const fetchActiveExecutions = async () => {
      try {
        const res = await fetch(`/api/workflows/active-executions?userId=${encodeURIComponent(userId)}`)
        const json = await res.json()
        if (json.success) {
          setData(json)
        } else {
          setData({ total: 0, summary: { running: 0, stepInProgress: 0, waitingApproval: 0 }, executions: [] })
        }
      } catch {
        setData({ total: 0, summary: { running: 0, stepInProgress: 0, waitingApproval: 0 }, executions: [] })
      } finally {
        setLoading(false)
      }
    }

    fetchActiveExecutions()
    const interval = setInterval(fetchActiveExecutions, 15000)
    return () => clearInterval(interval)
  }, [userId])

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6 flex items-center justify-center h-32">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    )
  }

  const total = data?.total ?? 0

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <PlayCircle className="h-4 w-4 text-blue-500" />
          活跃执行
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Summary badges */}
        <div className="flex gap-2 mb-4">
          <Badge variant="secondary" className="gap-1">
            <PlayCircle className="h-3 w-3" />
            运行中 {data?.summary.running ?? 0}
          </Badge>
          <Badge variant="secondary" className="gap-1">
            <Clock className="h-3 w-3" />
            步骤中 {data?.summary.stepInProgress ?? 0}
          </Badge>
          <Badge variant="secondary" className="gap-1">
            <AlertTriangle className="h-3 w-3" />
            待审批 {data?.summary.waitingApproval ?? 0}
          </Badge>
        </div>

        {total === 0 ? (
          <div className="text-center py-6">
            <CheckCircle2 className="h-10 w-10 text-muted-foreground/50 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">当前没有正在运行的执行</p>
            <p className="text-xs text-muted-foreground mt-1">所有工作流运行正常</p>
          </div>
        ) : (
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {data?.executions.map((exec) => {
              const config = statusConfig[exec.status] || { label: exec.status, color: "bg-gray-100", icon: AlertTriangle }
              const Icon = config.icon
              return (
                <div key={exec.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-2 min-w-0">
                    <Icon className={`h-4 w-4 flex-shrink-0 ${exec.status === "running" ? "text-blue-500" : exec.status === "step_in_progress" ? "text-yellow-500" : "text-orange-500"}`} />
                    <span className="text-sm font-medium truncate">{exec.workflow_name}</span>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Badge className={config.color} variant="outline">{config.label}</Badge>
                    <span className="text-xs text-muted-foreground">{exec.duration_seconds}s</span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
