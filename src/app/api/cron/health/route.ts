// WorkflowGuard — Cron Scheduler Health API
// 返回调度器健康状态，供 Dashboard 卡片组件使用

import { NextResponse } from "next/server"
import { getSchedulerHealth } from "@/lib/cron-scheduler-enhanced"

export async function GET() {
  try {
    const health = await getSchedulerHealth()
    return NextResponse.json({
      success: true,
      data: health,
    })
  } catch (err) {
    console.error("[CronHealth] 调度器健康检查失败:", err)
    return NextResponse.json({
      success: false,
      error: err instanceof Error ? err.message : "未知错误",
    }, { status: 500 })
  }
}
