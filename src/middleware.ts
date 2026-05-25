export { auth as middleware } from "@/lib/auth"

export const config = {
  // 仅保护需要登录的路由
  matcher: ["/dashboard/:path*", "/workflows/:path*", "/api/protected/:path*"],
}
