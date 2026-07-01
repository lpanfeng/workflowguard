// WorkflowGuard — 定时触发调度器
// 核心职责：定期扫描待执行的工作流，根据 cron 表达式自动触发执行

import { createClient } from "@supabase/supabase-js"
import { WorkflowExecutor } from "./workflow-executor"

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

/**
 * 解析简单 cron 表达式，返回下次执行时间
 * 支持格式：* * * * * (每分钟), 0 * * * * (每小时), 0 0 * * * (每天)
 */
export function parseSimpleCron(cronExpr: string): { minutes: number } | null {
  const parts = cronExpr.trim().split(/\s+/)
  if (parts.length < 5) return null

  // 每分钟: * * * * *
  if (parts.every(p => p === '*')) return { minutes: 1 }
  
  // 每小时: 0 * * * *
  if (parts[0] === '0' && parts[1] === '*') return { minutes: 60 }
  
  // 每天: 0 0 * * *
  if (parts[0] === '0' && parts[1] === '0') return { minutes: 60 * 24 }
  
  // 默认: 每50分钟
  return { minutes: 50 }
}

/**
 * 检查工作流是否需要触发
 */
export async function shouldTriggerWorkflow(
  workflowId: string,
  cronExpr: string
): Promise<boolean> {
  const parsed = parseSimpleCron(cronExpr)
  if (!parsed) return false

  // 获取最近一次执行时间
  const { data: lastExec } = await supabaseAdmin
    .from("workflow_executions")
    .select("started_at")
    .eq("workflow_id", workflowId)
    .order("started_at", { ascending: false })
    .limit(1)

  if (!lastExec?.[0]?.started_at) return true // 从未执行过

  const now = Date.now()
  const last = new Date(lastExec[0].started_at).getTime()
  const diffMinutes = (now - last) / 60000

  return diffMinutes >= parsed.minutes
}

/**
 * 扫描所有需要触发的定时工作流
 * 这个方法可以被 cron job 或 edge function 定期调用
 * @param force - 如果为 true，忽略间隔检查，强制触发所有 cron 类型工作流
 */
export async function scanAndTriggerScheduledWorkflows(force: boolean = false): Promise<number> {
  const { data: workflows, error } = await supabaseAdmin
    .from("workflows")
    .select("*")
    .eq("is_active", true)

  if (error || !workflows) {
    console.error("[CronScheduler] 获取工作流失败:", error)
    return 0
  }

  let triggeredCount = 0
  const scannedCount = workflows.length

  for (const workflow of workflows) {
    const config = (workflow.config ?? {}) as { trigger?: { type: string; config?: { cronExpr?: string } } }
    
    if (!config.trigger || config.trigger.type !== 'cron') continue
    if (!config.trigger.config?.cronExpr) continue

    let needsTrigger = false
    if (force) {
      needsTrigger = true // 强制模式下忽略间隔检查
    } else {
      needsTrigger = await shouldTriggerWorkflow(workflow.id, config.trigger.config.cronExpr)
    }

    if (needsTrigger) {
      try {
        const executor = new WorkflowExecutor()
        await executor.trigger(
          workflow.id,
          workflow.user_id,
          { type: 'cron', config: config.trigger.config }
        )
        triggeredCount++
        console.log(`[CronScheduler] ✅ 定时触发工作流: ${workflow.name} (${workflow.id}), 触发间隔: ${config.trigger.config.cronExpr}`)
      } catch (err) {
        console.error(`[CronScheduler] ❌ 触发失败 ${workflow.id}:`, err)
      }
    }
  }

  console.log(`[CronScheduler] 扫描完成: ${scannedCount} 个工作流, ${triggeredCount} 个已触发`)
  return triggeredCount
}

/**
 * 设置工作流的定时触发
 */
export async function scheduleWorkflow(
  workflowId: string,
  cronExpr: string
): Promise<{ success: boolean; error?: string }> {
  const { data: existing, error: fetchErr } = await supabaseAdmin
    .from("workflows")
    .select("config")
    .eq("id", workflowId)
    .single()

  if (fetchErr) return { success: false, error: fetchErr.message }

  const existingConfig = (existing?.config as Record<string, unknown>) ?? {}
  const newConfig = {
    ...existingConfig,
    trigger: { type: 'cron' as const, config: { cronExpr } },
  }

  const { error } = await supabaseAdmin
    .from("workflows")
    .update({ config: newConfig })
    .eq("id", workflowId)

  if (error) return { success: false, error: error.message }
  return { success: true }
}

/**
 * 取消工作流的定时触发
 */
export async function unscheduleWorkflow(workflowId: string): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabaseAdmin
    .from("workflows")
    .update({
      config: {
        trigger: { type: 'manual' }
      } as Record<string, unknown>
    } as Record<string, unknown>)
    .eq("id", workflowId)

  if (error) return { success: false, error: error.message }
  return { success: true }
}
