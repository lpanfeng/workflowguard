/**
 * WorkflowGuard — 新用户 Demo 设置工具
 * 
 * 检查用户是否已有工作流，如果没有则自动创建一个演示工作流。
 * 与 Supabase 触发器的 handle_new_user 协同工作。
 * 
 * 调用时机：用户首次登录并访问 dashboard 时
 */

import { supabase } from "./supabase"
import { WORKFLOW_TEMPLATES } from "./workflow-templates"

/**
 * 为用户初始化 Demo 工作流（仅在首次登录且无任何工作流时执行）
 * @param userId 当前登录的用户 ID
 */
export async function ensureDemoWorkflow(userId: string): Promise<boolean> {
  try {
    // 1. 查询当前用户是否有工作流
    const { data: workflows, error: queryError } = await supabase
      .from("workflows")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)

    if (queryError) {
      console.warn("[DemoSetup] 查询工作流失败:", queryError.message)
      return false
    }

    // 已经有工作流，跳过
    if (workflows && workflows.length > 0) {
      return false
    }

    // 2. 获取客服工单模板
    const template = WORKFLOW_TEMPLATES.find((t) => t.id === "customer-service")
    if (!template) {
      console.warn("[DemoSetup] 未找到客服工单模板")
      return false
    }

    // 3. 创建 Demo 工作流
    const { error: insertError } = await supabase.from("workflows").insert({
      user_id: userId,
      template_id: "customer-service",
      name: "📋 客服工单审批流 · 演示",
      description:
        "自动创建的演示工作流 — AI 生成回复草稿 → 人工审核 → 发送。点击查看详情并尝试运行。",
      config: {
        trigger: "manual",
        steps: template.steps.map((s) => ({
          id: s.id,
          name: s.name,
          type: s.type,
        })),
        approvalConfig: template.approvalConfig,
      },
      is_active: true,
    })

    if (insertError) {
      console.warn("[DemoSetup] 创建演示工作流失败:", insertError.message)
      return false
    }

    // Demo setup complete
    return true
  } catch (err) {
    console.error("[DemoSetup] 异常:", err)
    return false
  }
}
