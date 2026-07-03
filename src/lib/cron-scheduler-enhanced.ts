// WorkflowGuard — Enhanced Cron Scheduler with Standard Cron Parsing
// 增强版调度器：支持标准 cron 格式解析

import { createClient } from "@supabase/supabase-js"

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

/**
 * 解析标准 cron 表达式，计算下次执行时间
 * 支持格式：minute hour dom month dow
 * 例如：0 9 * * 1-5 (工作日早上9点)
 */
export function getNextCronExecution(cronExpr: string): Date | null {
  const parts = cronExpr.trim().split(/\s+/)
  if (parts.length < 5) return null

  const [minuteStr, hourStr, domStr, monthStr, dowStr] = parts

  const parseRange = (str: string, min: number, max: number): number[] => {
    if (str === '*') return Array.from({ length: max - min + 1 }, (_, i) => min + i)
    if (str.includes(',')) return str.split(',').map(Number)
    if (str.includes('-')) {
      const [a, b] = str.split('-').map(Number)
      return Array.from({ length: b - a + 1 }, (_, i) => a + i)
    }
    const n = parseInt(str)
    return isNaN(n) || n < min || n > max ? [] : [n]
  }

  const minutes = parseRange(minuteStr, 0, 59)
  const hours = parseRange(hourStr, 0, 23)
  const doms = parseRange(domStr, 1, 31)
  const months = parseRange(monthStr, 1, 12)
  const dows = parseRange(dowStr, 0, 6)

  if (minutes.length === 0 || hours.length === 0 || months.length === 0 || dows.length === 0) return null

  const now = new Date()
  // 从下一秒开始找
  const candidate = new Date(now.getTime() + 60000)
  
  for (let i = 0; i < 366 * 24 * 60; i++) {
    candidate.setMinutes(candidate.getMinutes() + 1)
    const m = candidate.getMinutes()
    const h = candidate.getHours()
    const dom = candidate.getDate()
    const month = candidate.getMonth() + 1
    const dow = candidate.getDay()
    
    if (months.includes(month) && doms.includes(dom) && dows.includes(dow) &&
        hours.includes(h) && minutes.includes(m)) {
      return new Date(candidate)
    }
  }
  return null
}

/**
 * 获取调度器健康状态
 */
export async function getSchedulerHealth(): Promise<{
  totalWorkflows: number
  activeCronWorkflows: number
  lastScanTime: string | null
  scanIntervalMinutes: number
}> {
  const { data: workflows, error } = await supabaseAdmin
    .from("workflows")
    .select("config, is_active, updated_at")
  
  if (error || !workflows) {
    return { totalWorkflows: 0, activeCronWorkflows: 0, lastScanTime: null, scanIntervalMinutes: 5 }
  }

  const activeCount = workflows.filter(w => w.is_active).length
  const cronCount = workflows.filter(w => {
    const cfg = (w.config ?? {}) as Record<string, unknown>
    return cfg.trigger?.type === 'cron'
  }).length

  // 简单估算扫描间隔
  const scanInterval = cronCount > 0 ? Math.min(5, Math.max(1, Math.ceil(300 / (cronCount || 1)))) : 5

  return {
    totalWorkflows: workflows.length,
    activeCronWorkflows: cronCount,
    lastScanTime: new Date().toISOString(),
    scanIntervalMinutes: scanInterval
  }
}
