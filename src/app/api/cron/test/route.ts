// WorkflowGuard — Cron Scheduler Test API
// 手动触发调度器测试，用于验证定时触发功能

import { NextResponse } from "next/server"
import { scanAndTriggerScheduledWorkflows } from "@/lib/cron-scheduler"

export async function POST() {
  try {
    const count = await scanAndTriggerScheduledWorkflows(true)
    return NextResponse.json({ 
      success: true, 
      triggered: count,
      message: `定时调度器测试完成，触发了 ${count} 个工作流`
    })
  } catch (err) {
    console.error("[CronTest] 调度器测试失败:", err)
    return NextResponse.json({ 
      success: false, 
      error: err instanceof Error ? err.message : "未知错误" 
    }, { status: 500 })
  }
}
