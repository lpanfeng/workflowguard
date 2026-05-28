// WorkflowGuard — 工作流执行 API
// 触发工作流执行、查询执行状态

import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { WorkflowExecutor } from "@/lib/workflow-executor"
import type { WorkflowTrigger } from "@/lib/workflow-executor"

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

/**
 * POST /api/workflows/execute — 触发工作流执行
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { workflowId, userId, inputData, triggerType } = body

    if (!workflowId || !userId) {
      return NextResponse.json(
        { error: "缺少必填字段: workflowId, userId" },
        { status: 400 }
      )
    }

    // 验证工作流存在且激活
    const { data: workflow, error: wfError } = await supabaseAdmin
      .from("workflows")
      .select("*")
      .eq("id", workflowId)
      .single()

    if (wfError || !workflow) {
      return NextResponse.json({ error: "工作流不存在" }, { status: 404 })
    }

    if (!workflow.is_active) {
      return NextResponse.json({ error: "工作流未激活" }, { status: 400 })
    }

    // 构建触发配置
    const trigger: WorkflowTrigger = {
      type: triggerType ?? "manual",
      config: triggerType === "manual" ? undefined : (workflow.config as { trigger?: WorkflowTrigger })?.trigger?.config,
    }

    // 执行工作流
    const executor = new WorkflowExecutor()
    const execution = await executor.trigger(workflowId, userId, trigger, inputData ?? {})

    return NextResponse.json({
      success: true,
      execution: {
        id: execution.id,
        status: execution.status,
        currentStepIndex: execution.currentStepIndex,
        startedAt: execution.startedAt,
        steps: execution.steps.map((s) => ({
          stepId: s.stepId,
          stepName: s.stepName,
          stepType: s.stepType,
          status: s.status,
        })),
      },
    })
  } catch (err) {
    console.error("触发工作流执行错误:", err)
    const msg = err instanceof Error ? err.message : "触发执行失败"
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

/**
 * GET /api/workflows/execute?executionId=xxx — 查询执行状态
 * GET /api/workflows/execute?workflowId=xxx — 查询工作流最近执行
 */
export async function GET(request: NextRequest) {
  const executionId = request.nextUrl.searchParams.get("executionId")
  const workflowId = request.nextUrl.searchParams.get("workflowId")
  const limit = Math.min(Number(request.nextUrl.searchParams.get("limit") ?? "10"), 50)

  try {
    if (executionId) {
      const { data: execution, error } = await supabaseAdmin
        .from("workflow_executions")
        .select("*")
        .eq("id", executionId)
        .single()

      if (error || !execution) {
        return NextResponse.json({ error: "执行记录不存在" }, { status: 404 })
      }

      return NextResponse.json({ execution })
    }

    if (workflowId) {
      const { data: executions, error } = await supabaseAdmin
        .from("workflow_executions")
        .select("*")
        .eq("workflow_id", workflowId)
        .order("started_at", { ascending: false })
        .limit(limit)

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      return NextResponse.json({ executions })
    }

    return NextResponse.json({ error: "请提供 executionId 或 workflowId" }, { status: 400 })
  } catch (err) {
    console.error("查询执行记录错误:", err)
    return NextResponse.json({ error: "查询失败" }, { status: 500 })
  }
}
