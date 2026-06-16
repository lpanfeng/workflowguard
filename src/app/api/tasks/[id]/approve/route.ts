// WorkflowGuard — 任务审批 API
// POST /api/tasks/[id]/approve — 审批通过
// POST /api/tasks/[id]/reject — 审批驳回

import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

/**
 * POST /api/tasks/[id]/approve
 * 审批通过：标记任务为 approved，记录审计日志
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const taskId = (await params).id

  try {
    const body = await request.json()
    const { userId, comment } = body

    if (!userId) {
      return NextResponse.json({ error: "缺少 userId" }, { status: 400 })
    }

    // 1. 验证任务存在且属于该用户
    const { data: task, error: taskError } = await supabaseAdmin
      .from("tasks")
      .select("*")
      .eq("id", taskId)
      .eq("user_id", userId)
      .single()

    if (taskError || !task) {
      return NextResponse.json({ error: "任务不存在" }, { status: 404 })
    }

    // 2. 验证当前状态必须是 waiting_approval
    if (task.status !== "waiting_approval") {
      return NextResponse.json(
        { error: `任务当前状态为 ${task.status}，无法审批` },
        { status: 400 }
      )
    }

    // 3. 更新任务状态为 approved
    const now = new Date().toISOString()
    const { error: updateError } = await supabaseAdmin
      .from("tasks")
      .update({
        status: "approved",
        approved_at: now,
        approval_comment: comment || null,
        completed_at: now,
      })
      .eq("id", taskId)

    if (updateError) {
      console.error("[Approve Update Error]", updateError)
      return NextResponse.json({ error: "更新任务状态失败" }, { status: 500 })
    }

    // 4. 记录审计日志
    await supabaseAdmin.from("audit_logs").insert({
      user_id: userId,
      entity_type: "task",
      entity_id: taskId,
      action: "task_approved",
      details: {
        comment: comment || null,
        workflow_id: task.workflow_id,
        task_title: task.title,
      },
    })

    // 5. 如果工作流有下一步，触发下一步执行
    try {
      const { data: nextTasks } = await supabaseAdmin
        .from("tasks")
        .select("id")
        .eq("workflow_id", task.workflow_id)
        .eq("input_data->>previous_task_id", taskId)
        .in("status", ["pending", "waiting_approval"])
        .limit(1)

      if (nextTasks && nextTasks.length > 0) {
        // 自动触发下一步（如果是 AI 执行步骤）
        const nextTask = nextTasks[0]
        await supabaseAdmin
          .from("tasks")
          .update({ status: "running", started_at: now })
          .eq("id", nextTask.id)

        // 记录触发日志
        await supabaseAdmin.from("audit_logs").insert({
          user_id: userId,
          entity_type: "task",
          entity_id: nextTask.id,
          action: "task_triggered",
          details: {
            reason: "approval_chain",
            previous_task_id: taskId,
          },
        })
      }
    } catch (chainErr) {
      console.error("[Approval Chain Error]", chainErr)
      // 链式触发失败不影响审批本身
    }

    return NextResponse.json({
      success: true,
      task: {
        id: task.id,
        status: "approved",
        approved_at: now,
      },
    })
  } catch (err) {
    console.error("[Approve API Error]", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
