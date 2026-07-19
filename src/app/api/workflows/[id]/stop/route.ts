// WorkflowGuard — 停止工作流执行 API
// POST /api/workflows/[id]/stop — 立即停止正在运行的工作流执行

import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

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

    // 1. 查找所有 running/step_in_progress/waiting_approval 状态的执行
    const { data: activeExecutions, error: execError } = await supabaseAdmin
      .from("workflow_executions")
      .select("id, status, current_step_index, started_at")
      .eq("workflow_id", workflowId)
      .in("status", ["running", "step_in_progress", "waiting_approval"])
      .order("started_at", { ascending: false })
      .limit(10)

    if (execError) {
      return NextResponse.json({ error: execError.message }, { status: 500 })
    }

    if (!activeExecutions || activeExecutions.length === 0) {
      return NextResponse.json({ 
        success: true, 
        message: "没有正在运行的执行需要停止",
        stoppedCount: 0 
      })
    }

    const stoppedIds: string[] = []
    const now = new Date().toISOString()

    for (const exec of activeExecutions) {
      const { error: updateError } = await supabaseAdmin
        .from("workflow_executions")
        .update({
          status: "stopped" as any,
          completed_at: now,
          stopped_at: now,
        })
        .eq("id", exec.id)

      if (!updateError) {
        stoppedIds.push(exec.id)
      }
    }

    // 2. 记录审计日志
    const { error: auditError } = await supabaseAdmin
      .from("audit_logs")
      .insert({
        user_id: userId,
        action: "workflow_stopped",
        entity_type: "workflow",
        entity_id: workflowId,
        details: JSON.stringify({ stopped_executions: stoppedIds }),
      })

    if (auditError) {
      console.error("Audit log insert failed:", auditError.message)
    }

    return NextResponse.json({
      success: true,
      message: `已停止 ${stoppedIds.length} 个执行`,
      stoppedCount: stoppedIds.length,
      stoppedExecutions: stoppedIds,
    })
  } catch (err: any) {
    console.error("Stop workflow error:", err)
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: 500 }
    )
  }
}
