import { auth } from "@/lib/auth"
import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

// Supabase admin client
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

// Routes exempt from auth/onboarding checks
const EXEMPT_ROUTES = [
  "/onboarding", "/auth", "/api/auth", "/pricing", "/", "/api/plans",
  "/api/workflows", "/api/templates", "/api/feedback", "/api/metrics",
  "/api/audit-logs", "/api/settings", "/api/webhooks",
  "/_next", "/favicon.ico", "/robots.txt", "/sitemap.xml",
]

// Combined middleware
export default auth(async (req) => {
  const { nextUrl } = req
  const path = nextUrl.pathname

  // Handle i18n locale prefix
  const localeMatch = path.match(/^\/(zh|en)(\/.*)?$/)
  if (localeMatch) {
    const response = NextResponse.next()
    response.cookies.set('locale', localeMatch[1], { path: '/' })
    return response
  }

  // Check if exempt from auth
  const isExempt = EXEMPT_ROUTES.some(route => path.startsWith(route))
  if (isExempt) {
    return NextResponse.next()
  }

  const session = req.auth
  if (!session?.user?.id) {
    const loginUrl = new URL("/auth/login", nextUrl.origin)
    loginUrl.searchParams.set("callbackUrl", nextUrl.pathname)
    return NextResponse.redirect(loginUrl)
  }

  // Check onboarding status
  if (!path.startsWith("/onboarding")) {
    try {
      const { data: profile } = await supabaseAdmin
        .from("profiles")
        .select("has_onboarded")
        .eq("id", session.user.id)
        .single()

      if (profile && !profile.has_onboarded) {
        return NextResponse.redirect(new URL("/onboarding", nextUrl.origin))
      }
    } catch {
      return NextResponse.next()
    }
  }

  return NextResponse.next()
})

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
