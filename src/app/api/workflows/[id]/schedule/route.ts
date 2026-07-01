// WorkflowGuard — 定时触发设置 API
import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { scheduleWorkflow, unscheduleWorkflow, parseSimpleCron } from "@/lib/cron-scheduler"

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: workflowId } = await params
    const body = await request.json()
    const { cronExpr, enable } = body as { cronExpr?: string; enable?: boolean }

    if (!enable && enable !== undefined) {
      // 禁用定时触发
      const result = await unscheduleWorkflow(workflowId)
      if (!result.success) {
        return NextResponse.json({ error: result.error }, { status: 500 })
      }
      return NextResponse.json({ success: true, message: "定时触发已禁用" })
    }

    if (!cronExpr) {
      return NextResponse.json({ error: "缺少 cron 表达式" }, { status: 400 })
    }

    const parsed = parseSimpleCron(cronExpr)
    if (!parsed) {
      return NextResponse.json({ error: "不支持的 cron 表达式格式" }, { status: 400 })
    }

    const result = await scheduleWorkflow(workflowId, cronExpr)
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true, 
      message: "定时触发已设置",
      nextTriggerMinutes: parsed.minutes 
    })
  } catch (err) {
    return NextResponse.json({ error: "服务器错误" }, { status: 500 })
  }
}
