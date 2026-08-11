/**
 * WorkflowGuard — Demo 数据设置工具
 * 
 * 为新用户创建丰富的演示数据，包括：
 * - 5个不同类型的工作流实例
 * - 示例任务和执行记录
 * 
 * 与 Supabase 触发器协同工作。
 */

import { supabase } from "./supabase"
import { WORKFLOW_TEMPLATES } from "./workflow-templates"

/** Demo 任务数据模板 */
const DEMO_TASKS = [
  {
    type: "customer_service",
    title: "客户咨询：退款流程",
    status: "waiting_approval" as const,
    aiResult: "根据退款政策，您的退款将在3-5个工作日内到账...",
    confidence: 0.87,
    createdAt: new Date(Date.now() - 1800000).toISOString(), // 30分钟前
  },
  {
    type: "customer_service",
    title: "客户咨询：物流查询",
    status: "ai_processing" as const,
    aiResult: null,
    confidence: null,
    createdAt: new Date(Date.now() - 3600000).toISOString(), // 1小时前
  },
  {
    type: "content_publish",
    title: "公众号文章：AI Agent趋势分析",
    status: "approved" as const,
    aiResult: "在AI Agent快速发展的今天，企业需要建立人机协作的治理框架...",
    confidence: 0.92,
    createdAt: new Date(Date.now() - 86400000).toISOString(), // 1天前
  },
  {
    type: "data_entry",
    title: "发票数据录入：2026-08-05",
    status: "completed" as const,
    aiResult: null,
    confidence: 0.95,
    createdAt: new Date(Date.now() - 172800000).toISOString(), // 2天前
  },
  {
    type: "customer_service",
    title: "客户投诉：产品质量问题",
    status: "rejected" as const,
    aiResult: "我们非常抱歉给您带来不便，以下是我们的解决方案...",
    confidence: 0.78,
    rejectReason: "表述不够专业，建议调整语气",
    createdAt: new Date(Date.now() - 259200000).toISOString(), // 3天前
  },
  {
    type: "content_publish",
    title: "技术博客：WorkflowGuard架构解析",
    status: "completed" as const,
    aiResult: "WorkflowGuard采用状态机驱动的工作流引擎...",
    confidence: 0.91,
    createdAt: new Date(Date.now() - 345600000).toISOString(), // 4天前
  },
]

/** Demo 工作流配置（5个实例） */
const DEMO_WORKFLOWS = [
  {
    templateId: "customer-service",
    name: "🎧 客服工单审批流 · 演示",
    description: "客户咨询 → AI自动生成回复草稿 → 人工审核 → 发送。日均处理120+工单，AI拦截率65%。",
    config: {
      trigger: "manual",
      steps: [
        { id: "input", name: "接收咨询", type: "action" },
        { id: "ai_draft", name: "AI 生成回复", type: "ai_execute" },
        { id: "approve", name: "人工审核", type: "human_approve" },
        { id: "send", name: "发送回复", type: "action" },
      ],
      approvalConfig: {
        approve: {
          levels: 1,
          approvers: [{ type: "role", role: "manager", label: "客服主管" }],
          mode: "sequential",
          rejectStrategy: "reject_all",
        },
      },
    },
  },
  {
    templateId: "content-publish",
    name: "📝 内容发布审批流 · 演示",
    description: "输入主题 → AI生成内容草稿 → 编辑审批 → 发布。支持多平台同步。",
    config: {
      trigger: "manual",
      steps: [
        { id: "input", name: "确定主题", type: "action" },
        { id: "ai_generate", name: "AI 生成内容", type: "ai_execute" },
        { id: "edit_approve", name: "编辑审批", type: "human_approve" },
        { id: "publish", name: "发布", type: "action" },
      ],
      approvalConfig: {
        edit_approve: {
          levels: 2,
          approvers: [
            { type: "role", role: "editor", label: "责任编辑" },
            { type: "role", role: "manager", label: "内容总监" },
          ],
          mode: "sequential",
          rejectStrategy: "reapprove",
        },
      },
    },
  },
  {
    templateId: "data-entry",
    name: "📊 数据录入审批流 · 演示",
    description: "上传文件/图片 → AI提取数据 → 人工确认 → 写入表格。支持CSV/PDF/图片。",
    config: {
      trigger: "manual",
      steps: [
        { id: "input", name: "上传数据", type: "action" },
        { id: "ai_extract", name: "AI 提取数据", type: "ai_execute" },
        { id: "confirm", name: "人工确认", type: "human_approve" },
        { id: "save", name: "写入存储", type: "action" },
      ],
      approvalConfig: {
        confirm: {
          levels: 1,
          approvers: [{ type: "user", label: "数据确认人" }],
          mode: "sequential",
          rejectStrategy: "reject_all",
        },
      },
    },
  },
  {
    templateId: "customer-service",
    name: "🎧 售后跟进审批流 · 演示",
    description: "售后问题 → AI分类 → 主管审批 → 分配处理。支持多级升级机制。",
    config: {
      trigger: "manual",
      steps: [
        { id: "input", name: "接收售后问题", type: "action" },
        { id: "ai_classify", name: "AI 问题分类", type: "ai_execute" },
        { id: "approve", name: "主管审批", type: "human_approve" },
        { id: "assign", name: "分配处理人", type: "action" },
        { id: "followup", name: "跟进确认", type: "action" },
      ],
      approvalConfig: {
        approve: {
          levels: 2,
          approvers: [
            { type: "role", role: "supervisor", label: "一线主管" },
            { type: "role", role: "manager", label: "部门经理" },
          ],
          mode: "sequential",
          rejectStrategy: "reapprove",
        },
      },
    },
  },
  {
    templateId: "content-publish",
    name: "📝 技术文档审核流 · 演示",
    description: "技术文档 → AI初审（格式/敏感词）→ 技术负责人审批 → 发布。支持代码片段审查。",
    config: {
      trigger: "manual",
      steps: [
        { id: "input", name: "提交文档", type: "action" },
        { id: "ai_review", name: "AI 初审", type: "ai_execute" },
        { id: "tech_approve", name: "技术负责人审批", type: "human_approve" },
        { id: "publish", name: "发布到知识库", type: "action" },
      ],
      approvalConfig: {
        tech_approve: {
          levels: 1,
          approvers: [{ type: "role", role: "tech_lead", label: "技术负责人" }],
          mode: "sequential",
          rejectStrategy: "reject_all",
        },
      },
    },
  },
]

/**
 * 为用户初始化丰富的 Demo 数据
 * @param userId 当前登录的用户 ID
 */
export async function ensureDemoData(userId: string): Promise<boolean> {
  try {
    // 1. 查询当前用户是否已有工作流
    const { data: existingWorkflows, error: queryError } = await supabase
      .from("workflows")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)

    if (queryError) {
      console.warn("[DemoSetup] 查询工作流失败:", queryError.message)
      return false
    }

    // 已经有工作流，跳过
    if (existingWorkflows && existingWorkflows.length > 0) {
      // 检查是否需要补充Demo任务
      const { count: taskCount } = await supabase
        .from("tasks")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId)

      if ((taskCount ?? 0) >= 3) {
        return false // 已有足够数据
      }
      // 补充Demo任务
      await createDemoTasks(userId)
      return true
    }

    // 2. 批量创建 Demo 工作流
    const workflowsToInsert = DEMO_WORKFLOWS.map((w) => ({
      user_id: userId,
      template_id: w.templateId,
      name: w.name,
      description: w.description,
      config: w.config,
      is_active: true,
    }))

    const { error: insertError } = await supabase
      .from("workflows")
      .insert(workflowsToInsert)

    if (insertError) {
      console.warn("[DemoSetup] 创建工作流失败:", insertError.message)
      return false
    }

    // 3. 创建 Demo 任务
    await createDemoTasks(userId)

    console.log("[DemoSetup] Demo数据创建完成")
    return true
  } catch (err) {
    console.error("[DemoSetup] 异常:", err)
    return false
  }
}

/**
 * 创建Demo任务数据
 */
async function createDemoTasks(userId: string): Promise<void> {
  const tasksToInsert = DEMO_TASKS.map((t) => ({
    user_id: userId,
    type: t.type,
    title: t.title,
    status: t.status,
    ai_result: t.aiResult,
    ai_confidence: t.confidence,
    reject_reason: t.rejectReason,
    created_at: t.createdAt,
    updated_at: t.createdAt,
  }))

  const { error } = await supabase.from("tasks").insert(tasksToInsert)
  if (error) {
    console.warn("[DemoSetup] 创建任务失败:", error.message)
  }
}

/**
 * 兼容旧版本：仅创建单个客服Demo工作流
 */
export async function ensureDemoWorkflow(userId: string): Promise<boolean> {
  return ensureDemoData(userId)
}
