import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { supabase } from "@/lib/supabase"

/**
 * GET /api/audit-logs — 审计日志查询API（带分页、筛选）
 * 查询参数：
 *   - page: 页码（从0开始，默认0）
 *   - pageSize: 每页条数（默认50，最大100）
 *   - action: 按操作类型筛选
 *   - userId: 按用户ID筛选（仅管理员）
 *   - dateFrom: 起始日期 YYYY-MM-DD
 *   - dateTo: 结束日期 YYYY-MM-DD
 *   - search: 模糊搜索（操作类型、详情）
 *   - sortBy: 排序字段（created_at | action）
 *   - sortOrder: asc | desc（默认desc）
 */
export async function GET(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "未授权" }, { status: 401 })
    }

    const params = req.nextUrl.searchParams
    const page = parseInt(params.get("page") || "0")
    const pageSize = Math.min(parseInt(params.get("pageSize") || "50"), 100)
    const action = params.get("action")
    const dateFrom = params.get("dateFrom")
    const dateTo = params.get("dateTo")
    const search = params.get("search")
    const sortBy = params.get("sortBy") || "created_at"
    const sortOrder = params.get("sortOrder") || "desc"

    let query = supabase
      .from("audit_logs")
      .select("*", { count: "exact" })
      .eq("user_id", session.user.id)
      .order(sortBy, { ascending: sortOrder === "asc" })
      .range(page * pageSize, (page + 1) * pageSize - 1)

    if (action && action !== "all") {
      query = query.eq("action", action)
    }

    if (dateFrom) {
      query = query.gte("created_at", `${dateFrom}T00:00:00Z`)
    }

    if (dateTo) {
      query = query.lte("created_at", `${dateTo}T23:59:59Z`)
    }

    if (search) {
      query = query.or(`action.ilike.%${search}%,details.ilike.%${search}%,task_id.ilike.%${search}%`)
    }

    const { data, count, error } = await query

    if (error) throw error

    return NextResponse.json({
      success: true,
      data: data ?? [],
      pagination: {
        page,
        pageSize,
        total: count ?? 0,
        totalPages: Math.ceil((count ?? 0) / pageSize),
      },
    })
  } catch (err) {
    console.error("审计日志查询失败:", err)
    return NextResponse.json(
      { success: false, error: "查询失败" },
      { status: 500 }
    )
  }
}
