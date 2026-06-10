// WorkflowGuard — 通知发送 API
// 发送审批通知和结果通知，同时记录日志

import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { sendApprovalNeededEmail, sendApprovalResultEmail, sendTaskCompletedEmail, logNotification, NotificationEvent } from "@/lib/email"

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { type, taskId, userId, comment } = body

    if (!type || !taskId) {
      return NextResponse.json({ error: "缺少必填字段: type, taskId" }, { status: 400 })
    }

    // 获取任务信息
    const { data: task, error: taskError } = await supabaseAdmin
      .from("tasks")
      .select("*, workflows:workflow_id(name, template_id)")
      .eq("id", taskId)
      .single()

    if (taskError || !task) {
      return NextResponse.json({ error: "任务不存在" }, { status: 404 })
    }

    // 获取用户信息
    const targetUserId = userId || task.user_id
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("email, name, notification_email")
      .eq("id", targetUserId)
      .single()

    if (!profile) {
      return NextResponse.json({ error: "用户不存在" }, { status: 404 })
    }

    // 获取通知偏好
    const { data: prefs } = await supabaseAdmin
      .from("notification_preferences")
      .select("*")
      .eq("user_id", targetUserId)
      .single()

    if (prefs && !prefs.email_notifications) {
      return NextResponse.json({ skipped: true, reason: "邮件通知已禁用" })
    }

    if (prefs) {
      if (type === "approval_needed" && !prefs.email_on_approval_needed)
        return NextResponse.json({ skipped: true, reason: "审批待处理通知已禁用" })
      if (type === "approved" && !prefs.email_on_approved)
        return NextResponse.json({ skipped: true, reason: "审批通过通知已禁用" })
      if (type === "rejected" && !prefs.email_on_rejected)
        return NextResponse.json({ skipped: true, reason: "审批驳回通知已禁用" })
      if (type === "completed" && !prefs.email_on_completed)
        return NextResponse.json({ skipped: true, reason: "完成通知已禁用" })
    }

    const email = profile.notification_email || profile.email
    const event: NotificationEvent = {
      userId: targetUserId,
      userEmail: email,
      userName: profile.name || email,
      type: type as NotificationEvent["type"],
      taskTitle: task.title,
      taskId: task.id,
      workflowName: task.workflows?.name || "未知工作流",
      workflowTemplate: task.workflows?.template_id || "unknown",
      comment,
    }

    let result: { success: boolean; id?: string; error?: string }

    switch (type) {
      case "approval_needed":
        result = await sendApprovalNeededEmail(event)
        break
      case "approved":
      case "rejected":
        result = await sendApprovalResultEmail(event, type)
        break
      case "completed":
        result = await sendTaskCompletedEmail(event)
        break
      default:
        return NextResponse.json({ error: "不支持的通知类型" }, { status: 400 })
    }

    await logNotification(supabaseAdmin, {
      userId: targetUserId,
      taskId: task.id,
      type: "email",
      event: type,
      recipient: email,
      subject: "",
      status: result.success ? "sent" : "failed",
      errorMessage: result.error,
    })

    if (!result.success && result.error !== "RESEND_API_KEY not configured") {
      console.error(`[Email] 通知发送失败: ${result.error}`)
      return NextResponse.json({ success: false, error: result.error }, { status: 500 })
    }

    return NextResponse.json({
      success: result.success,
      id: result.id,
      recipient: email,
    })
  } catch (err) {
    console.error("[Email API 错误]", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
