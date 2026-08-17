// WorkflowGuard — AI Execution Stats API
// 聚合AI调用统计数据，为Dashboard提供AI调用统计卡片

import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

export async function GET(request: NextRequest) {
  const userId = request.nextUrl.searchParams.get("userId")
  if (!userId) {
    return NextResponse.json({ error: "缺少 userId" }, { status: 400 })
  }

  try {
    const now = new Date()
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

    // 1. 今日AI调用次数
    const { data: todayLogs } = await supabaseAdmin
      .from("audit_logs")
      .select("id, action, details")
      .eq("user_id", userId)
      .gte("created_at", todayStart.toISOString())
      .lte("created_at", now.toISOString())
      .in("action", ["ai_executed", "ai_failed"])

    const todayCalls = todayLogs?.length ?? 0

    // 2. 近7天AI调用次数
    const { data: weekLogs } = await supabaseAdmin
      .from("audit_logs")
      .select("id")
      .eq("user_id", userId)
      .gte("created_at", sevenDaysAgo.toISOString())
      .in("action", ["ai_executed", "ai_failed"])

    const weekCalls = weekLogs?.length ?? 0

    // 3. 平均延迟（毫秒）
    const successfulCalls = todayLogs?.filter((l: any) => 
      l.action === "ai_executed" && l.details?.latency_ms !== null
    ) ?? []
    const avgLatency = successfulCalls.length > 0
      ? Math.round(successfulCalls.reduce((sum: number, l: any) => sum + (l.details?.latency_ms ?? 0), 0) / successfulCalls.length)
      : 0

    // 4. 模型调用分布
    const modelDistribution: Record<string, number> = {}
    todayLogs?.forEach((log: any) => {
      const model = log.details?.model ?? "unknown"
      modelDistribution[model] = (modelDistribution[model] ?? 0) + 1
    })

    // 5. 成功率
    const executedCount = todayLogs?.filter((l: any) => l.action === "ai_executed").length ?? 0
    const failedCount = todayLogs?.filter((l: any) => l.action === "ai_failed").length ?? 0
    const totalCalls = executedCount + failedCount
    const successRate = totalCalls > 0 ? Math.round((executedCount / totalCalls) * 100) : 0

    // 6. 置信度分布
    const confidenceDist: Record<string, number> = {}
    todayLogs?.forEach((log: any) => {
      if (log.action === "ai_executed" && log.details?.confidence) {
        const conf = log.details.confidence
        confidenceDist[conf] = (confidenceDist[conf] ?? 0) + 1
      }
    })

    // 7. 近7天每日调用趋势
    const dailyTrend: Array<{ date: string; count: number }> = []
    for (let i = 6; i >= 0; i--) {
      const day = new Date()
      day.setDate(day.getDate() - i)
      const dayStart = new Date(day.getFullYear(), day.getMonth(), day.getDate())
      const dayEnd = new Date(dayStart)
      dayEnd.setDate(dayEnd.getDate() + 1)

      const { count } = await supabaseAdmin
        .from("audit_logs")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId)
        .gte("created_at", dayStart.toISOString())
        .lt("created_at", dayEnd.toISOString())
        .in("action", ["ai_executed", "ai_failed"])

      dailyTrend.push({
        date: `${day.getMonth() + 1}/${day.getDate()}`,
        count: count ?? 0,
      })
    }

    return NextResponse.json({
      success: true,
      data: {
        todayCalls,
        weekCalls,
        avgLatency,
        successRate,
        modelDistribution,
        confidenceDist,
        dailyTrend,
      },
    })
  } catch (err) {
    console.error("[AIStats API Error]", err)
    return NextResponse.json(
      { success: false, error: "查询失败" },
      { status: 500 }
    )
  }
}
