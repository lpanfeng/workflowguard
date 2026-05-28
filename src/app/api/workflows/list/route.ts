// WorkflowGuard — 工作流列表 API
// 支持按用户、活跃状态筛选

import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

export async function GET(request: NextRequest) {
  const userId = request.nextUrl.searchParams.get("userId")
  const isActive = request.nextUrl.searchParams.get("isActive")
  const limit = Math.min(Number(request.nextUrl.searchParams.get("limit") ?? "50"), 100)
  const offset = Number(request.nextUrl.searchParams.get("offset") ?? "0")

  let query = supabaseAdmin.from("workflows").select("*", { count: "exact" })

  if (userId) query = query.eq("user_id", userId)
  if (isActive !== null) query = query.eq("is_active", isActive === "true")

  const { data: workflows, count, error } = await query
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ workflows, count, limit, offset })
}
