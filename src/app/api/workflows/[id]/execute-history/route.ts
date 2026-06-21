// WorkflowGuard — 工作流执行历史 API (增强版)
// GET /api/workflows/[id]/execute-history — 获取执行历史 + 单次执行详情

import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

/**
 * GET /api/workflows/[id]/execute-history?executionId=xxx — 获取单次执行详情
 * GET /api/workflows/[id]/execute-history?limit=20&page=1 — 获取执行历史列表
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: workflowId } = await params
    const { searchParams } = request.nextUrl
    const executionId = searchParams.get("executionId")
    const limit = Math.min(Number(searchParams.get("limit") ?? "20"), 50)
    const page = Number(searchParams.get("page") ?? "1")
    const offset = (page - 1) * limit

    // === 模式1: 获取单次执行详情 ===
    if (executionId) {
      const { data: execution, error } = await supabaseAdmin
        .from("workflow_executions")
        .select("*")
        .eq("id", executionId)
        .single()

      if (error || !execution) {
        return NextResponse.json({ error: "执行记录不存在" }, { status: 404 })
      }

      // 获取关联的审计日志
      const { data: auditLogs } = await supabaseAdmin
        .from("audit_logs")
        .select("*")
        .eq("workflow_id", workflowId)
        .or(`details.execution_id.eq.${executionId}`)
        .order("created_at", { ascending: true })

      // 获取步骤级别的详细日志
      const steps = (execution.steps as any[]) ?? []
      const stepDetails = steps.map((step, idx) => ({
        index: idx,
        stepId: step.stepId,
        stepName: step.stepName,
        stepType: step.stepType,
        status: step.status,
        startedAt: step.startedAt,
        completedAt: step.completedAt,
        durationMs: step.durationMs,
        retryCount: step.retryCount ?? 0,
        maxRetries: step.maxRetries ?? 0,
        error: step.error,
        errorContext: step.errorContext,
        approvalStatus: step.approvalStatus,
      }))

      // 计算总耗时
      const totalDuration = execution.started_at && execution.completed_at
        ? Math.round(new Date(execution.completed_at).getTime() - new Date(execution.started_at).getTime())
        : null

      return NextResponse.json({
        execution: {
          ...execution,
          totalDurationMs: totalDuration,
          stepDetails,
        },
        auditTrail: auditLogs ?? [],
      })
    }

    // === 模式2: 获取执行历史列表 ===
    const { data: executions, error } = await supabaseAdmin
      .from("workflow_executions")
      .select("*")
      .eq("workflow_id", workflowId)
      .order("started_at", { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // 获取总数
    const { count } = await supabaseAdmin
      .from("workflow_executions")
      .select("*", { count: "exact", head: true })
      .eq("workflow_id", workflowId)

    const total = executions?.length ?? 0
    const completed = executions?.filter((e: any) => e.status === "completed").length ?? 0
    const failed = executions?.filter((e: any) => ["failed", "timed_out", "cancelled"].includes(e.status)).length ?? 0
    const paused = executions?.filter((e: any) => e.status === "paused").length ?? 0
    const successRate = total > 0 ? Math.round((completed / total) * 100) : 0

    // 平均耗时
    const durations = executions
      ?.filter((e: any) => e.started_at && e.completed_at)
      .map((e: any) => new Date(e.completed_at).getTime() - new Date(e.started_at).getTime())
      .filter((d: number) => d > 0)

    const avgDuration = durations.length > 0
      ? Math.round(durations.reduce((a: number, b: number) => a + b, 0) / durations.length)
      : null

    // 最大耗时
    const maxDuration = durations.length > 0 ? Math.max(...durations) : null

    // 重试统计
    const totalRetries = executions
      ?.reduce((sum: number, e: any) => {
        const steps = e.steps as any[] ?? []
        return sum + steps.reduce((s: number, step: any) => s + (step.retryCount ?? 0), 0)
      }, 0) ?? 0

    return NextResponse.json({
      executions: executions ?? [],
      pagination: {
        total: count ?? 0,
        page,
        limit,
        totalPages: Math.ceil((count ?? 0) / limit),
      },
      stats: {
        total,
        completed,
        failed,
        paused,
        successRate,
        avgDurationMs: avgDuration,
        maxDurationMs: maxDuration,
        totalRetries,
      },
    })
  } catch (err) {
    console.error("[Execute History API Error]", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
