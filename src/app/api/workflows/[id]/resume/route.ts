// WorkflowGuard — 恢复工作流 API
// POST /api/workflows/[id]/resume — 恢复工作流（is_active → true）

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

    // 更新工作流状态为激活
    const { error } = await supabaseAdmin
      .from("workflows")
      .update({ is_active: true })
      .eq("id", workflowId)
      .eq("user_id", userId)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // 记录审计日志
    await supabaseAdmin.from("audit_logs").insert({
      user_id: userId,
      workflow_id: workflowId,
      action: "workflow_resumed",
      details: { action: "resume" },
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error("[Resume Workflow API Error]", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
