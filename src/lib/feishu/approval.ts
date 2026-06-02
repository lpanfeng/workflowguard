// WorkflowGuard — 飞书审批操作模块
// 负责：创建审批实例、查询审批结果、处理审批回调

import { feishuApi, type FeishuApiResponse, type FeishuConfig } from "./client"

// ====================
// 审批实例管理
// ====================

export interface CreateApprovalParams {
  /** 审批定义编码（需先在飞书后台创建） */
  approvalCode: string
  /** 审批发起人 user_id */
  userId: string
  /** 审批标题 */
  title: string
  /** 审批表单数据 */
  formData: Record<string, unknown>
  /** 审批人 user_id 列表 */
  approvers: string[]
  /** 抄送人 user_id 列表 */
  cc?: string[]
  /** 自定义链接（审批通知可附带跳转链接） */
  link?: { url: string; title: string }
}

export interface ApprovalInstance {
  instance_code: string
  status: "PENDING" | "APPROVED" | "REJECTED" | "CANCELED" | "DELETED"
  title: string
  serial_number: string
  start_time: number
  end_time?: number
  form_data: string
}

/**
 * 创建飞书审批实例
 */
export async function createApprovalInstance(
  params: CreateApprovalParams,
  config?: FeishuConfig
): Promise<string | null> {
  try {
    const result = await feishuApi<FeishuApiResponse<{ instance_code: string }>>(
      "/open-apis/approval/v4/instances",
      {
        method: "POST",
        body: {
          approval_code: params.approvalCode,
          user_id: params.userId,
          title: params.title,
          form: JSON.stringify(params.formData),
          node_approver_user_id_list: [params.approvers],
          cc_user_id_list: params.cc ?? [],
          ...(params.link
            ? { link: { url: params.link.url, title: params.link.title } }
            : {}),
        },
        config,
      }
    )

    if (result.code !== 0) {
      console.error("[Feishu Approval] 创建审批失败:", result)
      return null
    }

    return result.data?.instance_code ?? null
  } catch (err) {
    console.error("[Feishu Approval] 创建审批出错:", err)
    return null
  }
}

/**
 * 查询审批实例状态
 */
export async function getApprovalInstance(
  instanceCode: string,
  config?: FeishuConfig
): Promise<ApprovalInstance | null> {
  try {
    const result = await feishuApi<FeishuApiResponse<ApprovalInstance>>(
      `/open-apis/approval/v4/instances/${instanceCode}`,
      { config }
    )

    if (result.code !== 0) {
      console.error("[Feishu Approval] 查询审批失败:", result)
      return null
    }

    return result.data ?? null
  } catch (err) {
    console.error("[Feishu Approval] 查询审批出错:", err)
    return null
  }
}

/**
 * 取消审批实例
 */
export async function cancelApprovalInstance(
  instanceCode: string,
  userId: string,
  config?: FeishuConfig
): Promise<boolean> {
  try {
    const result = await feishuApi<FeishuApiResponse>(
      "/open-apis/approval/v4/instances/cancel",
      {
        method: "POST",
        body: {
          instance_code: instanceCode,
          user_id: userId,
        },
        config,
      }
    )

    return result.code === 0
  } catch (err) {
    console.error("[Feishu Approval] 取消审批出错:", err)
    return false
  }
}

// ====================
// 审批回调处理
// ====================

export interface ApprovalCallbackEvent {
  event_type: string
  approval_code: string
  instance_code: string
  status: "PENDING" | "APPROVED" | "REJECTED" | "TRANSFERRED"
  action_time: number
  user_id: string
  comment: string
}

/**
 * 解析飞书审批回调事件
 */
export function parseApprovalCallback(body: Record<string, unknown>): ApprovalCallbackEvent | null {
  try {
    const event = body.event as Record<string, unknown> | undefined
    if (!event) return null

    return {
      event_type: (event.event_type as string) ?? "",
      approval_code: (event.approval_code as string) ?? "",
      instance_code: (event.instance_code as string) ?? "",
      status: (event.status as ApprovalCallbackEvent["status"]) ?? "PENDING",
      action_time: (event.action_time as number) ?? 0,
      user_id: (event.user_id as string) ?? "",
      comment: (event.comment as string) ?? "",
    }
  } catch {
    return null
  }
}
