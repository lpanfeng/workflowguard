// WorkflowGuard — 套餐与配额 API
// GET: 获取套餐列表
// POST: 检查用户配额

import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { createClient } from "@supabase/supabase-js"

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

// 获取套餐列表
export async function GET() {
  const { data: plans } = await supabaseAdmin
    .from("plan_limits")
    .select("*")
    .order("price_monthly", { ascending: true })

  return NextResponse.json({ plans: plans ?? [] })
}

// 检查配额
export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "未登录" }, { status: 401 })
  }

  const body = await request.json()
  const resource = body.resource as "workflow" | "approval"

  const { data: result, error } = await supabaseAdmin.rpc("check_user_quota", {
    p_user_id: session.user.id,
    p_resource: resource,
  })

  if (error) {
    return NextResponse.json({ error: "配额检查失败", details: error.message }, { status: 500 })
  }

  return NextResponse.json(result)
}
