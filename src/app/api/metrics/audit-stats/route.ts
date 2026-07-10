// WorkflowGuard — Audit Statistics API
// 聚合审计日志数据，生成Dashboard「审计统计」卡片所需指标

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
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

    // 1. 本月操作总数
    const { count: monthlyOps } = await supabaseAdmin
      .from("audit_logs")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
      .gte("created_at", monthStart.toISOString())

    // 2. 高风险操作数（ai_failed / task_rejected）
    const { data: highRiskLogs } = await supabaseAdmin
      .from("audit_logs")
      .select("id, action, created_at")
      .eq("user_id", userId)
      .gte("created_at", monthStart.toISOString())
      .in("action", ["ai_failed", "task_rejected"])

    const highRiskCount = highRiskLogs?.length ?? 0

    // 3. 审批通过率
    const { data: approvalLogs } = await supabaseAdmin
      .from("audit_logs")
      .select("action")
      .eq("user_id", userId)
      .gte("created_at", monthStart.toISOString())
      .in("action", ["task_approved", "task_rejected"])

    const approved = approvalLogs?.filter((l: any) => l.action === "task_approved").length ?? 0
    const rejected = approvalLogs?.filter((l: any) => l.action === "task_rejected").length ?? 0
    const totalApprovals = approved + rejected
    const approvalRate = totalApprovals > 0 ? Math.round((approved / totalApprovals) * 100) : 0

    // 4. 按操作类型的分布（近7天）
    const { data: recentLogs } = await supabaseAdmin
      .from("audit_logs")
      .select("action")
      .eq("user_id", userId)
      .gte("created_at", sevenDaysAgo.toISOString())

    const actionBreakdown: Record<string, number> = {}
    recentLogs?.forEach((log: any) => {
      actionBreakdown[log.action] = (actionBreakdown[log.action] || 0) + 1
    })

    // 5. 平均审批时长（近似计算：task_approved - task_created 的时间差）
    const { data: createdLogs } = await supabaseAdmin
      .from("audit_logs")
      .select("id, created_at")
      .eq("user_id", userId)
      .eq("action", "task_created")
      .gte("created_at", monthStart.toISOString())
      .order("created_at", { ascending: false })
      .limit(100)

    const avgApprovalTime = createdLogs?.length ? 0 : 0 // placeholder, needs join

    return NextResponse.json({
      success: true,
      data: {
        monthlyOperations: monthlyOps ?? 0,
        highRiskCount,
        approvalRate,
        approved,
        rejected,
        actionBreakdown,
        avgApprovalTime,
      },
    })
  } catch (err) {
    console.error("[AuditStats API Error]", err)
    return NextResponse.json(
      { success: false, error: "查询失败" },
      { status: 500 }
    )
  }
}
