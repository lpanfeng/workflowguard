// WorkflowGuard — 设置 API
// GET:  获取 API 密钥列表 + 飞书集成状态
// POST: 生成新 API 密钥

import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { createClient } from "@supabase/supabase-js"

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "未登录" }, { status: 401 })
  }

  const userId = session.user.id

  // 获取 API 密钥列表
  const { data: apiKeys, error: apiError } = await supabaseAdmin
    .from("api_keys")
    .select("id, name, key_value, last_used_at, expires_at, is_revoked, created_at")
    .eq("user_id", userId)
    .eq("is_revoked", false)
    .order("created_at", { ascending: false })

  if (apiError) {
    return NextResponse.json({ error: "获取 API 密钥失败" }, { status: 500 })
  }

  // 获取飞书集成状态
  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("webhook_url, feishu_bound_at, feishu_open_id")
    .eq("id", userId)
    .single()

  // 获取 Webhook 配置
  const { data: webhooks, error: webhookError } = await supabaseAdmin
    .from("webhooks")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })

  if (webhookError) {
    return NextResponse.json({ error: "获取 Webhook 配置失败" }, { status: 500 })
  }

  return NextResponse.json({
    apiKeys: apiKeys ?? [],
    webhooks: webhooks ?? [],
    feishu: {
      webhookUrl: profile?.webhook_url ?? null,
      isBound: !!profile?.feishu_open_id,
      feishuOpenId: profile?.feishu_open_id ?? null,
      boundAt: profile?.feishu_bound_at ?? null,
    },
  })
}

// POST: 生成新的 API 密钥
export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "未登录" }, { status: 401 })
  }

  const body = await request.json()
  const name = body.name || "default"

  const { data, error } = await supabaseAdmin.rpc("generate_api_key", {
    p_user_id: session.user.id,
    p_name: name,
  })

  if (error) {
    return NextResponse.json({ error: "生成密钥失败", details: error.message }, { status: 500 })
  }

  return NextResponse.json({ apiKey: data })
}

// DELETE: 撤销 API 密钥
export async function DELETE(request: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "未登录" }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const keyId = searchParams.get("id")

  if (!keyId) {
    return NextResponse.json({ error: "缺少密钥 ID" }, { status: 400 })
  }

  const { error } = await supabaseAdmin
    .from("api_keys")
    .update({ is_revoked: true })
    .eq("id", keyId)
    .eq("user_id", session.user.id)

  if (error) {
    return NextResponse.json({ error: "撤销密钥失败" }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
