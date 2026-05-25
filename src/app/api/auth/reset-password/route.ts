import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: { autoRefreshToken: false, persistSession: false },
  }
)

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json()

    if (!email || typeof email !== "string") {
      return NextResponse.json({ error: "请提供有效的邮箱地址" }, { status: 400 })
    }

    const { error } = await supabaseAdmin.auth.resetPasswordForEmail(email, {
      redirectTo: `${process.env.AUTH_URL || "http://localhost:3000"}/auth/callback?next=/auth/update-password`,
    })

    if (error) {
      console.error("Reset password error:", error)
      // 不暴露用户是否存在的信息
      return NextResponse.json({ ok: true })
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error("Reset password error:", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
