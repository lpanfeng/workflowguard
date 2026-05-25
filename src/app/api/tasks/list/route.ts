// WorkflowGuard — 任务列表 API
// 支持按用户、状态、工作流筛选

import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

export async function GET(request: NextRequest) {
  const userId = request.nextUrl.searchParams.get("userId")
  const status = request.nextUrl.searchParams.get("status")
  const workflowId = request.nextUrl.searchParams.get("workflowId")
  const limit = Math.min(Number(request.nextUrl.searchParams.get("limit") ?? "50"), 100)
  const offset = Number(request.nextUrl.searchParams.get("offset") ?? "0")

  let query = supabaseAdmin.from("tasks").select("*", { count: "exact" })

  if (userId) query = query.eq("user_id", userId)
  if (status) query = query.eq("status", status)
  if (workflowId) query = query.eq("workflow_id", workflowId)

  const { data: tasks, count, error } = await query
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ tasks, count, limit, offset })
}
