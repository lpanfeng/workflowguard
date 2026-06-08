import { auth } from "@/lib/auth"
import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

// Supabase admin client 用于查询 profiles 表
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

// 不需要检查 onboarding 的路由
const ONBOARDING_EXEMPT_ROUTES = [
  "/onboarding",
  "/auth",
  "/api/auth",
  "/pricing",
  "/",
  "/api/plans",
]

export default auth(async (req) => {
  const { nextUrl } = req
  const path = nextUrl.pathname

  // 检查是否在豁免列表中
  const isExempt = ONBOARDING_EXEMPT_ROUTES.some(route => path.startsWith(route))
  if (isExempt) {
    return NextResponse.next()
  }

  // 需要保护的路由：检查登录状态
  const session = req.auth
  if (!session?.user?.id) {
    const loginUrl = new URL("/auth/login", nextUrl.origin)
    loginUrl.searchParams.set("callbackUrl", nextUrl.pathname)
    return NextResponse.redirect(loginUrl)
  }

  // 检查 onboarding 状态（跳过 onboarding 页面本身避免重定向循环）
  if (!path.startsWith("/onboarding")) {
    try {
      const { data: profile } = await supabaseAdmin
        .from("profiles")
        .select("has_onboarded")
        .eq("id", session.user.id)
        .single()

      // 新用户尚未完成 onboarding，重定向到引导页
      if (profile && !profile.has_onboarded) {
        return NextResponse.redirect(new URL("/onboarding", nextUrl.origin))
      }
    } catch {
      // 查询失败时放行，避免阻塞用户
      return NextResponse.next()
    }
  }

  return NextResponse.next()
})

export const config = {
  matcher: [
    // 保护所有需要登录的路由
    "/dashboard/:path*", 
    "/workflows/:path*",
    "/api/protected/:path*",
    "/tasks/:path*",
    "/audit-logs/:path*",
    "/settings/:path*",
    "/onboarding",
  ],
}
