/**
 * 执行指标聚合工具
 * 为 Dashboard 提供周趋势数据
 */

export interface WeeklyMetrics {
  weekLabel: string
  totalTasks: number
  completed: number
  approved: number
  rejected: number
  failed: number
  avgApprovalTime: number | null // 分钟
  weekOverWeekChange: number // 百分比变化
  topWorkflow: string | null
}

export async function getWeeklyMetrics(userId: string, days: number = 7): Promise<WeeklyMetrics> {
  // 在客户端组件中调用，通过 API 获取
  const res = await fetch(`/api/execution-metrics?userId=${userId}&days=${days}`)
  const result = await res.json()
  return result
}

/**
 * 生成周标签
 */
export function getWeekLabel(days: number = 7): string {
  const end = new Date()
  const start = new Date()
  start.setDate(start.getDate() - days + 1)
  
  const monthNames = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月']
  return `${start.getMonth() + 1}月${start.getDate()}日-${end.getMonth() + 1}月${end.getDate()}日`
}
