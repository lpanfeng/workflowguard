// WorkflowGuard — Email 通知服务
// 基于 Resend API 实现事务性邮件发送
// https://resend.com/docs/api-reference/introduction

export interface EmailOptions {
  to: string | string[]
  subject: string
  html: string
  text?: string
  from?: string
}

export interface NotificationEvent {
  userId: string
  userEmail: string
  userName: string
  type: "approval_needed" | "approved" | "rejected" | "completed"
  taskTitle: string
  taskId: string
  workflowName: string
  workflowTemplate: string
  comment?: string
}

const RESEND_API_KEY = process.env.RESEND_API_KEY
const DEFAULT_FROM = process.env.EMAIL_FROM || "WorkflowGuard <notifications@workflowguard.app>"
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"

/**
 * 发送事务性邮件 (Resend API)
 */
export async function sendEmail(options: EmailOptions): Promise<{ success: boolean; id?: string; error?: string }> {
  if (!RESEND_API_KEY) {
    console.warn("[Email] RESEND_API_KEY 未配置，跳过邮件发送")
    return { success: false, error: "RESEND_API_KEY not configured" }
  }

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: options.from || DEFAULT_FROM,
        to: Array.isArray(options.to) ? options.to : [options.to],
        subject: options.subject,
        html: options.html,
        text: options.text || stripHtml(options.html),
      }),
    })

    const data = await response.json()

    if (!response.ok) {
      return { success: false, error: data.message || "Resend API error" }
    }

    return { success: true, id: data.id }
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : "Unknown error"
    console.error("[Email] 发送失败:", errMsg)
    return { success: false, error: errMsg }
  }
}

/**
 * 发送审批需要处理的邮件通知
 */
export async function sendApprovalNeededEmail(event: NotificationEvent): Promise<{ success: boolean; id?: string }> {
  const subject = `[审批待处理] ${event.taskTitle} — ${event.workflowName}`
  const url = `${APP_URL}/tasks?highlight=${event.taskId}`

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 24px; max-width: 600px; margin: 0 auto;">
  <div style="margin-bottom: 24px;">
    <h1 style="font-size: 18px; color: #1a1a2e; margin: 0;">⚠️ 审批待处理</h1>
  </div>

  <div style="background: #f8f9fa; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
    <p style="margin: 0 0 4px; color: #666; font-size: 12px;">任务</p>
    <p style="margin: 0 0 16px; font-size: 16px; font-weight: 600;">${event.taskTitle}</p>

    <p style="margin: 0 0 4px; color: #666; font-size: 12px;">工作流</p>
    <p style="margin: 0 0 16px; font-size: 14px;">${event.workflowName}</p>

    <p style="margin: 0 0 4px; color: #666; font-size: 12px;">创建者</p>
    <p style="margin: 0 0 16px; font-size: 14px;">${event.userName}</p>

    <p style="margin: 0 0 4px; color: #666; font-size: 12px;">模板</p>
    <p style="margin: 0 0 16px; font-size: 14px;">${event.workflowTemplate}</p>
  </div>

  <a href="${url}" style="display: inline-block; background: #2563eb; color: white; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-size: 14px; font-weight: 500;">
    前往审批 →
  </a>

  <p style="margin-top: 24px; color: #999; font-size: 12px;">
    WorkflowGuard · 人机协作工作流平台<br>
    <a href="${APP_URL}" style="color: #666;">${APP_URL}</a>
  </p>
</body>
</html>`

  return sendEmail({ to: event.userEmail, subject, html })
}

/**
 * 发送审批结果通知
 */
export async function sendApprovalResultEmail(
  event: NotificationEvent,
  result: "approved" | "rejected"
): Promise<{ success: boolean; id?: string }> {
  const emoji = result === "approved" ? "✅" : "❌"
  const statusText = result === "approved" ? "已通过" : "已驳回"
  const subject = `${emoji} [${statusText}] ${event.taskTitle} — ${event.workflowName}`
  const url = `${APP_URL}/tasks?highlight=${event.taskId}`

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 24px; max-width: 600px; margin: 0 auto;">
  <div style="margin-bottom: 24px;">
    <h1 style="font-size: 18px; color: #1a1a2e; margin: 0;">
      ${result === "approved" ? "✅ 任务已通过" : "❌ 任务已驳回"}
    </h1>
  </div>

  <div style="background: ${result === "approved" ? "#f0fdf4" : "#fef2f2"}; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
    <p style="margin: 0 0 4px; color: #666; font-size: 12px;">任务</p>
    <p style="margin: 0 0 16px; font-size: 16px; font-weight: 600;">${event.taskTitle}</p>

    <p style="margin: 0 0 4px; color: #666; font-size: 12px;">工作流</p>
    <p style="margin: 0 0 16px; font-size: 14px;">${event.workflowName}</p>

    <p style="margin: 0 0 4px; color: #666; font-size: 12px;">处理人</p>
    <p style="margin: 0 0 16px; font-size: 14px;">${event.userName}</p>

    ${event.comment ? `
    <p style="margin: 0 0 4px; color: #666; font-size: 12px;">备注</p>
    <p style="margin: 0; font-size: 14px; font-style: italic;">"${event.comment}"</p>
    ` : ""}
  </div>

  <a href="${url}" style="display: inline-block; background: #2563eb; color: white; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-size: 14px; font-weight: 500;">
    查看详情 →
  </a>

  <p style="margin-top: 24px; color: #999; font-size: 12px;">
    WorkflowGuard · 人机协作工作流平台<br>
    <a href="${APP_URL}" style="color: #666;">${APP_URL}</a>
  </p>
</body>
</html>`

  return sendEmail({ to: event.userEmail, subject, html })
}

/**
 * 发送任务完成通知
 */
export async function sendTaskCompletedEmail(event: NotificationEvent): Promise<{ success: boolean; id?: string }> {
  const subject = `✅ 任务已完成: ${event.taskTitle}`
  const url = `${APP_URL}/tasks?highlight=${event.taskId}`

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 24px; max-width: 600px; margin: 0 auto;">
  <h1 style="font-size: 18px; margin: 0 0 16px;">✅ 任务已完成</h1>
  <p style="font-size: 16px; font-weight: 600; margin: 0 0 8px;">${event.taskTitle}</p>
  <p style="color: #666; margin: 0 0 20px;">在 ${event.workflowName} 中已完成全流程</p>
  <a href="${url}" style="display: inline-block; background: #2563eb; color: white; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-size: 14px;">
    查看详情 →
  </a>
</body>
</html>`

  return sendEmail({ to: event.userEmail, subject, html })
}

/**
 * 记录通知发送日志到数据库
 */
export async function logNotification(
  supabaseAdmin: any,
  params: {
    userId: string
    taskId: string | null
    type: "email" | "webhook" | "feishu"
    event: string
    recipient: string
    subject: string
    status: "sent" | "failed"
    errorMessage?: string
  }
): Promise<void> {
  try {
    await supabaseAdmin.from("notification_logs").insert({
      user_id: params.userId,
      task_id: params.taskId,
      type: params.type,
      event: params.event,
      recipient: params.recipient,
      subject: params.subject,
      status: params.status,
      error_message: params.errorMessage || null,
    })
  } catch (err) {
    console.error("[Email] 记录通知日志失败:", err)
  }
}

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, "")
    .replace(/\s+/g, " ")
    .trim()
}
