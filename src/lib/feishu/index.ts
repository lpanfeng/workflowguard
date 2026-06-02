// WorkflowGuard — 飞书集成模块入口
// 导出所有飞书相关功能

export {
  getTenantAccessToken,
  clearTokenCache,
  feishuApi,
  getUserInfo,
  type FeishuConfig,
  type FeishuApiResponse,
} from "./client"

export {
  sendMessage,
  sendTextMessage,
  buildApprovalCard,
  buildResultCard,
  notifyGroup,
  type ReceiveIdType,
  type MessageContent,
  type TaskApprovalCardData,
  MessageType,
} from "./notification"

export {
  createApprovalInstance,
  getApprovalInstance,
  cancelApprovalInstance,
  parseApprovalCallback,
  type CreateApprovalParams,
  type ApprovalInstance,
  type ApprovalCallbackEvent,
} from "./approval"
