// WorkflowGuard — 删除工作流 API
// DELETE /api/workflows/[id] — 删除工作流及其关联数据

import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

export async function DELETE(
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

    // 1. 删除关联的 tasks
    await supabaseAdmin
      .from("tasks")
      .delete()
      .eq("workflow_id", workflowId)

    // 2. 删除关联的 workflow_executions
    await supabaseAdmin
      .from("workflow_executions")
      .delete()
      .eq("workflow_id", workflowId)

    // 3. 删除关联的 audit_logs
    await supabaseAdmin
      .from("audit_logs")
      .delete()
      .eq("workflow_id", workflowId)

    // 4. 删除工作流本身
    const { error } = await supabaseAdmin
      .from("workflows")
      .delete()
      .eq("id", workflowId)
      .eq("user_id", userId)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // 5. 记录审计日志
    await supabaseAdmin.from("audit_logs").insert({
      user_id: userId,
      workflow_id: workflowId,
      action: "workflow_deleted",
      details: { action: "delete" },
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error("[Delete Workflow API Error]", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
