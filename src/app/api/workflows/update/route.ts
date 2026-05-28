// WorkflowGuard — 工作流更新/删除 API

import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { workflowId, userId, name, description, config, isActive } = body

    if (!workflowId || !userId) {
      return NextResponse.json(
        { error: "缺少必填字段: workflowId, userId" },
        { status: 400 }
      )
    }

    // 验证工作流属于该用户
    const { data: existing } = await supabaseAdmin
      .from("workflows")
      .select("id, user_id")
      .eq("id", workflowId)
      .single()

    if (!existing) {
      return NextResponse.json({ error: "工作流不存在" }, { status: 404 })
    }

    if (existing.user_id !== userId) {
      return NextResponse.json({ error: "无权修改此工作流" }, { status: 403 })
    }

    const updates: Record<string, unknown> = {}
    if (name !== undefined) updates.name = name
    if (description !== undefined) updates.description = description
    if (config !== undefined) updates.config = config
    if (isActive !== undefined) updates.is_active = isActive

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "没有需要更新的字段" }, { status: 400 })
    }

    const { data: workflow, error: wfError } = await supabaseAdmin
      .from("workflows")
      .update(updates)
      .eq("id", workflowId)
      .select()
      .single()

    if (wfError) {
      return NextResponse.json({ error: `更新失败: ${wfError.message}` }, { status: 500 })
    }

    // 写入审计日志
    await supabaseAdmin.from("audit_logs").insert({
      user_id: userId,
      workflow_id: workflowId,
      action: "workflow_updated",
      details: updates,
    })

    return NextResponse.json({ success: true, workflow })
  } catch (err) {
    console.error("更新工作流错误:", err)
    return NextResponse.json({ error: "更新工作流失败" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  const workflowId = request.nextUrl.searchParams.get("workflowId")
  const userId = request.nextUrl.searchParams.get("userId")

  if (!workflowId || !userId) {
    return NextResponse.json(
      { error: "缺少必填参数: workflowId, userId" },
      { status: 400 }
    )
  }

  // 验证工作流属于该用户
  const { data: existing } = await supabaseAdmin
    .from("workflows")
    .select("id, user_id")
    .eq("id", workflowId)
    .single()

  if (!existing) {
    return NextResponse.json({ error: "工作流不存在" }, { status: 404 })
  }

  if (existing.user_id !== userId) {
    return NextResponse.json({ error: "无权删除此工作流" }, { status: 403 })
  }

  // 软删除：标记为非活跃
  const { error } = await supabaseAdmin
    .from("workflows")
    .update({ is_active: false })
    .eq("id", workflowId)

  if (error) {
    return NextResponse.json({ error: `删除失败: ${error.message}` }, { status: 500 })
  }

  await supabaseAdmin.from("audit_logs").insert({
    user_id: userId,
    workflow_id: workflowId,
    action: "workflow_deleted",
    details: { method: "soft_delete" },
  })

  return NextResponse.json({ success: true, message: "工作流已删除" })
}
