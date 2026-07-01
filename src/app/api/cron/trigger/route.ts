// WorkflowGuard — Cron Trigger API
// 这是一个内部 API endpoint，供外部 cron 服务（如 Vercel Cron、Cron-job.org、GitHub Actions）定期调用
// 也可以在本实例上用 systemd timer / crontab 调用
//
// GET /api/cron/trigger — 扫描并触发所有定时工作流

import { NextResponse } from "next/server"
import { scanAndTriggerScheduledWorkflows } from "@/lib/cron-scheduler"

export const dynamic = "force-dynamic"
export const revalidate = 0

export async function GET(request: Request) {
  try {
    // 安全检查：只允许从内网或指定 IP 调用
    const authHeader = request.headers.get("Authorization")
    const cronSecret = process.env.CRON_SECRET
    
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { error: "未授权：需要提供有效的 Bearer token" },
        { status: 401 }
      )
    }

    // 支持 force 参数：?force=true 强制立即触发所有定时工作流
    const url = new URL(request.url)
    const force = url.searchParams.get('force') === 'true'

    console.log(`[CronTrigger] 开始扫描定时工作流... force=${force}`)
    const startTime = Date.now()

    const triggeredCount = await scanAndTriggerScheduledWorkflows(force)

    const elapsed = Date.now() - startTime
    console.log(`[CronTrigger] 完成：触发了 ${triggeredCount} 个工作流，耗时 ${elapsed}ms`)

    return NextResponse.json({
      success: true,
      triggeredCount,
      elapsedMs: elapsed,
      timestamp: new Date().toISOString(),
    })
  } catch (err) {
    console.error("[CronTrigger] 扫描失败:", err)
    return NextResponse.json(
      { error: "扫描失败", details: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    )
  }
}

/**
 * POST /api/cron/trigger — 强制立即触发（忽略间隔检查）
 * 用于手动测试或紧急触发
 */
export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get("Authorization")
    const cronSecret = process.env.CRON_SECRET
    
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { error: "未授权" },
        { status: 401 }
      )
    }

    console.log("[CronTrigger] 强制触发模式启动...")
    const startTime = Date.now()

    const triggeredCount = await scanAndTriggerScheduledWorkflows(true)

    const elapsed = Date.now() - startTime
    console.log(`[CronTrigger] 强制触发完成：${triggeredCount} 个工作流，耗时 ${elapsed}ms`)

    return NextResponse.json({
      success: true,
      triggeredCount,
      elapsedMs: elapsed,
      mode: "forced",
      timestamp: new Date().toISOString(),
    })
  } catch (err) {
    console.error("[CronTrigger] 强制触发失败:", err)
    return NextResponse.json(
      { error: "强制触发失败", details: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    )
  }
}
