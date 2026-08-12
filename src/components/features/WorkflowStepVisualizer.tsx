"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { supabase } from "@/lib/supabase"
import { Loader2, CheckCircle2, Clock, AlertTriangle, Bot, UserCheck, ArrowRight, ChevronRight } from "lucide-react"
import { WORKFLOW_TEMPLATES, type WorkflowTemplate } from "@/lib/workflow-templates"

type StepStatus = "pending" | "running" | "completed" | "failed" | "waiting_approval"

interface WorkflowStep {
  id: string
  name: string
  description: string
  type: "ai_execute" | "human_approve" | "notify" | "action"
  status?: StepStatus
  startedAt?: string
  completedAt?: string
  result?: any
  error?: string
  approver?: {
    type: "user" | "role"
    role?: string
    label?: string
  }
}

interface ExecutionRecord {
  id: string
  workflow_id: string
  status: string
  current_step_index: number
  steps: Array<{
    stepId: string
    stepName: string
    stepType: string
    status: string
    startedAt: string | null
    completedAt: string | null
    result?: any
    error?: string
  }>
  workflow?: {
    name: string
    template_id: string
  }
}

const STEP_TYPE_CONFIG = {
  ai_execute: { label: "AI 执行", icon: Bot, color: "bg-purple-100 text-purple-700 border-purple-200" },
  human_approve: { label: "人工审批", icon: UserCheck, color: "bg-amber-100 text-amber-700 border-amber-200" },
  notify: { label: "通知", icon: ArrowRight, color: "bg-blue-100 text-blue-700 border-blue-200" },
  action: { label: "操作", icon: CheckCircle2, color: "bg-slate-100 text-slate-700 border-slate-200" },
} as const

const STEP_STATUS_CONFIG = {
  pending: { label: "待执行", icon: Clock, color: "text-gray-400", bg: "bg-gray-50" },
  running: { label: "执行中", icon: Loader2, color: "text-blue-600", bg: "bg-blue-50", animate: true },
  completed: { label: "已完成", icon: CheckCircle2, color: "text-green-600", bg: "bg-green-50" },
  failed: { label: "失败", icon: AlertTriangle, color: "text-red-600", bg: "bg-red-50" },
  waiting_approval: { label: "待审批", icon: AlertTriangle, color: "text-amber-600", bg: "bg-amber-50" },
} as const

export function WorkflowStepVisualizer({ executionId, workflowId }: { executionId?: string, workflowId?: string }) {
  const [execution, setExecution] = useState<ExecutionRecord | null>(null)
  const [template, setTemplate] = useState<WorkflowTemplate | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (executionId) {
      loadExecution(executionId)
    } else if (workflowId) {
      loadWorkflowTemplate(workflowId)
    }
  }, [executionId, workflowId])

  const loadExecution = async (id: string) => {
    try {
      const { data, error } = await supabase
        .from("workflow_executions")
        .select(`
          *,
          workflow:workflows!inner (
            id,
            name,
            template_id
          )
        `)
        .eq("id", id)
        .single()

      if (error || !data) return

      setExecution(data)

      // 加载模板信息
      if (data.workflow?.template_id) {
        const tmpl = WORKFLOW_TEMPLATES.find(t => t.id === data.workflow.template_id)
        setTemplate(tmpl || null)
      }
    } catch (err) {
      console.error("加载执行记录失败:", err)
    } finally {
      setLoading(false)
    }
  }

  const loadWorkflowTemplate = async (workflowId: string) => {
    try {
      const { data: workflow } = await supabase
        .from("workflows")
        .select("template_id, name")
        .eq("id", workflowId)
        .single()

      if (workflow?.template_id) {
        const tmpl = WORKFLOW_TEMPLATES.find(t => t.id === workflow.template_id)
        setTemplate(tmpl || null)
      }
    } catch (err) {
      console.error("加载工作流失败:", err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center h-32">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!template && !execution) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-center text-muted-foreground">暂无工作流步骤信息</p>
        </CardContent>
      </Card>
    )
  }

  // 获取步骤列表
  const steps: WorkflowStep[] = execution?.steps?.map((s, idx) => ({
    id: s.stepId,
    name: s.stepName,
    description: s.stepName,
    type: s.stepType as WorkflowStep["type"],
    status: s.status as StepStatus,
    startedAt: s.startedAt || undefined,
    completedAt: s.completedAt || undefined,
    result: s.result,
    error: s.error,
  })) || template?.steps?.map(s => ({
    ...s,
    description: s.description || s.name,
    status: "pending" as StepStatus,
  })) || []

  // 确定当前步骤
  const currentStepIndex = execution?.current_step_index ?? 0
  const isCompleted = execution?.status === "completed"

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-primary" />
          工作流步骤
          {execution?.workflow?.name && (
            <Badge variant="secondary" className="ml-auto text-xs">
              {execution.workflow.name}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {steps.map((step, idx) => {
            const isCurrent = idx === currentStepIndex && !isCompleted
            const isPast = idx < currentStepIndex || isCompleted
            const config = STEP_TYPE_CONFIG[step.type]
            const StatusIcon = config.icon
            const stepStatus = execution?.steps?.[idx]?.status || step.status || "pending"
            const statusConfig = STEP_STATUS_CONFIG[stepStatus as keyof typeof STEP_STATUS_CONFIG] || STEP_STATUS_CONFIG["pending"]
            const StatusIconComp = statusConfig.icon

            return (
              <div key={step.id || idx} className="flex items-start gap-3">
                {/* 步骤序号和连接線 */}
                <div className="flex flex-col items-center">
                  <div className={`
                    w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium
                    ${isCurrent ? "bg-primary text-primary-foreground ring-2 ring-primary/20" : 
                      isPast ? "bg-green-500 text-white" : 
                      "bg-slate-100 text-slate-500 border-2 border-dashed border-slate-300"}
                  `}>
                    {isPast ? <CheckCircle2 className="h-4 w-4" /> : idx + 1}
                  </div>
                  {idx < steps.length - 1 && (
                    <div className={`w-0.5 h-8 ${isPast ? "bg-green-500" : "bg-slate-200"}`} />
                  )}
                </div>

                {/* 步骤内容 */}
                <div className="flex-1 pb-4">
                  <div className={`
                    rounded-lg border p-3 transition-all
                    ${isCurrent ? "border-primary/30 bg-primary/5 shadow-sm" : 
                      isPast ? "border-green-200 bg-green-50/50" : 
                      "border-slate-200 bg-slate-50"}
                  `}>
                    <div className="flex items-center gap-2 mb-1">
                      <Badge className={`${config.color} text-xs border-0`}>
                        <StatusIcon className="h-3 w-3 mr-1" />
                        {config.label}
                      </Badge>
                      {isCurrent && (
                        <Badge variant="outline" className="text-xs border-primary/30 text-primary animate-pulse">
                          <Loader2 className="h-3 w-3 mr-1" />
                          当前步骤
                        </Badge>
                      )}
                    </div>
                    <h4 className="font-medium text-sm">{step.name}</h4>
                    {step.description && (
                      <p className="text-xs text-muted-foreground mt-1">{step.description}</p>
                    )}
                    
                    {/* 状态信息 */}
                    {isPast && (
                      <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                        <StatusIconComp className="h-3 w-3" />
                        <span>{statusConfig.label}</span>
                        {step.completedAt && (
                          <span className="ml-auto">
                            {new Date(step.completedAt).toLocaleTimeString("zh-CN")}
                          </span>
                        )}
                      </div>
                    )}
                    
                    {/* 审批人信息 */}
                    {step.type === "human_approve" && (
                      <div className="mt-2 flex items-center gap-2 text-xs">
                        <UserCheck className="h-3 w-3 text-amber-600" />
                        <span className="text-amber-700">需要人工审批</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* 连接箭头 */}
                {idx < steps.length - 1 && (
                  <div className="pt-4 text-muted-foreground">
                    <ChevronRight className="h-4 w-4" />
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* 执行状态摘要 */}
        {execution && (
          <div className="mt-4 pt-4 border-t flex items-center gap-4 text-sm">
            <div className="flex items-center gap-2">
              <Badge className={
                execution.status === "completed" ? "bg-green-100 text-green-700" :
                execution.status === "failed" ? "bg-red-100 text-red-700" :
                execution.status === "waiting_approval" ? "bg-amber-100 text-amber-700" :
                "bg-blue-100 text-blue-700"
              }>
                {execution.status === "completed" && "已完成"}
                {execution.status === "failed" && "失败"}
                {execution.status === "waiting_approval" && "待审批"}
                {execution.status === "running" && "执行中"}
                {execution.status === "step_in_progress" && "步骤执行中"}
              </Badge>
            </div>
            {execution.steps && execution.steps[0]?.startedAt && (
              <span className="text-muted-foreground">
                开始于 {new Date(execution.steps[0].startedAt!).toLocaleString("zh-CN")}
              </span>
            )}
            {execution.steps && execution.steps[execution.steps.length - 1]?.completedAt && (
              <span className="text-muted-foreground">
                完成于 {new Date(execution.steps[execution.steps.length - 1].completedAt!).toLocaleString("zh-CN")}
              </span>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// 简化的步骤预览组件（用于列表页）
export function WorkflowStepsPreview({ workflowId }: { workflowId: string }) {
  const [template, setTemplate] = useState<WorkflowTemplate | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // 从模板ID查找（这里简化处理，实际应该从API获取）
    const tmpl = WORKFLOW_TEMPLATES.find(t => t.id === workflowId)
    if (tmpl) {
      setTemplate(tmpl)
    }
    setLoading(false)
  }, [workflowId])

  if (loading || !template) {
    return null
  }

  return (
    <div className="flex items-center gap-1 text-xs text-muted-foreground">
      {template.steps.map((step, idx) => (
        <div key={step.id} className="flex items-center gap-1">
          <Badge variant="outline" className="text-xs py-0 h-5">
            {step.name}
          </Badge>
          {idx < template.steps.length - 1 && (
            <ChevronRight className="h-3 w-3" />
          )}
        </div>
      ))}
    </div>
  )
}
