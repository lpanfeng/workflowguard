// WorkflowGuard — 飞书审批回调 Webhook
// 接收飞书审批状态变更通知，自动更新任务状态

import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { parseApprovalCallback } from "@/lib/feishu/approval"

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // 飞书审批回调验证
    const challenge = body?.challenge as string | undefined
    if (challenge) {
      // 首次注册 webhook 时的挑战验证
      return NextResponse.json({ challenge })
    }

    // 解析审批回调事件
    const event = parseApprovalCallback(body)
    if (!event) {
      return NextResponse.json({ error: "无效的飞书审批回调格式" }, { status: 400 })
    }

    console.log(`[FeishuNotify] 收到审批回调: instance=${event.instance_code}, status=${event.status}`)

    // 根据审批结果更新任务状态
    if (event.status === "APPROVED") {
      // 审批通过：更新任务状态为 approved
      const { error: updateErr } = await supabaseAdmin
        .from("tasks")
        .update({
          status: "approved",
          updated_at: new Date().toISOString(),
        })
        .eq("feishu_instance_code", event.instance_code)

      if (updateErr) {
        console.error("[FeishuNotify] 更新任务状态失败:", updateErr)
      } else {
        console.log(`[FeishuNotify] ✅ 审批通过，任务已更新: ${event.instance_code}`)
      }

      // 记录审计日志
      await supabaseAdmin.from("audit_logs").insert({
        action: "approval_approved",
        entity_type: "task",
        entity_id: event.instance_code,
        user_id: event.user_id,
        details: {
          instance_code: event.instance_code,
          approval_code: event.approval_code,
          comment: event.comment,
        },
      })
    } else if (event.status === "REJECTED") {
      // 审批驳回：更新任务状态为 rejected
      const { error: updateErr } = await supabaseAdmin
        .from("tasks")
        .update({
          status: "rejected",
          updated_at: new Date().toISOString(),
        })
        .eq("feishu_instance_code", event.instance_code)

      if (updateErr) {
        console.error("[FeishuNotify] 更新任务状态失败:", updateErr)
      } else {
        console.log(`[FeishuNotify] ✅ 审批驳回，任务已更新: ${event.instance_code}`)
      }

      // 记录审计日志
      await supabaseAdmin.from("audit_logs").insert({
        action: "approval_rejected",
        entity_type: "task",
        entity_id: event.instance_code,
        user_id: event.user_id,
        details: {
          instance_code: event.instance_code,
          approval_code: event.approval_code,
          comment: event.comment,
          rejection_reason: event.comment,
        },
      })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error("[FeishuNotify] 处理回调失败:", err)
    return NextResponse.json({ error: "服务器内部错误" }, { status: 500 })
  }
}
