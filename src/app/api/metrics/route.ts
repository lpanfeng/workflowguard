// WorkflowGuard — 指标 API
// 从审计日志和任务表中聚合使用数据

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
    // 1. 总任务数 & 状态分布
    const { data: taskStats } = await supabaseAdmin
      .from("tasks")
      .select("status")
      .eq("user_id", userId)

    const totalTasks = taskStats?.length ?? 0
    const statusBreakdown: Record<string, number> = {}
    taskStats?.forEach((t: any) => {
      statusBreakdown[t.status] = (statusBreakdown[t.status] || 0) + 1
    })

    const completedTasks = taskStats?.filter((t: any) =>
      ["completed", "approved"].includes(t.status)
    ).length ?? 0
    const successRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0

    // 2. 工作流数量
    const { count: workflowCount } = await supabaseAdmin
      .from("workflows")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("is_active", true)

    // 3. 审批统计
    const approved = taskStats?.filter((t: any) => t.status === "approved").length ?? 0
    const rejected = taskStats?.filter((t: any) => t.status === "rejected").length ?? 0
    const waiting = taskStats?.filter((t: any) => t.status === "waiting_approval").length ?? 0

    // 4. 按模板统计
    const { data: templateStats } = await supabaseAdmin
      .from("tasks")
      .select(`
        type,
        status
      `)
      .eq("user_id", userId)

    const templateBreakdown: Record<string, { total: number; completed: number }> = {}
    templateStats?.forEach((t: any) => {
      if (!templateBreakdown[t.type]) {
        templateBreakdown[t.type] = { total: 0, completed: 0 }
      }
      templateBreakdown[t.type].total++
      if (["completed", "approved"].includes(t.status)) {
        templateBreakdown[t.type].completed++
      }
    })

    // 5. 周趋势数据（最近7天）
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

    const { data: recentLogs } = await supabaseAdmin
      .from("audit_logs")
      .select("action, created_at")
      .eq("user_id", userId)
      .gte("created_at", sevenDaysAgo.toISOString())
      .order("created_at", { ascending: true })

    const dailyTrend: Record<string, { tasks: number; approvals: number }> = {}
    for (let i = 6; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      const key = d.toISOString().split("T")[0]
      dailyTrend[key] = { tasks: 0, approvals: 0 }
    }

    recentLogs?.forEach((log: any) => {
      const day = log.created_at.split("T")[0]
      if (dailyTrend[day]) {
        if (log.action === "task_created") dailyTrend[day].tasks++
        if (["task_approved", "task_rejected"].includes(log.action)) dailyTrend[day].approvals++
      }
    })

    // 6. 总 AI 调用次数
    const { count: aiCallCount } = await supabaseAdmin
      .from("audit_logs")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
      .in("action", ["ai_executed", "ai_failed"])

    return NextResponse.json({
      totalTasks,
      successRate,
      workflowCount: workflowCount ?? 0,
      statusBreakdown,
      templateBreakdown,
      dailyTrend: Object.entries(dailyTrend).map(([date, counts]) => ({
        date,
        ...counts,
      })),
      approvals: { approved, rejected, waiting },
      aiCallCount: aiCallCount ?? 0,
    })
  } catch (err) {
    console.error("[Metrics API Error]", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
