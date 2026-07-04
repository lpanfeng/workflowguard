// WorkflowGuard — Scheduler Health Status Card for Dashboard
"use client"

import { useState, useEffect } from "react"

interface SchedulerHealth {
  totalWorkflows: number
  activeCronWorkflows: number
  lastScanTime: string | null
  scanIntervalMinutes: number
}

export default function SchedulerHealthCard() {
  const [health, setHealth] = useState<SchedulerHealth | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchHealth = async () => {
      try {
        const res = await fetch("/api/cron/health")
        const data = await res.json()
        if (data.success) {
          setHealth(data.data)
        } else {
          setError(data.error || "获取调度器状态失败")
        }
      } catch (e) {
        setError("无法连接调度器API")
      } finally {
        setLoading(false)
      }
    }
    fetchHealth()
  }, [])

  if (loading) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-lg">⏰</span>
          <h3 className="font-semibold text-gray-800">调度器健康状态</h3>
        </div>
        <div className="animate-pulse space-y-2">
          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-5">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-lg">⚠️</span>
          <h3 className="font-semibold text-red-800">调度器异常</h3>
        </div>
        <p className="text-sm text-red-600">{error}</p>
      </div>
    )
  }

  const isActive = (health?.activeCronWorkflows ?? 0) > 0
  const statusColor = isActive ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"
  const statusText = isActive ? "运行中" : "空闲"

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="text-lg">⏰</span>
          <h3 className="font-semibold text-gray-800">调度器健康状态</h3>
        </div>
        <span className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-full ${statusColor}`}>
          <span className={`w-2 h-2 rounded-full ${isActive ? "bg-green-500 animate-pulse" : "bg-yellow-500"}`}></span>
          {statusText}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <div className="text-2xl font-bold text-gray-900">{health?.totalWorkflows ?? 0}</div>
          <div className="text-xs text-gray-500">总工作流</div>
        </div>
        <div>
          <div className="text-2xl font-bold text-blue-600">{health?.activeCronWorkflows ?? 0}</div>
          <div className="text-xs text-gray-500">定时触发中</div>
        </div>
        <div>
          <div className="text-2xl font-bold text-purple-600">{health?.scanIntervalMinutes ?? 5}m</div>
          <div className="text-xs text-gray-500">扫描间隔</div>
        </div>
        <div>
          <div className="text-sm font-medium text-gray-700 truncate">
            {health?.lastScanTime ? new Date(health.lastScanTime).toLocaleTimeString("zh-CN") : "—"}
          </div>
          <div className="text-xs text-gray-500">上次扫描</div>
        </div>
      </div>

      {isActive && (
        <div className="mt-4 pt-3 border-t border-gray-100">
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
            调度器正常运行 · 每 {health?.scanIntervalMinutes ?? 5} 分钟扫描一次
          </div>
        </div>
      )}
    </div>
  )
}
