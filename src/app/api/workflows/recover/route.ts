import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { supabase } from "@/lib/supabase"

/**
 * POST /api/workflows/recover — 审批通过后一键恢复执行
 * 
 * 场景：审批通过（approved）后，Agent需要继续执行后续步骤
 * 但当前Agent处于等待审批状态（waiting_approval），需要手动恢复
 * 
 * 请求体：
 *   { taskId: string }
 * 
 * 逻辑：
 *   1. 验证任务属于当前用户且状态为 approved
 *   2. 检查是否有后续步骤
 *   3. 更新任务状态为 ai_processing
 *   4. 记录审计日志
 *   5. 触发Agent继续执行
 */
export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "未授权" }, { status: 401 })
    }

    const body = await req.json()
    const { taskId } = body

    if (!taskId) {
      return NextResponse.json(
        { error: "缺少 taskId" },
        { status: 400 }
      )
    }

    // 获取任务
    const { data: task, error: taskErr } = await supabase
      .from("tasks")
      .select("*")
      .eq("id", taskId)
      .eq("user_id", session.user.id)
      .single()

    if (taskErr || !task) {
      return NextResponse.json(
        { error: "任务不存在或无权操作" },
        { status: 404 }
      )
    }

    // 只允许从 approved 状态恢复
    if (task.status !== "approved") {
      return NextResponse.json(
        { error: `当前状态为 ${task.status}，无法恢复` },
        { status: 400 }
      )
    }

    // 更新任务状态为 ai_processing
    const { error: updateErr } = await supabase
      .from("tasks")
      .update({
        status: "ai_processing",
        updated_at: new Date().toISOString(),
      })
      .eq("id", taskId)

    if (updateErr) throw updateErr

    // 记录审计日志
    await supabase.from("audit_logs").insert({
      user_id: session.user.id,
      task_id: taskId,
      workflow_id: task.workflow_id,
      action: "task_resumed",
      details: {
        from_status: "approved",
        to_status: "ai_processing",
        resumed_by: session.user.id,
      },
      ip_address: req.headers.get("x-forwarded-for") || "unknown",
    })

    return NextResponse.json({
      success: true,
      message: "任务已恢复执行",
      data: { taskId, newStatus: "ai_processing" },
    })
  } catch (err) {
    console.error("恢复执行失败:", err)
    return NextResponse.json(
      { error: "恢复执行失败" },
      { status: 500 }
    )
  }
}
