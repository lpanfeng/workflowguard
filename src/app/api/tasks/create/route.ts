// WorkflowGuard — 任务创建 API
// 创建新任务并自动触发 AI 执行

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
    const { workflowId, userId, title, inputData } = body

    if (!workflowId || !userId || !title) {
      return NextResponse.json(
        { error: "缺少必填字段: workflowId, userId, title" },
        { status: 400 }
      )
    }

    // 1. 验证工作流存在且激活
    const { data: workflow, error: wfError } = await supabaseAdmin
      .from("workflows")
      .select("*")
      .eq("id", workflowId)
      .single()

    if (wfError || !workflow) {
      return NextResponse.json({ error: "工作流不存在" }, { status: 404 })
    }

    if (!workflow.is_active) {
      return NextResponse.json({ error: "工作流未启用" }, { status: 400 })
    }

    // 2. 检查配额
    const { data: quota } = await supabaseAdmin
      .rpc("check_approval_quota", { user_id: userId })

    if (quota && quota.length > 0 && !quota[0].allowed) {
      return NextResponse.json(
        { error: "审批配额已用完，请升级套餐或等待下月重置", remaining: 0 },
        { status: 403 }
      )
    }

    // 3. 创建任务
    const { data: task, error: taskError } = await supabaseAdmin
      .from("tasks")
      .insert({
        workflow_id: workflowId,
        user_id: userId,
        type: workflow.template_id,
        status: "pending",
        title,
        input_data: inputData ?? {},
      })
      .select()
      .single()

    if (taskError || !task) {
      return NextResponse.json(
        { error: `创建任务失败: ${taskError?.message}` },
        { status: 500 }
      )
    }

    // 4. 写入审计日志
    await supabaseAdmin.from("audit_logs").insert({
      user_id: userId,
      task_id: task.id,
      workflow_id: workflowId,
      action: "task_created",
      details: { title, template_id: workflow.template_id },
    })

    // 5. 自动触发 AI 执行（异步）
    fetch(`${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/api/ai/execute`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ taskId: task.id }),
    }).catch((err) => console.error("自动触发 AI 执行失败:", err))

    return NextResponse.json({
      success: true,
      task: {
        id: task.id,
        title: task.title,
        status: task.status,
        created_at: task.created_at,
      },
    })
  } catch (err) {
    console.error("创建任务错误:", err)
    return NextResponse.json({ error: "创建任务失败" }, { status: 500 })
  }
}
