// WorkflowGuard — 任务审批 API
// 支持通过/驳回，写入审计日志

import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { taskId, action, userId, comment, modifiedResult } = body

    if (!taskId || !action || !userId) {
      return NextResponse.json(
        { error: "缺少必填字段: taskId, action, userId" },
        { status: 400 }
      )
    }

    if (!["approve", "reject"].includes(action)) {
      return NextResponse.json({ error: "action 必须是 approve 或 reject" }, { status: 400 })
    }

    // 1. 获取任务
    const { data: task, error: taskError } = await supabaseAdmin
      .from("tasks")
      .select("*")
      .eq("id", taskId)
      .single()

    if (taskError || !task) {
      return NextResponse.json({ error: "任务不存在" }, { status: 404 })
    }

    if (task.status !== "waiting_approval") {
      return NextResponse.json(
        { error: `任务状态为 ${task.status}，无法审批` },
        { status: 400 }
      )
    }

    if (action === "approve") {
      // 批准
      await supabaseAdmin
        .from("tasks")
        .update({
          status: "approved",
          approved_result: modifiedResult ?? task.agent_result,
          approval_comment: comment ?? null,
          approved_at: new Date().toISOString(),
        })
        .eq("id", taskId)

      await supabaseAdmin.from("audit_logs").insert({
        user_id: userId,
        task_id: taskId,
        workflow_id: task.workflow_id,
        action: "task_approved",
        details: { comment, has_modifications: !!modifiedResult },
      })
    } else {
      // 驳回
      await supabaseAdmin
        .from("tasks")
        .update({
          status: "rejected",
          approved_result: null,
          approval_comment: comment ?? null,
          completed_at: new Date().toISOString(),
        })
        .eq("id", taskId)

      await supabaseAdmin.from("audit_logs").insert({
        user_id: userId,
        task_id: taskId,
        workflow_id: task.workflow_id,
        action: "task_rejected",
        details: { comment },
      })
    }

    return NextResponse.json({
      success: true,
      taskId,
      status: action === "approve" ? "approved" : "rejected",
    })
  } catch (err) {
    console.error("审批错误:", err)
    return NextResponse.json({ error: "审批处理失败" }, { status: 500 })
  }
}
