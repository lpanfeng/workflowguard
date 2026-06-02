// WorkflowGuard — 飞书消息通知模块
// 负责：发送文本消息、卡片消息、批量通知

import { feishuApi, type FeishuApiResponse, type FeishuConfig } from "./client"

// ====================
// 类型定义
// ====================

export type ReceiveIdType = "open_id" | "user_id" | "chat_id"

export interface MessageContent {
  text?: string
  card?: Record<string, unknown>
}

export interface SendMessageParams {
  receiveId: string
  receiveIdType: ReceiveIdType
  content: MessageContent
  config?: FeishuConfig
}

/**
 * 消息类型枚举
 */
export const MessageType = {
  TEXT: "text",
  INTERACTIVE: "interactive",
  POST: "post",
  IMAGE: "image",
  FILE: "file",
  AUDIO: "audio",
  MEDIA: "media",
  STICKER: "sticker",
} as const

// ====================
// 发送消息
// ====================

/**
 * 发送飞书消息
 */
export async function sendMessage(params: SendMessageParams): Promise<string | null> {
  const { receiveId, receiveIdType, content, config } = params

  let msgType: string
  let contentStr: string

  if (content.card) {
    msgType = MessageType.INTERACTIVE
    contentStr = JSON.stringify(content.card)
  } else if (content.text) {
    msgType = MessageType.TEXT
    contentStr = JSON.stringify({ text: content.text })
  } else {
    throw new Error("[Feishu Notification] 必须提供 text 或 card 内容")
  }

  try {
    const result = await feishuApi<FeishuApiResponse<{ message_id: string }>>(
      `/open-apis/im/v1/messages?receive_id_type=${receiveIdType}`,
      {
        method: "POST",
        body: {
          receive_id: receiveId,
          msg_type: msgType,
          content: contentStr,
        },
        config,
      }
    )

    if (result.code !== 0) {
      console.error("[Feishu Notification] 消息发送失败:", result)
      return null
    }

    console.log("[Feishu Notification] 消息发送成功:", result.data?.message_id)
    return result.data?.message_id ?? null
  } catch (err) {
    console.error("[Feishu Notification] 发送消息出错:", err)
    return null
  }
}

/**
 * 发送纯文本消息
 */
export async function sendTextMessage(
  receiveId: string,
  receiveIdType: ReceiveIdType,
  text: string,
  config?: FeishuConfig
): Promise<string | null> {
  return sendMessage({ receiveId, receiveIdType, content: { text }, config })
}

// ====================
// 审批卡片构建
// ====================

export interface TaskApprovalCardData {
  taskId: string
  taskTitle: string
  workflowName: string
  confidence: string
  aiResult: string
  createdAt: string
  submitterName?: string
  priority?: "high" | "medium" | "low"
}

/**
 * 构建任务待审批消息卡片
 */
export function buildApprovalCard(data: TaskApprovalCardData) {
  const priorityLabel =
    data.priority === "high" ? "🔴 高优先级" : data.priority === "low" ? "🟢 低优先级" : "🟡 普通"

  return {
    msg_type: "interactive",
    content: JSON.stringify({
      config: { wide_screen_mode: true },
      header: {
        title: { tag: "plain_text", content: "📋 任务待审批" },
        template: data.priority === "high" ? "red" : "orange",
      },
      elements: [
        {
          tag: "div",
          text: {
            tag: "lark_md",
            content: [
              `**${data.taskTitle}**`,
              ``,
              `📌 工作流：${data.workflowName}`,
              `👤 提交人：${data.submitterName ?? "系统"} (系统分配)`,
              `📊 置信度：${data.confidence}`,
              `🏷️ 优先级：${priorityLabel}`,
              `🕐 创建时间：${data.createdAt}`,
            ].join("\n"),
          },
        },
        {
          tag: "hr",
        },
        {
          tag: "div",
          text: {
            tag: "lark_md",
            content: `**AI 生成结果：**\n${data.aiResult.slice(0, 500)}`,
          },
        },
        {
          tag: "hr",
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
export function buildResultCard(params: {
  taskTitle: string
  action: "approved" | "rejected"
  comment?: string
  approverName?: string
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
            content: [
              `**${params.taskTitle}**`,
              ``,
              `审批结果：${isApproved ? "已通过 ✅" : "已驳回 ❌"}`,
              params.approverName ? `审批人：${params.approverName}` : "",
              params.comment ? `审批意见：${params.comment}` : "",
            ]
              .filter(Boolean)
              .join("\n"),
          },
        },
        {
          tag: "hr",
        },
        {
          tag: "note",
          elements: [
            {
              tag: "plain_text",
              content: "如有疑问，请登录 WorkflowGuard 控制台查看详情。",
            },
          ],
        },
      ],
    }),
  }
}

// ====================
// 群聊通知
// ====================

/**
 * 发送审批通知到群聊
 */
export async function notifyGroup(
  chatId: string,
  cardPayload: ReturnType<typeof buildApprovalCard>,
  config?: FeishuConfig
): Promise<string | null> {
  return sendMessage({
    receiveId: chatId,
    receiveIdType: "chat_id",
    content: { card: cardPayload },
    config,
  })
}
