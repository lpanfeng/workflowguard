// WorkflowGuard — 恢复工作流 API (增强版)
// POST /api/workflows/[id]/resume — 恢复工作流 + 恢复暂停的执行

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

    // 1. 激活工作流
    const { error: wfError } = await supabaseAdmin
      .from("workflows")
      .update({ is_active: true })
      .eq("id", workflowId)
      .eq("user_id", userId)

    if (wfError) {
      return NextResponse.json({ error: wfError.message }, { status: 500 })
    }

    // 2. 查找并恢复暂停中的执行
    const { data: pausedExecutions, error: execError } = await supabaseAdmin
      .from("workflow_executions")
      .select("id, current_step_index, steps, input_data, output_data, started_at, completed_at, paused_at")
      .eq("workflow_id", workflowId)
      .eq("status", "paused")
      .order("completed_at", { ascending: false })
      .limit(1)

    let resumedExecutionId: string | null = null
    let resumedStepIndex: number | null = null

    if (!execError && pausedExecutions && pausedExecutions.length > 0) {
      const pausedExec = pausedExecutions[0]
      resumedExecutionId = pausedExec.id
      resumedStepIndex = pausedExec.current_step_index ?? 0

      const resumedAt = new Date().toISOString()

      // 恢复执行状态
      await supabaseAdmin
        .from("workflow_executions")
        .update({
          status: "running" as any,
          completed_at: null,
          resumed_at: resumedAt,
        })
        .eq("id", pausedExec.id)

      // 记录恢复的详细上下文
      await supabaseAdmin.from("audit_logs").insert({
        user_id: userId,
        workflow_id: workflowId,
        action: "workflow_execution_resumed",
        details: {
          execution_id: pausedExec.id,
          resumed_at: resumedAt,
          resumed_step_index: resumedStepIndex,
          was_paused_at: pausedExec.paused_at,
          pause_duration_seconds: pausedExec.paused_at
            ? Math.round((new Date(resumedAt).getTime() - new Date(pausedExec.paused_at).getTime()) / 1000)
            : null,
        },
      })

      console.log(`[Resume] 工作流执行已恢复: ${workflowId} (${pausedExec.id}), 从步骤 ${resumedStepIndex} 继续`)
    }

    // 3. 记录审计日志
    await supabaseAdmin.from("audit_logs").insert({
      user_id: userId,
      workflow_id: workflowId,
      action: "workflow_resumed",
      details: {
        action: "resume",
        resumed_executions: resumedExecutionId ? [resumedExecutionId] : [],
      },
    })

    return NextResponse.json({
      success: true,
      resumedExecution: resumedExecutionId
        ? {
            id: resumedExecutionId,
            status: "running",
            stepIndex: resumedStepIndex,
          }
        : null,
    })
  } catch (err) {
    console.error("[Resume Workflow API Error]", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
