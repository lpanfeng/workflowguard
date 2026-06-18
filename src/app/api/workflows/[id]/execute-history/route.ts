// WorkflowGuard — 工作流执行历史 API
// 获取指定工作流的执行历史记录（含成功率、耗时统计）

import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

/**
 * GET /api/workflows/[id]/execute-history?limit=20&page=1
 * 获取工作流的执行历史列表
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: workflowId } = await params
    const { searchParams } = request.nextUrl
    const limit = Math.min(Number(searchParams.get("limit") ?? "20"), 50)
    const page = Number(searchParams.get("page") ?? "1")
    const offset = (page - 1) * limit

    // 获取执行历史
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

    // 计算成功率
    const total = executions?.length ?? 0
    const completed = executions?.filter((e: any) => e.status === "completed").length ?? 0
    const failed = executions?.filter((e: any) => ["failed", "timed_out"].includes(e.status)).length ?? 0
    const successRate = total > 0 ? Math.round((completed / total) * 100) : 0

    // 计算平均耗时（秒）
    const durations = executions
      ?.filter((e: any) => e.started_at && e.completed_at)
      .map((e: any) => (new Date(e.completed_at).getTime() - new Date(e.started_at).getTime()) / 1000)
      .filter((d: number) => d > 0)

    const avgDuration = durations.length > 0
      ? Math.round(durations.reduce((a: number, b: number) => a + b, 0) / durations.length)
      : null

    // 计算重试次数统计
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
        successRate,
        avgDurationSeconds: avgDuration,
        totalRetries, // 总重试次数
      },
    })
  } catch (err) {
    console.error("[Execute History API Error]", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
