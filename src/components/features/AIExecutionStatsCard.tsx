"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Loader2, Cpu, Zap, TrendingUp, Activity } from "lucide-react"

interface AIStatsData {
  todayCalls: number
  weekCalls: number
  avgLatency: number
  successRate: number
  modelDistribution: Record<string, number>
  confidenceDist: Record<string, number>
  dailyTrend: Array<{ date: string; count: number }>
}

export function AIExecutionStatsCard({ userId }: { userId?: string }) {
  const [stats, setStats] = useState<AIStatsData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!userId) return
    loadStats()
  }, [userId])

  const loadStats = async () => {
    if (!userId) return
    setLoading(true)
    try {
      const res = await fetch(`/api/metrics/ai-stats?userId=${userId}`)
      const result = await res.json()
      if (result.success) {
        setStats(result.data)
      }
    } catch (err) {
      console.error("加载AI统计失败:", err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center h-24">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!stats) return null

  // 获取主要模型
  const primaryModel = Object.entries(stats.modelDistribution)
    .sort((a, b) => b[1] - a[1])[0]
  const primaryModelLabel = primaryModel?.[0] === "deepseek-chat" ? "DeepSeek" 
    : primaryModel?.[0] === "mock" ? "模拟模式"
    : primaryModel?.[0] || "未知"

  // 置信度分布
  const highConf = stats.confidenceDist["高"] ?? 0
  const midConf = stats.confidenceDist["中"] ?? 0
  const lowConf = stats.confidenceDist["低"] ?? 0

  // 延迟显示
  const latencyLabel = stats.avgLatency > 0 
    ? `${stats.avgLatency}ms` 
    : "暂无数据"

  return (
    <Card className="col-span-1 md:col-span-2 lg:col-span-3">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
          <Cpu className="h-4 w-4" />
          AI 调用统计
        </CardTitle>
        <Badge variant="outline" className="text-xs">
          {primaryModelLabel}
        </Badge>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-2xl font-bold">{stats.todayCalls}</div>
            <p className="text-xs text-muted-foreground">今日调用</p>
            <p className="text-xs text-muted-foreground">本周 {stats.weekCalls} 次</p>
          </div>
          <div>
            <div className="text-2xl font-bold">{stats.successRate}%</div>
            <p className="text-xs text-muted-foreground">成功率</p>
            <div className="flex items-center gap-1 mt-1">
              <Zap className="h-3 w-3 text-green-500" />
              <span className="text-xs text-muted-foreground">平均 {latencyLabel}</span>
            </div>
          </div>
        </div>

        {/* 置信度分布 */}
        <div className="mt-4">
          <p className="text-xs text-muted-foreground mb-2">置信度分布</p>
          <div className="flex gap-1 h-8 items-end">
            {stats.todayCalls > 0 ? (
              <>
                <div className="flex-1 flex flex-col items-center gap-1">
                  <div 
                    className="w-full bg-green-500 rounded-t" 
                    style={{ height: `${Math.max(8, (highConf / stats.todayCalls) * 32)}px` }}
                  />
                  <span className="text-xs text-muted-foreground">高</span>
                </div>
                <div className="flex-1 flex flex-col items-center gap-1">
                  <div 
                    className="w-full bg-yellow-500 rounded-t" 
                    style={{ height: `${Math.max(8, (midConf / stats.todayCalls) * 32)}px` }}
                    />
                  <span className="text-xs text-muted-foreground">中</span>
                </div>
                <div className="flex-1 flex flex-col items-center gap-1">
                  <div 
                    className="w-full bg-red-500 rounded-t" 
                    style={{ height: `${Math.max(8, (lowConf / stats.todayCalls) * 32)}px` }}
                  />
                  <span className="text-xs text-muted-foreground">低</span>
                </div>
              </>
            ) : (
              <p className="text-xs text-muted-foreground">暂无数据</p>
            )}
          </div>
        </div>

        {/* 近7天趋势迷你图 */}
        <div className="mt-4">
          <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
            <Activity className="h-3 w-3" />
            近7天调用趋势
          </p>
          <div className="flex gap-1 h-12 items-end">
            {stats.dailyTrend.map((day, idx) => {
              const maxCount = Math.max(...stats.dailyTrend.map(d => d.count), 1)
              const height = Math.max(4, (day.count / maxCount) * 48)
              return (
                <div key={idx} className="flex-1 flex flex-col items-center gap-1">
                  <div 
                    className="w-full bg-blue-500 rounded-t opacity-70 hover:opacity-100 transition-opacity"
                    style={{ height: `${height}px` }}
                    title={`${day.date}: ${day.count}次`}
                  />
                  <span className="text-xs text-muted-foreground">{day.date.split('/')[1]}</span>
                </div>
              )
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
