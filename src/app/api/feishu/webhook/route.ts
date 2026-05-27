// WorkflowGuard — 飞书 Bot Webhook
// 接收飞书开放平台的事件回调（消息、审批操作等）

import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

// ====================
// 飞书卡片消息模板
// ====================

interface TaskApprovalCard {
  taskId: string
  taskTitle: string
  workflowName: string
  confidence: string
  aiResult: string
  createdAt: string
}

/**
 * 生成任务待审批的飞书消息卡片
 */
function buildApprovalCard(data: TaskApprovalCard) {
  return {
    msg_type: "interactive",
    content: JSON.stringify({
      config: { wide_screen_mode: true },
      header: {
        title: { tag: "plain_text", content: "📋 任务待审批" },
        template: "orange",
      },
      elements: [
        {
          tag: "div",
          text: {
            tag: "lark_md",
            content: `**${data.taskTitle}**\n\n工作流：${data.workflowName}\n置信度：${data.confidence}\n创建时间：${data.createdAt}`,
          },
        },
        {
          tag: "div",
          text: {
            tag: "lark_md",
            content: `**AI 生成结果：**\n${data.aiResult.slice(0, 500)}`,
          },
        },
        {
          tag: "action",
          actions: [
            {
              tag: "button",
              text: { tag: "plain_text", content: "✅ 通过" },
              type: "primary",
              value: { action: "approve", task_id: data.taskId },
            },
            {
              tag: "button",
              text: { tag: "plain_text", content: "❌ 驳回" },
              type: "danger",
              value: { action: "reject", task_id: data.taskId },
            },
          ],
        },
      ],
    }),
  }
}

/**
 * 构建审批结果通知卡片
 */
function buildResultCard(params: {
  taskTitle: string
  action: "approved" | "rejected"
  comment?: string
}) {
  const isApproved = params.action === "approved"
  return {
    msg_type: "interactive",
    content: JSON.stringify({
      config: { wide_screen_mode: true },
      header: {
        title: {
          tag: "plain_text",
          content: isApproved ? "✅ 任务已通过审批" : "❌ 任务已被驳回",
        },
        template: isApproved ? "green" : "red",
      },
      elements: [
        {
          tag: "div",
          text: {
            tag: "lark_md",
            content: `**${params.taskTitle}**\n\n审批结果：${isApproved ? "已通过 ✅" : "已驳回 ❌"}\n${params.comment ? `审批意见：${params.comment}` : ""}`,
          },
        },
      ],
    }),
  }
}

/**
 * 发送飞书消息（通过飞书开放平台 API）
 */
async function sendFeishuMessage(
  receiveId: string,
  receiveIdType: "open_id" | "user_id" | "chat_id",
  cardPayload: object
) {
  const appId = process.env.FEISHU_APP_ID
  const appSecret = process.env.FEISHU_APP_SECRET

  if (!appId || !appSecret) {
    console.warn("[Feishu Bot] 未配置 FEISHU_APP_ID / FEISHU_APP_SECRET，跳过消息发送")
    return null
  }

  try {
    // 1. 获取 tenant_access_token
    const tokenRes = await fetch("https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ app_id: appId, app_secret: appSecret }),
    })
    const tokenData = await tokenRes.json()
    if (!tokenData.tenant_access_token) {
      throw new Error(`获取 tenant_access_token 失败: ${JSON.stringify(tokenData)}`)
    }

    // 2. 发送消息
    const msgRes = await fetch(
      `https://open.feishu.cn/open-apis/im/v1/messages?receive_id_type=${receiveIdType}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${tokenData.tenant_access_token}`,
        },
        body: JSON.stringify({
          receive_id: receiveId,
          ...cardPayload,
        }),
      }
    )
    const msgData = await msgRes.json()
    if (msgData.code !== 0) {
      console.error("[Feishu Bot] 消息发送失败:", msgData)
      return null
    }
    console.log("[Feishu Bot] 消息发送成功:", msgData.data?.message_id)
    return msgData.data
  } catch (err) {
    console.error("[Feishu Bot] 发送消息出错:", err)
    return null
  }
}

/**
 * 获取用户的飞书 open_id（从 profiles 表查询 feishu_open_id 字段）
 */
async function getUserFeishuId(userId: string): Promise<string | null> {
  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("feishu_open_id")
    .eq("id", userId)
    .single()

  return profile?.feishu_open_id ?? null
}

/**
 * 通过飞书 open_id 查询绑定的 WorkflowGuard 用户
 */
async function getUserByFeishuOpenId(openId: string) {
  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("id, name, email, role")
    .eq("feishu_open_id", openId)
    .single()

  return profile
}

// ====================
// 消息指令处理
// ====================

async function handleMessageCommand(openId: string, text: string) {
  const user = await getUserByFeishuOpenId(openId)
  if (!user) {
    // 用户未绑定，发送绑定提示
    await sendFeishuMessage(openId, "open_id", {
      msg_type: "text",
      content: JSON.stringify({
        text: "⚠️ 您尚未绑定 WorkflowGuard 账号。\n请登录 WorkflowGuard → 设置 → 绑定飞书账号后重试。",
      }),
    })
    return
  }

  const cmd = text.trim()

  // 帮助指令
  if (cmd === "帮助" || cmd === "help" || cmd === "h") {
    await sendFeishuMessage(openId, "open_id", {
      msg_type: "text",
      content: JSON.stringify({
        text: `🤖 **WorkflowGuard 飞书 Bot 使用指南**

📋 **我的待审批** — 查看等待你审批的任务列表
✅ **通过 <任务ID>** — 批准某个任务
❌ **驳回 <任务ID> <原因>** — 驳回任务并附上原因
📊 **任务统计** — 查看今日任务概况
🔗 **登录控制台** — 打开 WorkflowGuard 控制台`,
      }),
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
      await sendFeishuMessage(openId, "open_id", {
        msg_type: "text",
        content: JSON.stringify({
          text: "🎉 没有待审批的任务，一切正常！",
        }),
      })
      return
    }

    const taskList = tasks
      .map(
        (t: any, i: number) =>
          `${i + 1}. [${t.id.slice(0, 8)}] ${t.title}\n   工作流：${t.workflows?.name ?? "—"} | ${new Date(t.created_at).toLocaleString("zh-CN")}`
      )
      .join("\n\n")

    await sendFeishuMessage(openId, "open_id", {
      msg_type: "text",
      content: JSON.stringify({
        text: `📋 **待审批任务（${tasks.length} 项）**\n\n${taskList}\n\n使用「通过 <任务ID>」或「驳回 <任务ID> <原因>」处理。`,
      }),
    })
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

    await sendFeishuMessage(openId, "open_id", {
      msg_type: "text",
      content: JSON.stringify({
        text: `📊 **今日任务统计**\n\n⏳ 待审批：${pending}\n✅ 今日通过：${approvedToday}\n❌ 今日驳回：${rejectedToday}`,
      }),
    })
    return
  }

  // 通过任务: "通过 <taskId>"
  const approveMatch = cmd.match(/^通过\s+(\S+)(?:\s+(.+))?/)
  if (approveMatch) {
    const taskId = approveMatch[1]
    const comment = approveMatch[2]
    return handleApprovalAction(openId, user.id, taskId, "approve", comment)
  }

  // 驳回任务: "驳回 <taskId> <原因>"
  const rejectMatch = cmd.match(/^驳回\s+(\S+)(?:\s+(.+))?/)
  if (rejectMatch) {
    const taskId = rejectMatch[1]
    const reason = rejectMatch[2] || "未提供原因"
    return handleApprovalAction(openId, user.id, taskId, "reject", reason)
  }

  // 打开控制台
  if (cmd === "登录控制台" || cmd === "控制台") {
    await sendFeishuMessage(openId, "open_id", {
      msg_type: "text",
      content: JSON.stringify({
        text: "🔗 WorkflowGuard 控制台：https://workflowguard.cn\n\n（请使用浏览器打开）",
      }),
    })
    return
  }

  // 未知指令
  await sendFeishuMessage(openId, "open_id", {
    msg_type: "text",
    content: JSON.stringify({
      text: `❓ 未知指令，输入「帮助」查看可用命令。`,
    }),
  })
}

/**
 * 处理审批操作（通过/驳回）
 */
async function handleApprovalAction(
  openId: string,
  userId: string,
  taskId: string,
  action: "approve" | "reject",
  comment?: string
) {
  // 调用审批 API
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/tasks/approve`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ taskId, action, userId, comment }),
    }
  )

  const data = await res.json()

  if (!data.success) {
    await sendFeishuMessage(openId, "open_id", {
      msg_type: "text",
      content: JSON.stringify({
        text: `⚠️ 操作失败：${data.error || "未知错误"}`,
      }),
    })
    return
  }

  const resultText =
    action === "approve" ? `✅ 任务已通过审批${comment ? `（意见：${comment}）` : ""}` : `❌ 任务已驳回（原因：${comment || "未提供"}）`

  await sendFeishuMessage(openId, "open_id", {
    msg_type: "text",
    content: JSON.stringify({
      text: resultText,
    }),
  })
}

/**
 * 处理飞书卡片按钮回调（通过/驳回）
 */
async function handleCardAction(
  openId: string,
  value: { action: string; task_id: string }
) {
  const user = await getUserByFeishuOpenId(openId)
  if (!user) {
    await sendFeishuMessage(openId, "open_id", {
      msg_type: "text",
      content: JSON.stringify({
        text: "⚠️ 您尚未绑定 WorkflowGuard 账号，无法处理审批。\n请登录 WorkflowGuard → 设置 → 绑定飞书账号。",
      }),
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
      // 发送通知给任务创建者
      const creatorOpenId = await getUserFeishuId(task.user_id)
      if (creatorOpenId && creatorOpenId !== openId) {
        await sendFeishuMessage(creatorOpenId, "open_id", {
          ...buildResultCard({
            taskTitle: task.title,
            action: value.action === "approve" ? "approved" : "rejected",
          }),
        })
      }
    }
  }
}

// ====================
// 公开 API
// ====================

/**
 * POST /api/feishu/webhook
 * 飞书开放平台事件回调入口
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // 飞书 URL Verification
    if (body.type === "url_verification") {
      return NextResponse.json({ challenge: body.challenge })
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
        console.log(`[Feishu Bot] 收到消息 from ${openId}: ${text.slice(0, 100)}`)
        // 异步处理，不阻塞响应
        handleMessageCommand(openId, text).catch((err) =>
          console.error("[Feishu Bot] 消息指令处理出错:", err)
        )
      }
    }

    // 处理卡片交互（审批按钮回调）
    if (body.header?.event_type === "card.action.trigger") {
      const action = body.event?.action
      const value = action?.value
      const openId = body.event?.operator?.open_id

      if (value?.action && value?.task_id && openId) {
        console.log(`[Feishu Bot] 卡片交互: ${value.action} task ${value.task_id} by ${openId}`)

        // 异步处理
        handleCardAction(openId, {
          action: value.action,
          task_id: value.task_id,
        }).catch((err) =>
          console.error("[Feishu Bot] 卡片交互处理出错:", err)
        )

        // 卡片按钮点击后立即更新卡片状态（防止重复点击）
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

    return NextResponse.json({ code: 0 })
  } catch (err) {
    console.error("[Feishu Bot] Webhook 处理出错:", err)
    return NextResponse.json({ code: 0 }) // 始终返回 200 以防飞书重试
  }
}

// ====================
// 外部调用接口（从其他 API 路由使用）
// ====================

/**
 * 发送任务待审批通知到飞书
 */
export async function notifyApprovalNeeded(params: {
  userId: string
  taskId: string
  taskTitle: string
  workflowName: string
  confidence: string
  aiResult: string
}) {
  const openId = await getUserFeishuId(params.userId)
  if (!openId) {
    console.log("[Feishu Bot] 用户未绑定飞书，跳过通知")
    return null
  }

  const card = buildApprovalCard({
    taskId: params.taskId,
    taskTitle: params.taskTitle,
    workflowName: params.workflowName,
    confidence: params.confidence,
    aiResult: params.aiResult,
    createdAt: new Date().toLocaleString("zh-CN"),
  })

  return sendFeishuMessage(openId, "open_id", card)
}

/**
 * 发送测试消息（用于测试飞书 Bot 连接）
 */
export async function sendTestMessage(openId: string) {
  return sendFeishuMessage(openId, "open_id", {
    msg_type: "text",
    content: JSON.stringify({
      text: "✅ WorkflowGuard 飞书 Bot 已连接！\n使用「创建任务 <描述>」来创建新任务。\n输入「帮助」查看更多指令。",
    }),
  })
}

export const dynamic = "force-dynamic"
