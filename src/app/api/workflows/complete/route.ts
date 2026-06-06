// WorkflowGuard — 工作流完成 API
// 标记工作流执行为已完成，记录结果

import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

/**
 * POST /api/workflows/complete — 标记任务完成
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { workflowId, templateId, result } = body

    if (!workflowId) {
      return NextResponse.json(
        { error: "缺少必填字段: workflowId" },
        { status: 400 }
      )
    }

    // 查找最近一次该工作流的执行记录
    const { data: execution, error: execError } = await supabaseAdmin
      .from("workflow_executions")
      .select("id")
      .eq("workflow_id", workflowId)
      .order("created_at", { ascending: false })
      .limit(1)
      .single()

    if (execError || !execution) {
      // 如果没有执行记录，创建一条
      const { error: insertError } = await supabaseAdmin
        .from("workflow_executions")
        .insert({
          workflow_id: workflowId,
          status: "completed",
          result: result || {},
          completed_at: new Date().toISOString(),
        })

      if (insertError) {
        return NextResponse.json({ error: `记录创建失败: ${insertError.message}` }, { status: 500 })
      }

      return NextResponse.json({ success: true, message: "执行记录已创建" })
    }

    // 更新最新执行记录为完成
    const { error: updateError } = await supabaseAdmin
      .from("workflow_executions")
      .update({
        status: "completed",
        result: result || {},
        completed_at: new Date().toISOString(),
      })
      .eq("id", execution.id)

    if (updateError) {
      return NextResponse.json({ error: `更新失败: ${updateError.message}` }, { status: 500 })
    }

    return NextResponse.json({ success: true, executionId: execution.id })
  } catch (err) {
    console.error("工作流完成 API 错误:", err)
    return NextResponse.json(
      { error: "服务器内部错误" },
      { status: 500 }
    )
  }
}
