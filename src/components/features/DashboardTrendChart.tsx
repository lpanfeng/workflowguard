"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { supabase } from "@/lib/supabase"
import { Loader2, TrendingUp } from "lucide-react"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
  CartesianGrid,
} from "recharts"

type DailyTrend = {
  date: string
  label: string
  completed: number
  approved: number
  rejected: number
  waiting: number
  totalProcessed: number // completed + rejected (for success rate calc)
}

type TrendData = {
  dailyTrends: DailyTrend[]
  totalCompleted: number
  avgPerDay: number
  bestDay: string | null
  successRate?: number
  isLoading: boolean
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00+08:00")
  return `${d.getMonth() + 1}/${d.getDate()}`
}

function generateDayLabels(): string[] {
  const labels: string[] = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    labels.push(d.toISOString().slice(0, 10))
  }
  return labels
}

export default function DashboardTrendChart({ userId }: { userId: string }) {
  const [trendData, setTrendData] = useState<TrendData>({
    dailyTrends: [],
    totalCompleted: 0,
    avgPerDay: 0,
    bestDay: null,
    successRate: 0,
    isLoading: true,
  })

  useEffect(() => {
    if (!userId) return
    loadTrendData()
  }, [userId])

  const loadTrendData = async () => {
    if (!userId) return
    setTrendData((prev) => ({ ...prev, isLoading: true }))

    try {
      const days = generateDayLabels()
      const today = days[days.length - 1]
      const weekAgo = days[0]

      const { data: tasks } = await supabase
        .from("tasks")
        .select("id, status, updated_at, created_at")
        .eq("user_id", userId)
        .gte("updated_at", weekAgo)
        .not("status", "eq", "pending")
        .order("updated_at", { ascending: false })

      // Map each day
      const dailyMap = new Map<string, { completed: number; approved: number; rejected: number; waiting: number }>()

      for (const day of days) {
        dailyMap.set(day, { completed: 0, approved: 0, rejected: 0, waiting: 0 })
      }

      // Count by day (using updated_at for status changes)
      if (tasks) {
        for (const task of tasks) {
          const dateStr = task.updated_at?.slice(0, 10) || task.created_at?.slice(0, 10)
          if (!dateStr || !dailyMap.has(dateStr)) continue

          const entry = dailyMap.get(dateStr)!
          if (task.status === "completed" || task.status === "approved") {
            entry.completed += 1
            entry.approved += 1
          } else if (task.status === "rejected" || task.status === "failed") {
            entry.rejected += 1
          } else if (task.status === "waiting_approval") {
            entry.waiting += 1
          }
        }
      }

      const dailyTrends: DailyTrend[] = days.map((date) => {
        const data = dailyMap.get(date)!
        const totalProcessed = data.completed + data.rejected
        return {
          date,
          label: formatDate(date),
          ...data,
          totalProcessed,
        }
      })

      const totalCompleted = dailyTrends.reduce((sum, d) => sum + d.completed, 0)
      const totalProcessed = dailyTrends.reduce((sum, d) => sum + d.totalProcessed, 0)
      const avgPerDay = Math.round(totalCompleted / 7)
      const successRate = totalProcessed > 0 ? Math.round((totalCompleted / totalProcessed) * 100) : 0
      const bestDayEntry = dailyTrends.reduce(
        (best, curr) => (curr.completed + curr.approved > (best?.completed ?? 0) + (best?.approved ?? 0) ? curr : best),
        dailyTrends[0]
      )

      setTrendData({
        dailyTrends,
        totalCompleted,
        avgPerDay,
        bestDay: bestDayEntry?.label ?? null,
        successRate,
        isLoading: false,
      })
    } catch (err) {
      console.error("加载趋势数据失败:", err)
      setTrendData((prev) => ({ ...prev, isLoading: false }))
    }
  }

  const chartData = trendData.dailyTrends.map((d) => ({
    name: d.label,
    已完成: d.completed,
    已驳回: d.rejected,
    待审批: d.waiting,
  }))

  return (
    <Card className="mb-8">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div>
          <CardTitle className="flex items-center gap-2 text-lg">
            <TrendingUp className="h-4 w-4" />
            近 7 日趋势
          </CardTitle>
          <CardDescription>
            {trendData.isLoading
              ? "加载中..."
              : `总计 ${trendData.totalCompleted} 个完成 · 日均 ${trendData.avgPerDay} 个 · 成功率 ${trendData.successRate}%`}
          </CardDescription>
        </div>
        <div className="flex items-center gap-2">
          {trendData.bestDay && (
            <Badge variant="outline" className="text-xs">
              最佳日: {trendData.bestDay}
            </Badge>
          )}
          {trendData.successRate && trendData.successRate > 0 && (
            <Badge variant={trendData.successRate >= 80 ? "default" : "secondary"} className="text-xs">
              <TrendingUp className="h-3 w-3 mr-1" />
              成功率 {trendData.successRate}%
            </Badge>
          )}
          <button
            onClick={loadTrendData}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            disabled={trendData.isLoading}
          >
            {trendData.isLoading ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              "↻ 刷新"
            )}
          </button>
        </div>
      </CardHeader>
      <CardContent>
        {trendData.isLoading ? (
          <div className="h-64 flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : trendData.totalCompleted === 0 && trendData.dailyTrends.every((d) => d.waiting === 0 && d.rejected === 0) ? (
          <div className="h-64 flex items-center justify-center">
            <p className="text-muted-foreground text-sm">近 7 天暂无数据</p>
          </div>
        ) : (
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 5, right: 5, left: -15, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    borderRadius: "8px",
                    border: "1px solid hsl(var(--border))",
                    background: "hsl(var(--card))",
                    fontSize: "13px",
                  }}
                  labelStyle={{ fontWeight: 600 }}
                />
                <Legend
                  wrapperStyle={{ fontSize: "12px", paddingTop: "8px" }}
                />
                <Bar
                  dataKey="已完成"
                  fill="hsl(142.1 76.2% 36.3%)"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={40}
                />
                <Bar
                  dataKey="已驳回"
                  fill="hsl(0 84.2% 60.2%)"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={40}
                />
                <Bar
                  dataKey="待审批"
                  fill="hsl(38 92% 50%)"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={40}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
