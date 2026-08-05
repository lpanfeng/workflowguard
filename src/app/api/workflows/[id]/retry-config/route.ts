import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { auth } from "@/lib/auth"

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "未授权" }, { status: 401 })
    }

    const { id: workflowId } = await params

    // 验证工作流属于当前用户
    const { data: workflow, error } = await supabaseAdmin
      .from("workflows")
      .select("user_id, retry_config")
      .eq("id", workflowId)
      .single()

    if (error || !workflow) {
      return NextResponse.json({ error: "工作流不存在" }, { status: 404 })
    }

    if (workflow.user_id !== session.user.id) {
      return NextResponse.json({ error: "无权访问" }, { status: 403 })
    }

    const retryConfig = workflow.retry_config ?? {
      maxRetries: 0,
      backoffType: "exponential",
      retryDelayMs: 5000,
      timeoutMs: 60000,
    }

    return NextResponse.json({ success: true, data: retryConfig })
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "未知错误"
    return NextResponse.json({ error: errorMsg }, { status: 500 })
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "未授权" }, { status: 401 })
    }

    const body = await req.json()
    const { id: workflowId } = await params

    const allowedFields = ["maxRetries", "backoffType", "retryDelayMs", "timeoutMs"]
    const updates: Record<string, unknown> = {}

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updates[field] = body[field]
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "没有提供有效字段" }, { status: 400 })
    }

    // 验证工作流属于当前用户
    const { data: workflow, error: wfError } = await supabaseAdmin
      .from("workflows")
      .select("user_id")
      .eq("id", workflowId)
      .single()

    if (wfError || !workflow) {
      return NextResponse.json({ error: "工作流不存在" }, { status: 404 })
    }

    if (workflow.user_id !== session.user.id) {
      return NextResponse.json({ error: "无权访问" }, { status: 403 })
    }

    // 合并现有配置
    const { data: existingWorkflow } = await supabaseAdmin
      .from("workflows")
      .select("retry_config")
      .eq("id", workflowId)
      .single()

    const existingConfig = existingWorkflow?.retry_config ?? {}
    const newConfig = { ...existingConfig, ...updates }

    const { error: updateError } = await supabaseAdmin
      .from("workflows")
      .update({ retry_config: newConfig })
      .eq("id", workflowId)

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, data: newConfig })
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "未知错误"
    return NextResponse.json({ error: errorMsg }, { status: 500 })
  }
}
