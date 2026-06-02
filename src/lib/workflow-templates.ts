// WorkflowGuard — 工作流模板定义
// MVP 阶段硬编码 3 个预设模板，后续支持自定义

export interface WorkflowStep {
  id: string
  name: string
  description: string
  type: 'ai_execute' | 'human_approve' | 'notify' | 'action'
}

// 审批人配置：支持指定审批人或审批角色
export interface ApproverConfig {
  type: 'user' | 'role'
  /** 当 type='user' 时，指定审批人的邮箱 */
  email?: string
  /** 当 type='user' 时，指定审批人的 ID */
  userId?: string
  /** 当 type='role' 时，指定角色名称（如 manager/finance/legal） */
  role?: string
  /** 显示名称 */
  label?: string
}

// 扩展审批步骤：支持多级审批链
export interface ApprovalStepConfig {
  /** 审批级数，默认为 1 */
  levels: number
  /** 每级审批人配置（长度为 levels） */
  approvers: ApproverConfig[]
  /** 审批模式：sequential（顺序审批）/ parallel（并行审批） */
  mode: 'sequential' | 'parallel'
  /** 驳回策略：reject_all（任一驳回即终止）/ reapprove（退回上一级重审） */
  rejectStrategy: 'reject_all' | 'reapprove'
}

export interface WorkflowTemplate {
  id: string
  name: string
  description: string
  icon: string
  category: string
  steps: WorkflowStep[]
  promptTemplate: string
  /** 审批步骤配置（按步骤 id 索引） */
  approvalConfig?: Record<string, ApprovalStepConfig>
}

export const WORKFLOW_TEMPLATES: WorkflowTemplate[] = [
  {
    id: 'customer-service',
    name: '客服工单审批流',
    description: '客户咨询 → AI 自动生成回复草稿 → 人工审核/修改 → 发送',
    icon: 'headphones',
    category: '客服',
    steps: [
      { id: 'input', name: '接收咨询', description: '接收客户咨询内容', type: 'action' },
      { id: 'ai_draft', name: 'AI 生成回复', description: 'AI 根据上下文生成回复草稿', type: 'ai_execute' },
      { id: 'approve', name: '人工审核', description: '审核 AI 生成的回复，可修改或驳回', type: 'human_approve' },
      { id: 'send', name: '发送回复', description: '确认后发送给客户', type: 'action' },
    ],
    promptTemplate: `你是一个专业的客服助手。
输入：{userInput}
客户上下文：{context}
任务：根据客户咨询内容，生成一个专业、礼貌的回复。
请输出以下格式：
1. 回复内容
2. 需要确认的关键信息
3. 置信度（高/中/低）`,
    approvalConfig: {
      'approve': {
        levels: 1,
        approvers: [{ type: 'role', role: 'manager', label: '客服主管' }],
        mode: 'sequential',
        rejectStrategy: 'reject_all',
      },
    },
  },
  {
    id: 'content-publish',
    name: '内容发布审批流',
    description: '输入主题 → AI 生成内容草稿 → 人工编辑/审批 → 发布',
    icon: 'file-text',
    category: '内容',
    steps: [
      { id: 'input', name: '确定主题', description: '输入内容主题和要点', type: 'action' },
      { id: 'ai_generate', name: 'AI 生成内容', description: 'AI 根据主题生成完整内容', type: 'ai_execute' },
      { id: 'edit_approve', name: '编辑审批', description: '编辑修改并确认内容', type: 'human_approve' },
      { id: 'publish', name: '发布', description: '发布到目标平台', type: 'action' },
    ],
    promptTemplate: `你是一个专业的内容创作助手。
主题：{topic}
要求：{requirements}
任务：生成一篇完整的内容草稿。
请输出：
1. 标题
2. 正文内容
3. 关键要点总结
4. 置信度（高/中/低）`,
    approvalConfig: {
      'edit_approve': {
        levels: 1,
        approvers: [{ type: 'role', role: 'editor', label: '责任编辑' }],
        mode: 'sequential',
        rejectStrategy: 'reject_all',
      },
    },
  },
  {
    id: 'data-entry',
    name: '数据录入审批流',
    description: '上传文件/图片 → AI 提取数据 → 人工确认 → 写入表格',
    icon: 'database',
    category: '数据',
    steps: [
      { id: 'input', name: '上传数据', description: '上传文件、图片或粘贴文本', type: 'action' },
      { id: 'ai_extract', name: 'AI 提取数据', description: 'AI 从文件中提取结构化数据', type: 'ai_execute' },
      { id: 'confirm', name: '人工确认', description: '确认提取的数据是否正确', type: 'human_approve' },
      { id: 'save', name: '写入存储', description: '将确认的数据保存到系统', type: 'action' },
    ],
    promptTemplate: `你是一个数据提取助手。
数据来源：{source}
内容：{content}
任务：从提供的内容中提取结构化数据。
请输出：
1. 提取的数据（表格形式）
2. 不确定的字段
3. 置信度（高/中/低）`,
    approvalConfig: {
      'confirm': {
        levels: 1,
        approvers: [{ type: 'user', label: '数据确认人' }],
        mode: 'sequential',
        rejectStrategy: 'reject_all',
      },
    },
  },
]

export function getTemplateById(id: string): WorkflowTemplate | undefined {
  return WORKFLOW_TEMPLATES.find((t) => t.id === id)
}

/**
 * 获取模板审批步骤的完整配置（含多级审批链信息）
 */
export function getApprovalStepConfig(
  template: WorkflowTemplate,
  stepId: string
): ApprovalStepConfig | null {
  return template.approvalConfig?.[stepId] ?? null
}
