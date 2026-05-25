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
    receive_id: "open_id", // 飞书用户 open_id
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
 * 发送飞书消息（通过飞书开放平台 API）
 */
async function sendFeishuMessage(openId: string, cardPayload: object) {
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
    const msgRes = await fetch("https://open.feishu.cn/open-apis/im/v1/messages?receive_id_type=open_id", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${tokenData.tenant_access_token}`,
      },
      body: JSON.stringify({
        receive_id: openId,
        ...cardPayload,
      }),
    })
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
 * 获取用户的飞书 open_id（从 profiles 表或直接传入）
 */
async function getUserFeishuId(userId: string): Promise<string | null> {
  // TODO: 从 profiles 表扩展 feishu_open_id 字段
  // 暂时返回 null，需要用户在 WorkflowGuard 中绑定飞书账号
  return null
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
        return NextResponse.json({ code: 0 }) // 不处理无效事件
      }

      const content = JSON.parse(message.content || "{}")
      const text = content.text || ""

      console.log(`[Feishu Bot] 收到消息 from ${sender.sender_id?.open_id}: ${text.slice(0, 100)}`)

      // TODO: 解析消息指令
      // - "创建任务 <描述>" → 调用 create task API
      // - "查看任务" → 列出待审批任务
      // - "帮助" → 显示帮助信息
    }

    // 处理卡片交互（审批按钮回调）
    if (body.header?.event_type === "card.action.trigger") {
      const action = body.event?.action
      const value = action?.value

      if (value?.action && value?.task_id) {
        console.log(`[Feishu Bot] 卡片交互: ${value.action} task ${value.task_id}`)
        // TODO: 调用 tasks/approve API
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

  return sendFeishuMessage(openId, card)
}

/**
 * 发送测试消息（用于测试飞书 Bot 连接）
 */
export async function sendTestMessage(openId: string) {
  return sendFeishuMessage(openId, {
    msg_type: "text",
    receive_id: openId,
    content: JSON.stringify({ text: "✅ WorkflowGuard 飞书 Bot 已连接！\n使用「创建任务 <描述>」来创建新任务。\n输入「帮助」查看更多指令。" }),
  })
}

export const dynamic = "force-dynamic"
