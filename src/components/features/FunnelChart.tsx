"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { supabase } from "@/lib/supabase"
import { Loader2, ArrowDown, ArrowUp, Minus } from "lucide-react"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Cell,
} from "recharts"

type FunnelStage = {
  name: string
  count: number
  percentage: number
  color: string
  icon: string
}

type FunnelData = {
  stages: FunnelStage[]
  totalWorkflows: number
  totalTasks: number
  avgApprovalTime: number | null
  conversionRate: number
  isLoading: boolean
  error: string | null
}

const STAGE_COLORS = [
  "#6366f1", // indigo - created
  "#8b5cf6", // purple - ai_executing
  "#f59e0b", // amber - waiting_approval
  "#10b981", // green - completed
  "#ef4444", // red - rejected
]

export function FunnelChart({ userId }: { userId?: string }) {
  const [data, setData] = useState<FunnelData>({
    stages: [],
    totalWorkflows: 0,
    totalTasks: 0,
    avgApprovalTime: null,
    conversionRate: 0,
    isLoading: true,
    error: null,
  })

  useEffect(() => {
    fetchFunnelData()
  }, [userId])

  const fetchFunnelData = async () => {
    try {
      const query = supabase.from("tasks").select("status, workflow_id")
      
      if (userId) {
        query.eq("user_id", userId)
      }

      const { data: tasks, error } = await query
      if (error) throw error

      // Count by status
      const statusCounts: Record<string, number> = {}
      tasks?.forEach(t => {
        statusCounts[t.status] = (statusCounts[t.status] || 0) + 1
      })

      // Get workflows for approval time calculation
      let avgApprovalTime: number | null = null
      try {
        const { data: auditLogs } = await supabase
          .from("audit_logs")
          .select("created_at")
          .eq("action", "approve")
          .limit(100)
        
        if (auditLogs && auditLogs.length > 1) {
          const times = []
          for (let i = 1; i < auditLogs.length; i++) {
            const diff = new Date(auditLogs[i].created_at).getTime() - 
                         new Date(auditLogs[i-1].created_at).getTime()
            if (diff > 0 && diff < 86400000) { // within 24h
              times.push(diff / 60000) // minutes
            }
          }
          if (times.length > 0) {
            avgApprovalTime = Math.round(times.reduce((a, b) => a + b, 0) / times.length)
          }
        }
      } catch { /* ignore */ }

      const totalTasks = tasks?.length || 0
      const completed = statusCounts["completed"] || 0
      const rejected = statusCounts["rejected"] || 0
      const waiting = statusCounts["waiting_approval"] || 0
      const executing = statusCounts["ai_executing"] || 0

      // Build funnel stages
      const stages: FunnelStage[] = [
        { name: "已创建", count: totalTasks, percentage: 100, color: STAGE_COLORS[0], icon: "📝" },
        { name: "AI执行中", count: executing, percentage: totalTasks ? Math.round(executing / totalTasks * 100) : 0, color: STAGE_COLORS[1], icon: "🤖" },
        { name: "待审批", count: waiting, percentage: totalTasks ? Math.round(waiting / totalTasks * 100) : 0, color: STAGE_COLORS[2], icon: "⏳" },
        { name: "已完成", count: completed, percentage: totalTasks ? Math.round(completed / totalTasks * 100) : 0, color: STAGE_COLORS[3], icon: "✅" },
        { name: "已驳回", count: rejected, percentage: totalTasks ? Math.round(rejected / totalTasks * 100) : 0, color: STAGE_COLORS[4], icon: "❌" },
      ]

      setData({
        stages,
        totalWorkflows: 0,
        totalTasks,
        avgApprovalTime,
        conversionRate: totalTasks ? Math.round(completed / totalTasks * 100) : 0,
        isLoading: false,
        error: null,
      })
    } catch (err: any) {
      setData(prev => ({
        ...prev,
        isLoading: false,
        error: err.message || "Failed to load funnel data",
      }))
    }
  }

  if (data.isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    )
  }

  if (data.error) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-sm text-destructive">{data.error}</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          📊 任务转化漏斗
        </CardTitle>
        <CardDescription>
          从创建到完成的完整流程追踪 · 总任务数: {data.totalTasks} · 转化率: {data.conversionRate}%
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Funnel Visualization */}
        <div className="space-y-3 mb-6">
          {data.stages.map((stage, index) => (
            <div key={index} className="relative">
              <div className="flex items-center gap-3">
                <span className="text-lg">{stage.icon}</span>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium">{stage.name}</span>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-xs">
                        {stage.count}
                      </Badge>
                      <span className="text-xs text-muted-foreground w-12 text-right">
                        {stage.percentage}%
                      </span>
                    </div>
                  </div>
                  <div className="w-full bg-muted rounded-full h-3 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${stage.percentage}%`,
                        backgroundColor: stage.color,
                      }}
                    />
                  </div>
                </div>
              </div>
              {/* Connector arrow between stages */}
              {index < data.stages.length - 1 && (
                <div className="flex justify-center my-1">
                  <ArrowDown className="h-4 w-4 text-muted-foreground/50" />
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-3 gap-4 pt-4 border-t">
          <div className="text-center">
            <div className="text-2xl font-bold text-emerald-500">{data.conversionRate}%</div>
            <div className="text-xs text-muted-foreground">整体转化率</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-amber-500">
              {data.avgApprovalTime ?? "--"}
            </div>
            <div className="text-xs text-muted-foreground">平均审批时间(分钟)</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-indigo-500">
              {data.totalTasks > 0 ? Math.round((data.totalTasks - (data.stages[2]?.count || 0)) / data.totalTasks * 100) : 0}%
            </div>
            <div className="text-xs text-muted-foreground">完成+驳回率</div>
          </div>
        </div>

        {/* Bar Chart View */}
        <div className="mt-6 pt-4 border-t">
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={data.stages}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip 
                contentStyle={{ fontSize: 12 }}
                formatter={(value: any, name: any) => [value as number, String(name || "")]}
              />
              <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                {data.stages.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}
