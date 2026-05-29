export { auth as middleware } from "@/lib/auth"

export const config = {
  matcher: [
    // 保护所有需要登录的路由
    "/dashboard/:path*", 
    "/workflows/:path*",
    "/api/protected/:path*",
    "/tasks/:path*",
    "/audit-logs/:path*",
    "/settings/:path*",
  ],
}
