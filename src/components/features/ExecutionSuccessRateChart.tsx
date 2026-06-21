"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { supabase } from "@/lib/supabase"
import { Loader2, TrendingUp, TrendingDown, Minus } from "lucide-react"
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  ReferenceLine,
} from "recharts"

type DailyRate = {
  date: string
  label: string
  total: number
  completed: number
  successRate: number
}

export default function ExecutionSuccessRateChart({ userId }: { userId: string }) {
  const [data, setData] = useState<DailyRate[]>([])
  const [loading, setLoading] = useState(true)
  const [overallRate, setOverallRate] = useState<number | null>(null)

  useEffect(() => {
    if (!userId) return
    loadData()
  }, [userId])

  const loadData = async () => {
    setLoading(true)
    try {
      const days: DailyRate[] = []
      for (let i = 6; i >= 0; i--) {
        const d = new Date()
        d.setDate(d.getDate() - i)
        const dateStr = d.toISOString().slice(0, 10)
        const tomorrow = new Date(d)
        tomorrow.setDate(tomorrow.getDate() + 1)
        const tomorrowStr = tomorrow.toISOString().slice(0, 10)

        const { data: tasks } = await supabase
          .from("tasks")
          .select("status")
          .eq("user_id", userId)
          .gte("created_at", dateStr)
          .lt("created_at", tomorrowStr)

        const total = tasks?.length ?? 0
        const completed = tasks?.filter((t) => t.status === "approved" || t.status === "completed").length ?? 0
        const successRate = total > 0 ? Math.round((completed / total) * 100) : 0

        days.push({
          date: dateStr,
          label: `${d.getMonth() + 1}/${d.getDate()}`,
          total,
          completed,
          successRate,
        })
      }

      const totalAll = days.reduce((s, d) => s + d.total, 0)
      const completedAll = days.reduce((s, d) => s + d.completed, 0)
      setOverallRate(totalAll > 0 ? Math.round((completedAll / totalAll) * 100) : 0)
      setData(days)
    } catch (err) {
      console.error("加载成功率数据失败:", err)
    } finally {
      setLoading(false)
    }
  }

  const latestRate = data.length > 0 ? data[data.length - 1].successRate : 0
  const prevRate = data.length > 1 ? data[data.length - 2].successRate : 0
  const trend = latestRate > prevRate ? "up" : latestRate < prevRate ? "down" : "flat"

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg">
              <TrendingUp className="h-4 w-4 text-green-600" />
              执行成功率趋势
            </CardTitle>
            <CardDescription>
              近7天每日工作流执行成功率
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {overallRate !== null && (
              <Badge variant={overallRate >= 80 ? "default" : overallRate >= 50 ? "secondary" : "destructive"}>
                {trend === "up" && <TrendingUp className="h-3 w-3 mr-1" />}
                {trend === "down" && <TrendingDown className="h-3 w-3 mr-1" />}
                {trend === "flat" && <Minus className="h-3 w-3 mr-1" />}
                总体 {overallRate}%
              </Badge>
            )}
            <button
              onClick={loadData}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              disabled={loading}
            >
              {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : "↻ 刷新"}
            </button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="h-48 flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data} margin={{ top: 5, right: 5, left: -15, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis
                  dataKey="label"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  domain={[0, 100]}
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v: number) => `${v}%`}
                />
                <Tooltip
                  contentStyle={{
                    borderRadius: "8px",
                    border: "1px solid hsl(var(--border))",
                    background: "hsl(var(--card))",
                    fontSize: "12px",
                  }}
                  formatter={(value: number) => [`${value}%`, "成功率"]}
                  labelFormatter={(label) => `${label} 的数据`}
                />
                <ReferenceLine y={80} stroke="green" strokeDasharray="3 3" label="80%" />
                <Line
                  type="monotone"
                  dataKey="successRate"
                  stroke="hsl(142.1 76.2% 36.3%)"
                  strokeWidth={2}
                  dot={{ r: 4, fill: "hsl(142.1 76.2% 36.3%)" }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
