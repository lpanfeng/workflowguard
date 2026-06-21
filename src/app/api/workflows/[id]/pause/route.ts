// WorkflowGuard — 暂停工作流 API (增强版)
// POST /api/workflows/[id]/pause — 暂停工作流 + 暂停正在进行的执行

import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { WorkflowExecutor } from "@/lib/workflow-executor"

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: workflowId } = await params
    const body = await request.json()
    const userId = body?.userId

    if (!userId) {
      return NextResponse.json({ error: "缺少 userId" }, { status: 400 })
    }

    // 1. 停用工作流（不再接受新触发）
    const { error: wfError } = await supabaseAdmin
      .from("workflows")
      .update({ is_active: false })
      .eq("id", workflowId)
      .eq("user_id", userId)

    if (wfError) {
      return NextResponse.json({ error: wfError.message }, { status: 500 })
    }

    // 2. 查找并暂停正在进行的执行
    const { data: activeExecutions, error: execError } = await supabaseAdmin
      .from("workflow_executions")
      .select("id, status, current_step_index, steps")
      .eq("workflow_id", workflowId)
      .in("status", ["running", "step_in_progress", "waiting_approval"])
      .order("started_at", { ascending: false })
      .limit(1)

    let pausedExecutionId: string | null = null

    if (!execError && activeExecutions && activeExecutions.length > 0) {
      const activeExec = activeExecutions[0]
      pausedExecutionId = activeExec.id

      // 保存暂停前的完整状态快照
      const pausedAt = new Date().toISOString()
      await supabaseAdmin
        .from("workflow_executions")
        .update({
          status: "paused" as any,
          completed_at: pausedAt,
          paused_at: pausedAt,
          current_step_index: activeExec.current_step_index,
        })
        .eq("id", activeExec.id)

      // 记录暂停的详细上下文
      const stepsSnapshot = activeExec.steps ? JSON.stringify(activeExec.steps) : null
      await supabaseAdmin.from("audit_logs").insert({
        user_id: userId,
        workflow_id: workflowId,
        action: "workflow_execution_paused",
        details: {
          execution_id: activeExec.id,
          paused_at: pausedAt,
          current_step_index: activeExec.current_step_index,
          steps_snapshot: stepsSnapshot,
        },
      })

      console.log(`[Pause] 工作流执行已暂停: ${workflowId} (${activeExec.id}), 当前步骤: ${activeExec.current_step_index}`)
    }

    // 3. 记录审计日志
    await supabaseAdmin.from("audit_logs").insert({
      user_id: userId,
      workflow_id: workflowId,
      action: "workflow_paused",
      details: {
        action: "pause",
        paused_executions: pausedExecutionId ? [pausedExecutionId] : [],
      },
    })

    return NextResponse.json({
      success: true,
      pausedExecution: pausedExecutionId
        ? { id: pausedExecutionId, status: "paused" }
        : null,
    })
  } catch (err) {
    console.error("[Pause Workflow API Error]", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
