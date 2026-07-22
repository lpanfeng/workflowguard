// WorkflowGuard — 活跃执行查询 API
// GET /api/workflows/active-executions?userId=xxx
// 返回当前所有 running/waiting_approval/step_in_progress 状态的执行任务

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
    // 1. 查询所有活跃执行（running / step_in_progress / waiting_approval）
    const { data: activeExecutions, error: execError } = await supabaseAdmin
      .from("workflow_executions")
      .select(`
        id, workflow_id, status, current_step_index, started_at, completed_at,
        error_message, retry_count
      `)
      .eq("user_id", userId)
      .in("status", ["running", "step_in_progress", "waiting_approval"])
      .order("started_at", { ascending: false })

    if (execError) {
      return NextResponse.json({ error: execError.message }, { status: 500 })
    }

    // 2. 获取关联的工作流名称
    const workflowIds = [...new Set(activeExecutions?.map((e: any) => e.workflow_id) || [])]
    let workflowMap: Record<string, string> = {}
    if (workflowIds.length > 0) {
      const { data: workflows } = await supabaseAdmin
        .from("workflows")
        .select("id, name")
        .in("id", workflowIds)
      
      workflows?.forEach((w: any) => {
        workflowMap[w.id] = w.name
      })
    }

    // 3. 按状态分类统计
    const running = (activeExecutions || []).filter((e: any) => e.status === "running")
    const stepInProgress = (activeExecutions || []).filter((e: any) => e.status === "step_in_progress")
    const waitingApproval = (activeExecutions || []).filter((e: any) => e.status === "waiting_approval")

    // 4. 构建返回数据
    const enrichedExecutions = (activeExecutions || []).map((e: any) => ({
      ...e,
      workflow_name: workflowMap[e.workflow_id] || "未知工作流",
      duration_seconds: e.started_at 
        ? Math.round((Date.now() - new Date(e.started_at).getTime()) / 1000)
        : 0,
    }))

    return NextResponse.json({
      success: true,
      total: enrichedExecutions.length,
      summary: {
        running: running.length,
        stepInProgress: stepInProgress.length,
        waitingApproval: waitingApproval.length,
      },
      executions: enrichedExecutions,
    })
  } catch (err: any) {
    console.error("[Active Executions API Error]", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
