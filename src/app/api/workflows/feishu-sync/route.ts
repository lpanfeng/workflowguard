// WorkflowGuard — 飞书审批流集成 API
// POST /api/workflows/feishu-sync — 同步飞书审批状态到 WFG 任务

import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import {
  getApprovalInstance,
  parseApprovalCallback,
  createApprovalInstance,
  type ApprovalCallbackEvent,
} from "@/lib/feishu"

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

/**
 * POST /api/workflows/feishu-sync
 * 同步指定工作流的所有待审批任务到飞书审批流
 * 或者从飞书回调中更新 WFG 任务状态
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, workflowId, instanceCode, taskId, callback } = body

    // ====== 模式1：从飞书回调更新 WFG 任务状态 ======
    if (callback) {
      return handleCallback(callback)
    }

    // ====== 模式2：手动同步指定任务的飞书审批状态 ======
    if (instanceCode) {
      return syncApprovalStatus(instanceCode)
    }

    // ====== 模式3：同步整个工作流的所有待审批任务 ======
    if (workflowId) {
      return syncAllPendingTasks(workflowId)
    }

    return NextResponse.json(
      { error: "缺少参数: action, workflowId, instanceCode 或 callback" },
      { status: 400 }
    )
  } catch (err) {
    console.error("[Feishu Sync] 同步失败:", err)
    return NextResponse.json({ error: "同步失败" }, { status: 500 })
  }
}

/**
 * 处理飞书审批回调事件
 */
async function handleCallback(callback: Record<string, unknown>) {
  const event = parseApprovalCallback(callback)
  if (!event) {
    return NextResponse.json({ error: "无效的回调数据" }, { status: 400 })
  }

  console.log(`[Feishu Sync] 收到审批回调: ${event.status} (实例: ${event.instance_code})`)

  // 根据审批状态更新 WFG 任务
  const statusMap: Record<string, string> = {
    APPROVED: "approved",
    REJECTED: "rejected",
    PENDING: "waiting_approval",
    CANCELED: "canceled",
  }

  const wfgStatus = statusMap[event.status] ?? "waiting_approval"

  // 查找关联的 WFG 任务（通过 instance_code 字段匹配）
  const { data: tasks, error } = await supabaseAdmin
    .from("tasks")
    .select("*")
    .eq("feishu_instance_code", event.instance_code)
    .is("status", "waiting_approval")

  if (error) {
    console.error("[Feishu Sync] 查询任务失败:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (!tasks || tasks.length === 0) {
    // 尝试通过 task_id 匹配
    if (callback.task_id) {
      const { data: task, error: taskErr } = await supabaseAdmin
        .from("tasks")
        .select("*")
        .eq("id", String(callback.task_id))
        .single()

      if (taskErr || !task) {
        return NextResponse.json({ message: "未找到关联任务" }, { status: 404 })
      }

      const { error: updateErr } = await supabaseAdmin
        .from("tasks")
        .update({
          status: wfgStatus,
          approved_result: { comment: event.comment },
          approved_at: new Date(event.action_time * 1000).toISOString(),
        })
        .eq("id", task.id)

      if (updateErr) {
        return NextResponse.json({ error: updateErr.message }, { status: 500 })
      }

      // 记录审计日志
      await supabaseAdmin.from("audit_logs").insert({
        workflow_id: task.workflow_id,
        task_id: task.id,
        action: "approval_callback",
        details: {
          feishu_status: event.status,
          comment: event.comment,
          user_id: event.user_id,
        },
      })
    }

    return NextResponse.json({ message: "无关联任务需要同步" })
  }

  // 批量更新
  const updatedCount = tasks.length
  for (const task of tasks) {
    await supabaseAdmin.from("tasks").update({
      status: wfgStatus,
      approved_result: { comment: event.comment },
      approved_at: new Date(event.action_time * 1000).toISOString(),
    }).eq("id", task.id)

    await supabaseAdmin.from("audit_logs").insert({
      workflow_id: task.workflow_id,
      task_id: task.id,
      action: "approval_callback",
      details: {
        feishu_status: event.status,
        comment: event.comment,
        user_id: event.user_id,
      },
    })
  }

  return NextResponse.json({
    success: true,
    synced: updatedCount,
    status: wfgStatus,
  })
}

/**
 * 同步单个审批实例的状态
 */
async function syncApprovalStatus(instanceCode: string) {
  const instance = await getApprovalInstance(instanceCode)
  if (!instance) {
    return NextResponse.json({ error: "未找到飞书审批实例" }, { status: 404 })
  }

  const statusMap: Record<string, string> = {
    APPROVED: "approved",
    REJECTED: "rejected",
    PENDING: "waiting_approval",
    CANCELED: "canceled",
    DELETED: "canceled",
  }

  const wfgStatus = statusMap[instance.status] ?? "waiting_approval"

  const { data: tasks, error } = await supabaseAdmin
    .from("tasks")
    .select("*")
    .eq("feishu_instance_code", instanceCode)
    .in("status", ["pending", "ai_processing", "waiting_approval"])

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const updatedCount = tasks?.length ?? 0
  for (const task of tasks ?? []) {
    await supabaseAdmin.from("tasks").update({
      status: wfgStatus,
      approved_result: { comment: "状态同步" },
      approved_at: new Date().toISOString(),
    }).eq("id", task.id)
  }

  return NextResponse.json({
    success: true,
    feishu_status: instance.status,
    wfg_status: wfgStatus,
    synced: updatedCount,
  })
}

/**
 * 同步整个工作流的所有待审批任务到飞书
 */
async function syncAllPendingTasks(workflowId: string) {
  // 获取工作流信息
  const { data: workflow, error: wfErr } = await supabaseAdmin
    .from("workflows")
    .select("*")
    .eq("id", workflowId)
    .single()

  if (wfErr || !workflow) {
    return NextResponse.json({ error: "工作流不存在" }, { status: 404 })
  }

  // 获取所有待审批的任务
  const { data: pendingTasks, error: taskErr } = await supabaseAdmin
    .from("tasks")
    .select("*")
    .eq("workflow_id", workflowId)
    .eq("status", "waiting_approval")

  if (taskErr) {
    return NextResponse.json({ error: taskErr.message }, { status: 500 })
  }

  if (!pendingTasks || pendingTasks.length === 0) {
    return NextResponse.json({ message: "没有待审批的任务需要同步" })
  }

  // 飞书审批实例创建：暂不需要。后续接入飞书审批 API 时需在此处
  // 遍历 pendingTasks 并调用飞书审批模板创建实例。当前直接返回模拟数据。
  return NextResponse.json({
    success: true,
    workflow_title: workflow.name,
    pending_count: pendingTasks.length,
    message: "已准备好同步，需要配置飞书审批模板后执行",
    tasks: pendingTasks.map((t: any) => ({
      id: t.id,
      title: t.title,
      status: t.status,
    })),
  })
}

/**
 * GET /api/workflows/feishu-sync — 获取待审批任务列表
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const workflowId = searchParams.get("workflow_id")

    const query = supabaseAdmin
      .from("tasks")
      .select("*")
      .eq("status", "waiting_approval")
      .order("created_at", { ascending: false })

    if (workflowId) {
      query.eq("workflow_id", workflowId)
    }

    const { data, error } = await query.limit(50)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ tasks: data ?? [] })
  } catch (err) {
    console.error("[Feishu Sync] 查询失败:", err)
    return NextResponse.json({ error: "查询失败" }, { status: 500 })
  }
}
