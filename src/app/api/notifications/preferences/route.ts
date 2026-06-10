// WorkflowGuard — 通知偏好 API
// 获取/更新用户的通知偏好设置

import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

export async function GET(request: NextRequest) {
  const userId = request.nextUrl.searchParams.get("userId")
  if (!userId) {
    return NextResponse.json({ error: "缺少 userId" }, { status: 400 })
  }

  const { data: prefs, error } = await supabaseAdmin
    .from("notification_preferences")
    .select("*")
    .eq("user_id", userId)
    .single()

  if (error && error.code !== "PGRST116") {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({
    prefs: prefs || {
      email_notifications: true,
      email_on_approval_needed: true,
      email_on_approved: true,
      email_on_rejected: true,
      email_on_completed: false,
      digest_enabled: false,
      digest_frequency: "daily",
    },
  })
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, ...updates } = body

    if (!userId) {
      return NextResponse.json({ error: "缺少 userId" }, { status: 400 })
    }

    const allowedFields = [
      "email_notifications",
      "email_on_approval_needed",
      "email_on_approved",
      "email_on_rejected",
      "email_on_completed",
      "digest_enabled",
      "digest_frequency",
    ]

    const cleanUpdates: Record<string, any> = {}
    for (const field of allowedFields) {
      if (updates[field] !== undefined) {
        cleanUpdates[field] = updates[field]
      }
    }

    const { data, error } = await supabaseAdmin
      .from("notification_preferences")
      .upsert({ user_id: userId, ...cleanUpdates }, { onConflict: "user_id" })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ prefs: data })
  } catch (err) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 })
  }
}
