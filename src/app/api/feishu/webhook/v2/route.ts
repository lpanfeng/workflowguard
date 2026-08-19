// WorkflowGuard — 飞书 Bot Webhook v2 (增强版)
// 新增功能:
// 1. 审批状态变更自动更新 execution 记录
// 2. 执行时间线增强 (记录审批时间戳)
// 3. 审批延迟统计 (从创建到审批的平均时长)
// 4. 幂等性保护 (防止重复处理)

import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import {
  sendMessage,
  buildApprovalCard,
  buildResultCard,
  MessageType,
} from "@/lib/feishu"

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

// ====================
// 幂等性保护
// ====================
const processedEvents = new Map<string, number>()
const IDEMPOTENCY_TTL = 5 * 60 * 1000 // 5分钟

function isDuplicate(eventId: string): boolean {
  const now = Date.now()
  const lastProcessed = processedEvents.get(eventId)
  if (lastProcessed && now - lastProcessed < IDEMPOTENCY_TTL) {
    return true
  }
  processedEvents.set(eventId, now)
  // 清理过期条目
  for (const [key, time] of processedEvents) {
    if (now - time > IDEMPOTENCY_TTL) {
      processedEvents.delete(key)
    }
  }
  return false
}

// ====================
// 用户飞书 ID 查询
// ====================

async function getUserFeishuId(userId: string): Promise<string | null> {
  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("feishu_open_id")
    .eq("id", userId)
    .single()
  return profile?.feishu_open_id ?? null
}

async function getUserByFeishuOpenId(openId: string) {
  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("id, name, email, role")
    .eq("feishu_open_id", openId)
    .single()
  return profile
}

// ====================
// 执行记录增强
// ====================

/**
 * 记录审批时间戳到 execution 表
 * 当审批完成时，更新 execution 的审批相关信息
 */
async function recordApprovalTimeline(
  taskId: string,
  action: "approve" | "reject",
  userId: string,
  comment?: string
) {
  try {
    // 获取任务信息
    const { data: task } = await supabaseAdmin
      .from("tasks")
      .select("workflow_id, created_at")
      .eq("id", taskId)
      .single()

    if (!task) return

    // 查找相关的 execution 记录
    const { data: execution } = await supabaseAdmin
      .from("executions")
      .select("id, approval_timestamp")
      .eq("workflow_id", task.workflow_id)
      .eq("status", "waiting_approval")
      .order("created_at", { ascending: false })
      .limit(1)
      .single()

    if (execution) {
      // 更新审批时间戳
      await supabaseAdmin
        .from("executions")
        .update({
          approval_timestamp: new Date().toISOString(),
          approved_by: userId,
          approval_action: action,
          approval_comment: comment ?? null,
          status: action === "approve" ? "completed" : "failed",
          completed_at: new Date().toISOString(),
        })
        .eq("id", execution.id)

      // 计算审批延迟
      if (task.created_at) {
        const createdTime = new Date(task.created_at).getTime()
        const approvalTime = Date.now()
        const delayMinutes = Math.round((approvalTime - createdTime) / 60000)
        
        // 记录审批延迟到 audit_logs
        await supabaseAdmin.from("audit_logs").insert({
          user_id: userId,
          task_id: taskId,
          workflow_id: task.workflow_id,
          action: `approval_${action}_timed`,
          details: {
            delay_minutes: delayMinutes,
            comment,
            execution_id: execution.id,
          },
        })
      }
    }
  } catch (err) {
    console.error("[Feishu v2] 记录审批时间线失败:", err)
  }
}

/**
 * 获取审批延迟统计
 */
async function getApprovalDelayStats(userId: string, days: number = 7) {
  try {
    const since = new Date()
    since.setDate(since.getDate() - days)

    const { data: logs } = await supabaseAdmin
      .from("audit_logs")
      .select("details, created_at")
      .eq("user_id", userId)
      .gte("created_at", since.toISOString())
      .like("action", "approval_%_timed")

    if (!logs || logs.length === 0) return null

    const delays = logs
      .map((l: any) => l.details?.delay_minutes)
      .filter((d: number) => typeof d === "number")

    if (delays.length === 0) return null

    const avgDelay = delays.reduce((a: number, b: number) => a + b, 0) / delays.length
    const minDelay = Math.min(...delays)
    const maxDelay = Math.max(...delays)

    return {
      count: delays.length,
      avg_minutes: Math.round(avgDelay),
      min_minutes: minDelay,
      max_minutes: maxDelay,
    }
  } catch {
    return null
  }
}

// ====================
// 消息指令处理
// ====================

async function handleMessageCommand(openId: string, text: string) {
  const user = await getUserByFeishuOpenId(openId)
  if (!user) {
    await sendMessage({
      receiveId: openId,
      receiveIdType: "open_id",
      content: {
        text: "⚠️ 您尚未绑定 WorkflowGuard 账号。\n请登录 WorkflowGuard → 设置 → 绑定飞书账号后重试。",
      },
    })
    return
  }

  const cmd = text.trim()

  // 帮助指令
  if (cmd === "帮助" || cmd === "help" || cmd === "h") {
    await sendMessage({
      receiveId: openId,
      receiveIdType: "open_id",
      content: {
        text: `🤖 **WorkflowGuard 飞书 Bot (增强版)**

📋 **我的待审批** — 查看等待你审批的任务列表
✅ **通过 <任务ID>** — 批准某个任务
❌ **驳回 <任务ID> <原因>** — 驳回任务并附上原因
📊 **任务统计** — 查看今日任务概况
⏱️ **审批延迟** — 查看平均审批耗时
🔗 **登录控制台** — 打开 WorkflowGuard 控制台`,
      },
    })
    return
  }

  // 查看待审批任务
  if (cmd === "我的待审批" || cmd === "待审批" || cmd === "待办") {
    const { data: tasks } = await supabaseAdmin
      .from("tasks")
      .select(`
        id, title, type, status, created_at, workflow_id,
        workflows!inner(name)
      `)
      .eq("user_id", user.id)
      .eq("status", "waiting_approval")
      .order("created_at", { ascending: false })
      .limit(10)

    if (!tasks || tasks.length === 0) {
      await sendMessage({
        receiveId: openId,
        receiveIdType: "open_id",
        content: { text: "🎉 没有待审批的任务，一切正常！" },
      })
      return
    }

    const taskList = tasks
      .map(
        (t: any, i: number) =>
          `${i + 1}. [${t.id.slice(0, 8)}] ${t.title}\n   工作流：${t.workflows?.name ?? "—"} | ${new Date(t.created_at).toLocaleString("zh-CN")}`
      )
      .join("\n\n")

    await sendMessage({
      receiveId: openId,
      receiveIdType: "open_id",
      content: {
        text: `📋 **待审批任务（${tasks.length} 项）**\n\n${taskList}\n\n使用「通过 <任务ID>」或「驳回 <任务ID> <原因>」处理。`,
      },
    })
    return
  }

  // 审批延迟统计
  if (cmd === "审批延迟" || cmd === "延迟统计" || cmd === "stat") {
    const stats = await getApprovalDelayStats(user.id, 7)
    if (stats) {
      await sendMessage({
        receiveId: openId,
        receiveIdType: "open_id",
        content: {
          text: `⏱️ **近7天审批延迟统计**\n\n📊 审批次数：${stats.count}\n⚡ 平均耗时：${stats.avg_minutes} 分钟\n🚀 最快：${stats.min_minutes} 分钟\n🐌 最慢：${stats.max_minutes} 分钟`,
        },
      })
    } else {
      await sendMessage({
        receiveId: openId,
        receiveIdType: "open_id",
        content: { text: "📊 近7天暂无审批记录。" },
      })
    }
    return
  }

  // 任务统计
  if (cmd === "任务统计" || cmd === "统计") {
    const today = new Date().toISOString().slice(0, 10)
    const [{ count: pending }, { count: approvedToday }, { count: rejectedToday }] =
      await Promise.all([
        supabaseAdmin
          .from("tasks")
          .select("*", { count: "exact", head: true })
          .eq("user_id", user.id)
          .eq("status", "waiting_approval"),
        supabaseAdmin
          .from("tasks")
          .select("*", { count: "exact", head: true })
          .eq("user_id", user.id)
          .eq("status", "approved")
          .gte("created_at", today),
        supabaseAdmin
          .from("tasks")
          .select("*", { count: "exact", head: true })
          .eq("user_id", user.id)
          .eq("status", "rejected")
          .gte("created_at", today),
      ])

    await sendMessage({
      receiveId: openId,
      receiveIdType: "open_id",
      content: {
        text: `📊 **今日任务统计**\n\n⏳ 待审批：${pending}\n✅ 今日通过：${approvedToday}\n❌ 今日驳回：${rejectedToday}`,
      },
    })
    return
  }

  // 通过任务
  const approveMatch = cmd.match(/^通过\s+(\S+)(?:\s+(.+))?/)
  if (approveMatch) {
    const taskId = approveMatch[1]
    const comment = approveMatch[2]
    return handleApprovalAction(openId, user.id, taskId, "approve", comment)
  }

  // 驳回任务
  const rejectMatch = cmd.match(/^驳回\s+(\S+)(?:\s+(.+))?/)
  if (rejectMatch) {
    const taskId = rejectMatch[1]
    const reason = rejectMatch[2] || "未提供原因"
    return handleApprovalAction(openId, user.id, taskId, "reject", reason)
  }

  // 打开控制台
  if (cmd === "登录控制台" || cmd === "控制台") {
    await sendMessage({
      receiveId: openId,
      receiveIdType: "open_id",
      content: {
        text: "🔗 WorkflowGuard 控制台：https://workflowguard.cn\n\n（请使用浏览器打开）",
      },
    })
    return
  }

  // 未知指令
  await sendMessage({
    receiveId: openId,
    receiveIdType: "open_id",
    content: {
      text: "❓ 未知指令，输入「帮助」查看可用命令。",
    },
  })
}

/**
 * 处理审批操作（通过/驳回）— 增强版
 */
async function handleApprovalAction(
  openId: string,
  userId: string,
  taskId: string,
  action: "approve" | "reject",
  comment?: string
) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
  const res = await fetch(`${appUrl}/api/tasks/approve`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ taskId, action, userId, comment }),
  })

  const data = await res.json()

  if (!data.success) {
    await sendMessage({
      receiveId: openId,
      receiveIdType: "open_id",
      content: {
        text: `⚠️ 操作失败：${data.error || "未知错误"}`,
      },
    })
    return
  }

  // 增强：记录审批时间线
  await recordApprovalTimeline(taskId, action, userId, comment)

  const resultText =
    action === "approve"
      ? `✅ 任务已通过审批${comment ? `（意见：${comment}）` : ""}`
      : `❌ 任务已驳回（原因：${comment || "未提供"}）`

  await sendMessage({
    receiveId: openId,
    receiveIdType: "open_id",
    content: { text: resultText },
  })
}

/**
 * 处理飞书卡片按钮回调（增强版）
 */
async function handleCardAction(
  openId: string,
  value: { action: string; task_id: string }
) {
  const user = await getUserByFeishuOpenId(openId)
  if (!user) {
    await sendMessage({
      receiveId: openId,
      receiveIdType: "open_id",
      content: {
        text: "⚠️ 您尚未绑定 WorkflowGuard 账号，无法处理审批。\n请登录 WorkflowGuard → 设置 → 绑定飞书账号。",
      },
    })
    return
  }

  await handleApprovalAction(openId, user.id, value.task_id, value.action as "approve" | "reject")

  // 卡片操作完成后发送结果通知给任务创建者
  if (value.action === "approve" || value.action === "reject") {
    const { data: task } = await supabaseAdmin
      .from("tasks")
      .select("title, user_id, workflows!inner(name)")
      .eq("id", value.task_id)
      .single()

    if (task) {
      const creatorOpenId = await getUserFeishuId(task.user_id)
      if (creatorOpenId && creatorOpenId !== openId) {
        const card = buildResultCard({
          taskTitle: task.title,
          action: value.action === "approve" ? "approved" : "rejected",
          approverName: user.name,
        })
        await sendMessage({
          receiveId: creatorOpenId,
          receiveIdType: "open_id",
          content: { card },
        })
      }
    }
  }
}

// ====================
// 公开 API
// ====================

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // 飞书 URL Verification
    if (body.type === "url_verification") {
      return NextResponse.json({ challenge: body.challenge })
    }

    // 生成事件ID用于幂等性检查
    const eventId = body.event?.header?.event_id || `${Date.now()}-${Math.random()}`
    if (isDuplicate(eventId)) {
      console.log("[Feishu v2] 重复事件，跳过:", eventId)
      return NextResponse.json({ code: 0 })
    }

    // 处理消息事件
    if (body.header?.event_type === "im.message.receive_v1") {
      const event = body.event
      const message = event.message
      const sender = event.sender

      if (!message || !sender) {
        return NextResponse.json({ code: 0 })
      }

      const content = JSON.parse(message.content || "{}")
      const text = content.text || ""
      const openId = sender.sender_id?.open_id

      if (openId && text) {
        handleMessageCommand(openId, text).catch((err) =>
          console.error("[Feishu v2] 消息指令处理出错:", err)
        )
      }
    }

    // 处理卡片交互（审批按钮回调）
    if (body.header?.event_type === "card.action.trigger") {
      const action = body.event?.action
      const value = action?.value
      const openId = body.event?.operator?.open_id

      if (value?.action && value?.task_id && openId) {
        handleCardAction(openId, {
          action: value.action,
          task_id: value.task_id,
        }).catch((err) =>
          console.error("[Feishu v2] 卡片交互处理出错:", err)
        )

        return NextResponse.json({
          code: 0,
          data: {
            card: {
              header: {
                title: {
                  tag: "plain_text",
                  content: value.action === "approve" ? "✅ 处理成功" : "❌ 已驳回",
                },
                template: value.action === "approve" ? "green" : "red",
              },
              elements: [
                {
                  tag: "div",
                  text: {
                    tag: "lark_md",
                    content: `操作已提交，正在处理...\n任务 ID: ${value.task_id}`,
                  },
                },
              ],
            },
          },
        })
      }
    }

    // 处理审批实例状态变更事件（飞书审批回调）
    if (body.header?.event_type === "approvals.approval.v1") {
      const event = body.event
      const instanceCode = event.instance_code
      const status = event.status
      
      console.log(`[Feishu v2] 审批实例状态变更: ${instanceCode} → ${status}`)
      
      // TODO: 根据 instanceCode 查找关联的 WFG 任务并更新状态
      // 这需要先在创建审批时记录 instance_code → task_id 的映射
    }

    return NextResponse.json({ code: 0 })
  } catch (err) {
    console.error("[Feishu v2] Webhook 处理出错:", err)
    return NextResponse.json({ code: 0 })
  }
}

export const dynamic = "force-dynamic"
