// WorkflowGuard — 工作流创建 API
// 用户从模板创建工作流后保存到 Supabase

import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, name, description, templateId, config } = body

    if (!userId || !name || !templateId) {
      return NextResponse.json(
        { error: "缺少必填字段: userId, name, templateId" },
        { status: 400 }
      )
    }

    // 1. 检查用户配额（免费用户最多 2 个活跃工作流）
    const { data: activeWorkflows, error: countError } = await supabaseAdmin
      .from("workflows")
      .select("id", { count: "exact" })
      .eq("user_id", userId)
      .eq("is_active", true)

    if (countError) {
      return NextResponse.json({ error: "配额检查失败" }, { status: 500 })
    }

    // 免费用户限制 2 个活跃工作流，后续通过 plans 控制
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("plan")
      .eq("id", userId)
      .single()

    const plan = profile?.plan ?? "free"
    const maxWorkflows = plan === "free" ? 2 : plan === "pro" ? 10 : 50

    if (activeWorkflows && activeWorkflows.length >= maxWorkflows) {
      return NextResponse.json(
        { error: `当前套餐最多创建 ${maxWorkflows} 个活跃工作流，请升级套餐` },
        { status: 403 }
      )
    }

    // 2. 创建工作流
    const { data: workflow, error: wfError } = await supabaseAdmin
      .from("workflows")
      .insert({
        user_id: userId,
        name,
        description: description ?? "",
        template_id: templateId,
        config: config ?? {},
        is_active: true,
      })
      .select()
      .single()

    if (wfError || !workflow) {
      return NextResponse.json(
        { error: `创建工作流失败: ${wfError?.message}` },
        { status: 500 }
      )
    }

    // 3. 写入审计日志
    await supabaseAdmin.from("audit_logs").insert({
      user_id: userId,
      workflow_id: workflow.id,
      action: "workflow_created",
      details: { template_id: templateId, name },
    })

    return NextResponse.json({
      success: true,
      workflow: {
        id: workflow.id,
        name: workflow.name,
        template_id: workflow.template_id,
        is_active: workflow.is_active,
        created_at: workflow.created_at,
      },
    })
  } catch (err) {
    console.error("创建工作流错误:", err)
    return NextResponse.json({ error: "创建工作流失败" }, { status: 500 })
  }
}
