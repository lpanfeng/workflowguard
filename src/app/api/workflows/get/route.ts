// WorkflowGuard — 工作流详情 API

import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

export async function GET(request: NextRequest) {
  const workflowId = request.nextUrl.searchParams.get("workflowId")

  if (!workflowId) {
    return NextResponse.json({ error: "缺少 workflowId" }, { status: 400 })
  }

  const { data: workflow, error } = await supabaseAdmin
    .from("workflows")
    .select("*")
    .eq("id", workflowId)
    .single()

  if (error || !workflow) {
    return NextResponse.json({ error: "工作流不存在" }, { status: 404 })
  }

  // 同时获取关联的任务数量统计
  const { count: taskCount } = await supabaseAdmin
    .from("tasks")
    .select("id", { count: "exact" })
    .eq("workflow_id", workflowId)

  return NextResponse.json({
    workflow,
    stats: {
      totalTasks: taskCount ?? 0,
    },
  })
}
