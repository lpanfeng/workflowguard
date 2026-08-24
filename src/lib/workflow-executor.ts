// WorkflowGuard — 工作流执行引擎（Runtime）
// 核心职责：管理多步骤工作流的生命周期、状态机、触发检测、步骤顺序执行
//
// 状态机：
//   idle → triggered → running → step_in_progress → step_completed → ... → completed | failed | cancelled
//                                                       ↓
//                                                  需要人工审批 → waiting_approval → approved → 继续下步
//                                                                                    ↓
//                                                                                rejected → failed
//
// 触发模式：
//   - manual: 用户手动触发
//   - event: 事件触发（webhook/polling）
//   - cron: 定时触发（cron 表达式）

import { createClient } from "@supabase/supabase-js"
import { getTemplateById, getApprovalStepConfig, type WorkflowStep, type ApproverConfig, type ApprovalStepConfig } from "./workflow-templates"

// ====================
// Types
// ====================

export type WorkflowTriggerType = "manual" | "event" | "cron"

export interface WorkflowTrigger {
  type: WorkflowTriggerType
  config?: {
    cronExpr?: string
    eventSource?: string
    eventType?: string
  }
}

export type ExecutionStatus =
  | "idle"
  | "triggered"
  | "running"
  | "step_in_progress"
  | "step_completed"
  | "waiting_approval"
  | "approved"
  | "retrying"
  | "completed"
  | "failed"
  | "cancelled"
  | "timed_out"
  | "paused"

/**
 * 多级审批状态跟踪
 */
export interface ApprovalLevelStatus {
  level: number
  /** 当前级别的审批状态 */
  status: "pending" | "approved" | "rejected"
  /** 审批人信息 */
  approver: ApproverConfig
  /** 实际处理人（审批时的 user_id） */
  handledBy?: string
  /** 审批意见 */
  comment?: string
  /** 审批时间 */
  handledAt?: string
}

export type BackoffType = "exponential" | "linear" | "fixed"

export interface StepExecution {
  stepId: string
  stepName: string
  stepType: WorkflowStep["type"]
  status: ExecutionStatus
  startedAt: string | null
  completedAt: string | null
  result?: unknown
  error?: string
  retryCount?: number       // 已重试次数
  maxRetries?: number       // 最大重试次数（默认 0）
  retryDelayMs?: number     // 重试间隔毫秒（默认 5000）
  backoffType?: BackoffType // 退避策略：exponential(指数) | linear(线性) | fixed(固定)
  timeoutMs?: number         // 步骤超时毫秒（默认 60000）
  durationMs?: number        // 实际执行耗时（毫秒）
  /** 详细错误上下文 */
  errorContext?: {
    stepName: string
    stepId: string
    parameters?: Record<string, unknown>
    errorMessage: string
    stackTrace?: string
    timestamp: string
  }
  /** 多级审批状态 */
  approvalStatus?: ApprovalLevelStatus[]
  /** 当前等待哪一级审批（0-indexed） */
  currentApprovalLevel?: number
}

export interface WorkflowExecution {
  id: string
  workflowId: string
  userId: string
  trigger: WorkflowTrigger
  status: ExecutionStatus
  currentStepIndex: number
  steps: StepExecution[]
  inputData: Record<string, unknown>
  outputData: Record<string, unknown>
  startedAt: string
  completedAt: string | null
  error?: string
}

// ====================
// Supabase Admin Client
// ====================

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

// ====================
// 执行引擎
// ====================

export class WorkflowExecutor {
  private execution: WorkflowExecution | null = null

  /**
   * 触发一个工作流执行
   * 创建执行记录，开始一步步执行
   */
  async trigger(
    workflowId: string,
    userId: string,
    trigger: WorkflowTrigger,
    inputData: Record<string, unknown> = {}
  ): Promise<WorkflowExecution> {
    // 1. 获取工作流模板
    const { data: workflow, error: wfError } = await supabaseAdmin
      .from("workflows")
      .select("*")
      .eq("id", workflowId)
      .single()

    if (wfError || !workflow) {
      throw new Error(`工作流不存在: ${workflowId}`)
    }

    if (!workflow.is_active) {
      throw new Error(`工作流未激活: ${workflowId}`)
    }

    const template = getTemplateById(workflow.template_id)
    if (!template) {
      throw new Error(`模板不存在: ${workflow.template_id}`)
    }

    // 2. 初始化步执行状态
    const steps: StepExecution[] = template.steps.map((step, idx) => ({
      stepId: step.id,
      stepName: step.name,
      stepType: step.type,
      status: idx === 0 ? "triggered" : "idle",
      startedAt: idx === 0 ? new Date().toISOString() : null,
      completedAt: null,
    }))

    // 3. 写入数据库 execution 记录
    const { data: execRecord, error: execError } = await supabaseAdmin
      .from("workflow_executions")
      .insert({
        workflow_id: workflowId,
        user_id: userId,
        trigger_type: trigger.type,
        trigger_config: trigger.config ?? {},
        status: "running",
        current_step_index: 0,
        steps: steps,
        input_data: inputData,
        output_data: {},
        started_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (execError || !execRecord) {
      throw new Error(`创建执行记录失败: ${execError?.message}`)
    }

    this.execution = {
      id: execRecord.id,
      workflowId,
      userId,
      trigger,
      status: "running",
      currentStepIndex: 0,
      steps,
      inputData,
      outputData: {},
      startedAt: execRecord.started_at,
      completedAt: null,
    }

    // 4. 写入审计日志
    await supabaseAdmin.from("audit_logs").insert({
      user_id: userId,
      workflow_id: workflowId,
      action: "workflow_execution_started",
      details: {
        execution_id: execRecord.id,
        trigger_type: trigger.type,
        template_id: workflow.template_id,
        steps_count: template.steps.length,
      },
    })

    // 5. 开始执行第一步
    await this.executeNextStep()

    return this.execution
  }

  /**
   * 执行工作流的下一步
   * 根据当前步骤类型决定执行逻辑
   */
  async executeNextStep(): Promise<boolean> {
    if (!this.execution) throw new Error("没有正在进行的执行")

    const exec = this.execution
    const stepIndex = exec.currentStepIndex
    const step = exec.steps[stepIndex]

    if (!step) {
      // 所有步骤完成
      await this.completeExecution()
      return false
    }

    // 设置默认的重试和超时参数
    step.maxRetries = step.maxRetries ?? 0
    step.retryDelayMs = step.retryDelayMs ?? 5000
    step.backoffType = step.backoffType ?? "exponential"
    step.timeoutMs = step.timeoutMs ?? 60000
    step.retryCount = step.retryCount ?? 0

    // 更新状态
    step.status = "step_in_progress"
    step.startedAt = new Date().toISOString()
    await this.updateExecutionInDB({ current_step_index: stepIndex, steps: exec.steps })

    // 使用 Promise.race 实现超时控制
    const executeWithTimeout = async (): Promise<void> => {
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(
          () => reject(new Error(`步骤 "${step.stepName}" 执行超时 (${step.timeoutMs!}ms)`)),
          step.timeoutMs
        )
      )

      const executePromise = (async () => {
        switch (step.stepType) {
          case "action":
            await this.executeActionStep(step)
            break
          case "ai_execute":
            await this.executeAIStep(step)
            break
          case "human_approve":
            await this.waitForApproval(step)
            return // 等待审批，不继续下一步（特殊处理见下方）
          case "notify":
            await this.executeNotifyStep(step)
            break
        }
      })()

      await Promise.race([executePromise, timeoutPromise])
    }

    try {
      // 对 human_approve 不进行超时和重试（等待人工审批是无限期）
      if (step.stepType === "human_approve") {
        await this.waitForApproval(step)
        return true
      }

      await executeWithTimeout()

      // 步骤完成，进入下一步
      step.status = "step_completed"
      step.completedAt = new Date().toISOString()
      exec.currentStepIndex = stepIndex + 1

      await this.updateExecutionInDB({ current_step_index: stepIndex + 1, steps: exec.steps })

      // 递归执行下一步
      return this.executeNextStep()
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : "未知错误"
      const isTimeout = errorMsg.includes("执行超时")

      // 检查是否有重试机会
      if (step.retryCount! < step.maxRetries!) {
        step.retryCount!++
        step.status = "retrying"
        
        // 根据退避策略计算重试延迟
        let actualDelay: number
        switch (step.backoffType) {
          case "linear":
            // 线性退避：第1次5s，第2次10s，第3次15s...
            actualDelay = Math.min(step.retryDelayMs! * step.retryCount!, 60000)
            break
          case "fixed":
            // 固定间隔：每次都等 retryDelayMs
            actualDelay = step.retryDelayMs!
            break
          case "exponential":
          default:
            // 指数退避：第1次5s，第2次10s，第3次20s...
            const exponentialDelay = step.retryDelayMs! * Math.pow(2, step.retryCount! - 1)
            actualDelay = Math.min(exponentialDelay, 60000)
            break
        }
        
        step.error = `${isTimeout ? "超时" : "失败"} (第 ${step.retryCount}/${step.maxRetries} 次重试，等待 ${actualDelay}ms)`

        await this.updateExecutionInDB({
          status: "retrying" as ExecutionStatus,
          steps: exec.steps,
        })

        await supabaseAdmin.from("audit_logs").insert({
          user_id: exec.userId,
          workflow_id: exec.workflowId,
          action: "step_retrying",
          details: {
            execution_id: exec.id,
            step_index: stepIndex,
            step_name: step.stepName,
            step_type: step.stepType,
            retry_count: step.retryCount,
            max_retries: step.maxRetries,
            backoff_type: step.backoffType,
            delay_ms: actualDelay,
            error: errorMsg,
            is_timeout: isTimeout,
          },
        })

        // 等待重试间隔（指数退避）
        await new Promise((resolve) => setTimeout(resolve, actualDelay))

        // 重新执行当前步骤
        return this.executeNextStep()
      }

      // 重试用尽，标记为失败
      const finalStatus: ExecutionStatus = isTimeout ? "timed_out" : "failed"
      
      // 记录详细的错误上下文
      step.errorContext = {
        stepName: step.stepName,
        stepId: step.stepId,
        errorMessage: errorMsg,
        timestamp: new Date().toISOString(),
      }
      
      step.status = finalStatus
      step.error = errorMsg
      exec.status = finalStatus
      exec.error = errorMsg
      exec.completedAt = new Date().toISOString()

      await this.updateExecutionInDB({
        status: finalStatus,
        error: errorMsg,
        completed_at: exec.completedAt,
        steps: exec.steps,
      })

      await supabaseAdmin.from("audit_logs").insert({
        user_id: exec.userId,
        workflow_id: exec.workflowId,
        action: "workflow_execution_failed",
        details: {
          execution_id: exec.id,
          step_index: stepIndex,
          step_name: step.stepName,
          step_type: step.stepType,
          error: errorMsg,
          is_timeout: isTimeout,
          retries_exhausted: true,
          max_retries: step.maxRetries,
          error_context: step.errorContext,
        },
      })

      return false
    }
  }

  /**
   * 执行 action 类型步骤（如：接收输入、发送回复、写入存储等）
   */
  private async executeActionStep(step: StepExecution): Promise<void> {
    const exec = this.execution!
    // Execute action step
    switch (step.stepName) {
      case "接收咨询":
      case "确定主题":
      case "上传数据":
        // 输入步骤：input 已经在 inputData 中
        step.result = { received: true, data: exec.inputData }
        break

      case "发送回复":
        step.result = { sent: true, message: "回复已发送" }
        break

      case "发布":
        step.result = { published: true, platform: "目标平台" }
        break

      case "写入存储":
        step.result = { saved: true, data: exec.outputData }
        break

      default:
        step.result = { executed: true, stepName: step.stepName }
    }

    await supabaseAdmin.from("audit_logs").insert({
      user_id: exec.userId,
      workflow_id: exec.workflowId,
      action: "step_action_executed",
      details: {
        execution_id: exec.id,
        step_id: step.stepId,
        step_name: step.stepName,
        result: step.result,
      },
    })
  }

  /**
   * 执行 AI 步骤：创建任务并调用 AI 执行引擎
   */
  private async executeAIStep(step: StepExecution): Promise<void> {
    const exec = this.execution!
    // Execute AI step
    const { data: workflow } = await supabaseAdmin
      .from("workflows")
      .select("template_id")
      .eq("id", exec.workflowId)
      .single()

    // 记录AI调用开始时间
    const aiStartMs = Date.now()

    // 创建 AI 执行任务
    const { data: task, error: taskError } = await supabaseAdmin
      .from("tasks")
      .insert({
        workflow_id: exec.workflowId,
        user_id: exec.userId,
        type: workflow?.template_id ?? "unknown",
        status: "pending",
        title: `${exec.workflowId.slice(0, 8)} - ${step.stepName}`,
        input_data: exec.inputData,
        step_id: step.stepId,
        execution_id: exec.id,
      })
      .select()
      .single()

    if (taskError || !task) {
      throw new Error(`创建 AI 任务失败: ${taskError?.message}`)
    }

    // 写入审计日志：AI调用开始
    const modelUsed = process.env.DEEPSEEK_API_KEY ? "deepseek-chat" : "mock"
    await supabaseAdmin.from("audit_logs").insert({
      user_id: exec.userId,
      workflow_id: exec.workflowId,
      action: "ai_executed" as any,
      details: {
        execution_id: exec.id,
        step_id: step.stepId,
        step_name: step.stepName,
        task_id: task.id,
        model: modelUsed,
        status: "started",
        latency_ms: null,
      },
    })

    // 调用 AI 执行
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"
    const aiResponse = await fetch(`${appUrl}/api/ai/execute`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ taskId: task.id }),
    })

    const aiEndMs = Date.now()
    const latencyMs = aiEndMs - aiStartMs

    if (!aiResponse.ok) {
      // 记录AI调用失败
      await supabaseAdmin.from("audit_logs").insert({
        user_id: exec.userId,
        workflow_id: exec.workflowId,
        action: "ai_failed" as any,
        details: {
          execution_id: exec.id,
          step_id: step.stepId,
          step_name: step.stepName,
          task_id: task.id,
          model: modelUsed,
          status: "failed",
          latency_ms: latencyMs,
          error: `HTTP ${aiResponse.status}`,
        },
      })
      throw new Error(`AI 执行失败: ${aiResponse.status}`)
    }

    const aiResult = await aiResponse.json()
    step.result = aiResult

    // 记录AI调用完成
    await supabaseAdmin.from("audit_logs").insert({
      user_id: exec.userId,
      workflow_id: exec.workflowId,
      action: "ai_executed" as any,
      details: {
        execution_id: exec.id,
        step_id: step.stepId,
        step_name: step.stepName,
        task_id: task.id,
        model: modelUsed,
        status: aiResult.status ?? "completed",
        latency_ms: latencyMs,
        confidence: aiResult.result?.confidence,
        mode: aiResult.mode,
      },
    })

    // 如果 AI 执行后需要审批，暂停等待
    if (aiResult.status === "waiting_approval") {
      // Check if next step is human_approve type
      const nextStep = exec.steps[exec.currentStepIndex + 1]
      if (nextStep?.stepType === "human_approve") {
        // 不需要在这里做什么，让执行器正常进入下一步
        // 下一步会在 executeNextStep 中触发 waitForApproval
        step.status = "step_completed"
        step.completedAt = new Date().toISOString()
        step.result = { ...step.result as Record<string, unknown>, task_id: task.id }
        await this.updateExecutionInDB({ steps: exec.steps })
      }
    }
  }

  /**
   * 等待人工审批（支持多级审批链）
   */
  private async waitForApproval(step: StepExecution): Promise<void> {
    const exec = this.execution!

    // Initialize multi-level approval status
    const { data: workflow } = await supabaseAdmin
      .from("workflows")
      .select("template_id")
      .eq("id", exec.workflowId)
      .single()

    const templateId = workflow?.template_id ?? ""
    const template = getTemplateById(templateId)
    const approvalConfig = template ? getApprovalStepConfig(template, step.stepId) : null

    if (approvalConfig && approvalConfig.approvers.length > 0) {
      step.approvalStatus = approvalConfig.approvers.map((approver, idx) => ({
        level: idx,
        status: "pending" as const,
        approver,
      }))
      step.currentApprovalLevel = 0
      // Multi-level approval initialized
    } else {
      step.approvalStatus = [
        {
          level: 0,
          status: "pending" as const,
          approver: { type: "role" as const, role: "default", label: "默认审批人" },
        },
      ]
      step.currentApprovalLevel = 0
    }

    // 更新状态为 waiting_approval
    exec.status = "waiting_approval"
    step.status = "waiting_approval"

    await this.updateExecutionInDB({
      status: "waiting_approval" as ExecutionStatus,
      steps: exec.steps,
    })

    // 获取上一步（AI 步骤）创建的任务，如果有的话
    const previousStep = exec.steps[exec.currentStepIndex - 1]
    let taskId: string | null = null

    if (previousStep?.result && typeof previousStep.result === "object") {
      taskId = (previousStep.result as Record<string, unknown>).task_id as string || null
    }

    await supabaseAdmin.from("audit_logs").insert({
      user_id: exec.userId,
      workflow_id: exec.workflowId,
      action: "step_waiting_approval",
      details: {
        execution_id: exec.id,
        step_id: step.stepId,
        step_name: step.stepName,
        task_id: taskId,
        message: "请在工作流详情页审批或驳回这个步骤",
      },
    })

    // 发送飞书审批通知（如果用户已绑定飞书）
    try {
      if (taskId) {
        const { data: task } = await supabaseAdmin
          .from("tasks")
          .select("title, agent_result")
          .eq("id", taskId)
          .single()

        const { data: workflow } = await supabaseAdmin
          .from("workflows")
          .select("name")
          .eq("id", exec.workflowId)
          .single()

        if (task) {
          const { notifyApprovalNeeded } = await import("@/app/api/feishu/webhook/route")
          await notifyApprovalNeeded({
            userId: exec.userId,
            taskId,
            taskTitle: task.title,
            workflowName: workflow?.name ?? "未命名工作流",
            confidence: "medium",
            aiResult:
              typeof task.agent_result === "string"
                ? task.agent_result
                : JSON.stringify(task.agent_result ?? "AI 已处理"),
          })
        }
      }
    } catch (notifyErr) {
      // 飞书通知失败不影响主流程（例如未配置飞书环境变量）
      console.error("[Executor] 飞书审批通知发送失败（可忽略）:", notifyErr)
    }

    // 注意：这里不抛出错误，等待审批异步完成
    // 审批完成时通过 API 触发 resumeFromApproval
  }

  /**
   * 执行通知步骤
   */
  private async executeNotifyStep(step: StepExecution): Promise<void> {
    const exec = this.execution!

    step.result = {
      notified: true,
      message: `工作流 ${exec.workflowId} 步骤 ${step.stepName} 已完成`,
      channels: ["app_notification"],
    }

    await supabaseAdmin.from("audit_logs").insert({
      user_id: exec.userId,
      workflow_id: exec.workflowId,
      action: "step_notified",
      details: {
        execution_id: exec.id,
        step_id: step.stepId,
        step_name: step.stepName,
      },
    })
  }

  /**
   * 从审批中恢复执行（审批通过后调用，支持多级审批链）
   */
  async resumeFromApproval(
    stepId: string,
    approved: boolean,
    params?: {
      modifiedData?: unknown
      /** 审批人 user_id */
      reviewerId?: string
      /** 审批意见 */
      comment?: string
    }
  ): Promise<void> {
    if (!this.execution) throw new Error("没有正在进行的执行")

    const exec = this.execution
    const step = exec.steps.find((s) => s.stepId === stepId)

    if (!step) {
      throw new Error(`找不到步骤: ${stepId}`)
    }

    if (!["waiting_approval", "retrying"].includes(step.status)) {
      throw new Error(`步骤 ${stepId} 状态为 ${step.status}，无法恢复`)
    }

    const currentLevel = step.currentApprovalLevel ?? 0

    if (approved) {
      // 标记当前级别已通过
      if (step.approvalStatus && step.approvalStatus[currentLevel]) {
        step.approvalStatus[currentLevel].status = "approved"
        step.approvalStatus[currentLevel].handledBy = params?.reviewerId
        step.approvalStatus[currentLevel].comment = params?.comment
        step.approvalStatus[currentLevel].handledAt = new Date().toISOString()
      }

      // 检查是否还有下一级审批
      const totalLevels = step.approvalStatus?.length ?? 1
      const nextLevel = currentLevel + 1

      if (nextLevel < totalLevels && step.approvalStatus) {
        // 还有下一级，继续等待下一级审批
        step.currentApprovalLevel = nextLevel
        step.approvalStatus[nextLevel].status = "pending"
        exec.status = "waiting_approval"

        await this.updateExecutionInDB({
          status: "waiting_approval" as ExecutionStatus,
          steps: exec.steps,
        })

        // 获取工作流信息用于通知
        const { data: workflow } = await supabaseAdmin
          .from("workflows")
          .select("name")
          .eq("id", exec.workflowId)
          .single()

        // 发送飞书通知给下一级审批人
        await supabaseAdmin.from("audit_logs").insert({
          user_id: exec.userId,
          workflow_id: exec.workflowId,
          action: "approval_level_passed",
          details: {
            execution_id: exec.id,
            step_id: stepId,
            step_name: step.stepName,
            level: currentLevel,
            next_level: nextLevel,
            total_levels: totalLevels,
            approver_label: step.approvalStatus[nextLevel].approver.label,
          },
        })

        // Multi-level approval passed, continue waiting
        return // Continue waiting, don't proceed with workflow
      }

      // 所有级别审批通过，继续执行工作流
      step.status = "approved"
      step.completedAt = new Date().toISOString()
      step.result = params?.modifiedData ?? step.result

      exec.status = "running"
      exec.currentStepIndex = exec.steps.indexOf(step) + 1

      await this.updateExecutionInDB({
        status: "running" as ExecutionStatus,
        current_step_index: exec.currentStepIndex,
        steps: exec.steps,
      })

      await supabaseAdmin.from("audit_logs").insert({
        user_id: exec.userId,
        workflow_id: exec.workflowId,
        action: "approval_chain_completed",
        details: {
          execution_id: exec.id,
          step_id: stepId,
          step_name: step.stepName,
          total_levels: totalLevels,
          all_approved: true,
        },
      })

      // 继续执行下一步
      await this.executeNextStep()
    } else {
      // 驳回逻辑：根据 rejectStrategy 决定行为
      // 默认 reject_all：任一驳回即终止
      step.status = "failed"
      step.error = params?.comment
        ? `审批被驳回: ${params.comment}`
        : "审批被驳回"

      // 标记当前级别和所有待审批级别为 rejected
      if (step.approvalStatus) {
        step.approvalStatus[currentLevel].status = "rejected"
        step.approvalStatus[currentLevel].handledBy = params?.reviewerId
        step.approvalStatus[currentLevel].comment = params?.comment
        step.approvalStatus[currentLevel].handledAt = new Date().toISOString()

        // 标记后续级别也 rejected
        for (let i = currentLevel + 1; i < step.approvalStatus.length; i++) {
          step.approvalStatus[i].status = "rejected"
        }
      }

      exec.status = "failed"
      exec.error = step.error
      exec.completedAt = new Date().toISOString()

      await this.updateExecutionInDB({
        status: "failed" as ExecutionStatus,
        error: exec.error,
        completed_at: exec.completedAt,
        steps: exec.steps,
      })

      await supabaseAdmin.from("audit_logs").insert({
        user_id: exec.userId,
        workflow_id: exec.workflowId,
        action: "workflow_execution_rejected",
        details: {
          execution_id: exec.id,
          step_id: stepId,
          step_name: step.stepName,
          level: currentLevel,
          comment: params?.comment,
        },
      })
    }
  }

  /**
   * 完成执行
   */
  private async completeExecution(): Promise<void> {
    if (!this.execution) throw new Error("没有正在进行的执行")

    const exec = this.execution
    exec.status = "completed"
    exec.completedAt = new Date().toISOString()

    // 计算总耗时
    const totalDurationMs = new Date(exec.completedAt).getTime() - new Date(exec.startedAt).getTime()

    await this.updateExecutionInDB({
      status: "completed" as ExecutionStatus,
      completed_at: exec.completedAt,
    })

    await supabaseAdmin.from("audit_logs").insert({
      user_id: exec.userId,
      workflow_id: exec.workflowId,
      action: "workflow_execution_completed",
      details: {
        execution_id: exec.id,
        steps_count: exec.steps.length,
        total_duration_ms: totalDurationMs,
        completed_steps: exec.steps.filter(s => s.status === "completed" || s.status === "approved").length,
      },
    })

    // Workflow execution completed
  }

  /**
   * 更新数据库中的执行记录
   */
  private async updateExecutionInDB(
    update: {
      status?: ExecutionStatus
      current_step_index?: number
      currentStepIndex?: number
      steps?: StepExecution[]
      error?: string
      completed_at?: string | null
      output_data?: Record<string, unknown>
    }
  ): Promise<void> {
    const dbUpdate: Record<string, unknown> = {}

    if (update.status) dbUpdate.status = update.status
    if (update.current_step_index !== undefined) dbUpdate.current_step_index = update.current_step_index
    if (update.currentStepIndex !== undefined) dbUpdate.current_step_index = update.currentStepIndex
    if (update.steps) dbUpdate.steps = update.steps
    if (update.error) dbUpdate.error = update.error
    if (update.completed_at) dbUpdate.completed_at = update.completed_at
    if (update.output_data) dbUpdate.output_data = update.output_data

    await supabaseAdmin
      .from("workflow_executions")
      .update(dbUpdate)
      .eq("id", this.execution!.id)
  }

  /**
   * 暂停执行
   */
  async pauseExecution(): Promise<void> {
    if (!this.execution) throw new Error("没有正在进行的执行")

    this.execution.status = "paused"
    this.execution.completedAt = new Date().toISOString()

    await this.updateExecutionInDB({
      status: "paused" as ExecutionStatus,
      completed_at: this.execution.completedAt,
    })

    await supabaseAdmin.from("audit_logs").insert({
      user_id: this.execution.userId,
      workflow_id: this.execution.workflowId,
      action: "workflow_execution_paused",
      details: { execution_id: this.execution.id },
    })
    
    // Workflow paused
  }

  /**
   * 恢复暂停的执行
   */
  async resumeExecution(): Promise<void> {
    if (!this.execution) throw new Error("没有正在进行的执行")

    this.execution.status = "running"
    this.execution.completedAt = null

    await this.updateExecutionInDB({
      status: "running" as ExecutionStatus,
      completed_at: null,
    })

    await supabaseAdmin.from("audit_logs").insert({
      user_id: this.execution.userId,
      workflow_id: this.execution.workflowId,
      action: "workflow_execution_resumed",
      details: { execution_id: this.execution.id },
    })

    // 从当前步骤继续执行
    await this.executeNextStep()
  }

  /**
   * 取消执行
   */
  async cancelExecution(): Promise<void> {
    if (!this.execution) throw new Error("没有正在进行的执行")

    this.execution.status = "cancelled"
    this.execution.completedAt = new Date().toISOString()

    await this.updateExecutionInDB({
      status: "cancelled" as ExecutionStatus,
      completed_at: this.execution.completedAt,
    })

    await supabaseAdmin.from("audit_logs").insert({
      user_id: this.execution.userId,
      workflow_id: this.execution.workflowId,
      action: "workflow_execution_cancelled",
      details: { execution_id: this.execution.id },
    })
  }

  /**
   * 获取执行状态
   */
  getStatus(): WorkflowExecution | null {
    return this.execution
  }
}

// ====================
// 触发检测器
// ====================

export class WorkflowTriggerDetector {
  /**
   * 检查所有激活的工作流，判断是否满足触发条件
   * 可由 cron job 定期调用
   */
  static async checkTriggers(): Promise<void> {
    const { data: workflows, error } = await supabaseAdmin
      .from("workflows")
      .select("*")
      .eq("is_active", true)

    if (error || !workflows) {
      console.error("[TriggerDetector] 获取工作流失败:", error)
      return
    }

    for (const workflow of workflows) {
      const config = (workflow.config ?? {}) as { trigger?: WorkflowTrigger }

      if (!config.trigger || config.trigger.type === "manual") {
        continue // 手动触发不自动检测
      }

      // 检查上次执行时间，避免重复触发
      const { data: lastExec } = await supabaseAdmin
        .from("workflow_executions")
        .select("started_at")
        .eq("workflow_id", workflow.id)
        .order("started_at", { ascending: false })
        .limit(1)

      const shouldTrigger = await this.evaluateTriggerCondition(
        config.trigger,
        lastExec?.[0]?.started_at
      )

      if (shouldTrigger) {
        const executor = new WorkflowExecutor()
        await executor.trigger(workflow.id, workflow.user_id, config.trigger)
      }
    }
  }

  /**
   * 评估触发条件
   */
  private static async evaluateTriggerCondition(
    trigger: WorkflowTrigger,
    lastExecutedAt: string | undefined
  ): Promise<boolean> {
    switch (trigger.type) {
      case "cron":
        return this.evaluateCronCondition(trigger.config?.cronExpr, lastExecutedAt)
      case "event":
        // 事件触发由外部系统调用 API 触发
        return false
      default:
        return false
    }
  }

  /**
   * 简单的 cron 表达式评估
   * 支持每分钟（* * * * *）、每小时（0 * * * *）、每天（0 0 * * *）
   */
  private static evaluateCronCondition(
    cronExpr: string | undefined,
    lastExecutedAt: string | undefined
  ): boolean {
    if (!cronExpr) return false

    // 简单实现：检查是否离上次执行够久了
    if (!lastExecutedAt) return true

    const now = Date.now()
    const last = new Date(lastExecutedAt).getTime()
    const diffMinutes = (now - last) / 60000

    // 每小时的 cron 表达式最小间隔 55 分钟
    const parts = cronExpr.trim().split(/\s+/)
    if (parts[1] === "*" && parts[0] === "0") {
      // 每小时触发 -> 至少间隔 55 分钟
      return diffMinutes >= 55
    } else if (parts[1] === "*" && parts[0] === "*") {
      // 每分钟 -> 至少间隔 50 秒
      return diffMinutes >= 0.8
    } else if (parts[0] === "0" && parts[1] === "0") {
      // 每天 -> 至少间隔 23 小时
      return diffMinutes >= 23 * 60
    }

    return diffMinutes >= 50
  }
}

// ====================
// API Route Helper
// ====================

/**
 * 从任务审批 API 中恢复工作流执行
 * 当用户审批一个任务后，如果该任务属于某个工作流执行，则恢复执行
 */
export async function handleTaskApprovalResume(
  taskId: string,
  action: "approve" | "reject",
  userId: string,
  comment?: string,
  modifiedResult?: unknown
): Promise<void> {
  // 获取任务以找到关联的执行
  const { data: task } = await supabaseAdmin
    .from("tasks")
    .select("execution_id, step_id")
    .eq("id", taskId)
    .single()

  if (!task?.execution_id || !task?.step_id) return // 任务未关联执行

  // 获取执行记录
  const { data: execRecord } = await supabaseAdmin
    .from("workflow_executions")
    .select("*")
    .eq("id", task.execution_id)
    .single()

  if (!execRecord) return

  // 重建执行器状态
  const executor = new WorkflowExecutor()
  executor["execution"] = {
    id: execRecord.id,
    workflowId: execRecord.workflow_id,
    userId: execRecord.user_id,
    trigger: { type: execRecord.trigger_type as WorkflowTrigger["type"], config: execRecord.trigger_config },
    status: execRecord.status as ExecutionStatus,
    currentStepIndex: execRecord.current_step_index,
    steps: execRecord.steps as StepExecution[],
    inputData: execRecord.input_data as Record<string, unknown>,
    outputData: execRecord.output_data as Record<string, unknown>,
    startedAt: execRecord.started_at,
    completedAt: execRecord.completed_at,
  }

  await executor.resumeFromApproval(task.step_id, action === "approve", { modifiedData: modifiedResult })
}

// ====================
// 执行失败重试机制
// ====================

/**
 * 带重试的执行包装器
 * 支持指数退避、线性退避、固定退避三种策略
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelayMs: number = 1000,
  backoffType: BackoffType = 'exponential'
): Promise<T> {
  let lastError: Error | null = null

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))

      if (attempt >= maxRetries) {
        throw lastError
      }

      // 计算延迟
      let delayMs: number
      switch (backoffType) {
        case 'exponential':
          delayMs = baseDelayMs * Math.pow(2, attempt)
          break
        case 'linear':
          delayMs = baseDelayMs * (attempt + 1)
          break
        case 'fixed':
          delayMs = baseDelayMs
          break
        default:
          delayMs = baseDelayMs * Math.pow(2, attempt)
      }

      // 指数退避加随机抖动 (jitter)
      const jitter = Math.random() * delayMs * 0.5
      const totalDelay = delayMs + jitter

      console.warn(`[WorkflowGuard] 执行失败，${totalDelay.toFixed(0)}ms 后重试 (${attempt + 1}/${maxRetries}):`, lastError?.message)
      await new Promise(resolve => setTimeout(resolve, totalDelay))
    }
  }

  throw lastError!
}

/**
 * 步骤级重试：当单步执行失败时，自动重试并更新执行记录
 */
export async function executeStepWithRetry(
  step: StepExecution,
  executeFn: () => Promise<unknown>,
  maxRetries: number = 3,
  baseDelayMs: number = 2000
): Promise<StepExecution> {
  let currentStep = { ...step }
  let lastError: string | null = null

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const result = await executeFn()
      return {
        ...currentStep,
        status: 'step_completed',
        completedAt: new Date().toISOString(),
        result,
        retryCount: attempt,
      }
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error)
      currentStep.retryCount = (currentStep.retryCount ?? 0) + 1
      currentStep.error = lastError

      if (attempt >= maxRetries) {
        return {
          ...currentStep,
          status: 'failed',
          completedAt: new Date().toISOString(),
          error: lastError,
        }
      }

      // 等待后重试
      const delay = baseDelayMs * Math.pow(2, attempt)
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }

  return {
    ...currentStep,
    status: 'failed',
    completedAt: new Date().toISOString(),
    error: lastError,
  }
}
