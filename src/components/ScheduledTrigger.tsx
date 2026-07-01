// WorkflowGuard — 定时触发设置组件
"use client"

import { useState, useEffect } from "react"

interface ScheduledTriggerProps {
  workflowId: string
  initialCron?: string
  initialEnabled?: boolean
}

export default function ScheduledTrigger({ workflowId, initialCron, initialEnabled }: ScheduledTriggerProps) {
  const [cronExpr, setCronExpr] = useState(initialCron ?? "* * * * *")
  const [enabled, setEnabled] = useState(initialEnabled ?? false)
  const [loading, setLoading] = useState(false)
  const [saved, setSaved] = useState(false)
  const [lastTriggered, setLastTriggered] = useState<string | null>(null)

  // 加载上次触发时间
  useEffect(() => {
    if (!workflowId) return
    const fetchLastTrigger = async () => {
      try {
        const res = await fetch(`/api/workflows/${workflowId}/execution-history?limit=1`)
        const data = await res.json()
        if (data.executions?.[0]?.started_at) {
          setLastTriggered(data.executions[0].started_at)
        }
      } catch (e) {
        // 静默失败
      }
    }
    fetchLastTrigger()
  }, [workflowId])

  const presets = [
    { label: "每分钟", expr: "* * * * *", desc: "每分钟执行一次" },
    { label: "每5分钟", expr: "*/5 * * * *", desc: "每5分钟执行一次" },
    { label: "每小时", expr: "0 * * * *", desc: "每小时整点执行" },
    { label: "每6小时", expr: "0 */6 * * *", desc: "每6小时执行一次" },
    { label: "每天", expr: "0 0 * * *", desc: "每天午夜执行" },
    { label: "自定义", expr: "", desc: "" },
  ]

  const handleSave = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/workflows/${workflowId}/schedule`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cronExpr, enable: enabled }),
      })
      const data = await res.json()
      if (data.success) {
        setSaved(true)
        setTimeout(() => setSaved(false), 3000)
      }
    } catch (err) {
      console.error("保存定时触发失败:", err)
    } finally {
      setLoading(false)
    }
  }

  const handleToggle = async () => {
    const newEnabled = !enabled
    setEnabled(newEnabled)
    setLoading(true)
    try {
      await fetch(`/api/workflows/${workflowId}/schedule`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cronExpr, enable: newEnabled }),
      })
    } catch (err) {
      console.error("切换定时触发失败:", err)
    } finally {
      setLoading(false)
    }
  }

  const formatTime = (iso: string) => {
    try {
      return new Date(iso).toLocaleString("zh-CN", {
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      })
    } catch {
      return iso
    }
  }

  return (
    <div className="mt-4 rounded-lg border border-gray-200 p-4 bg-gray-50">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-medium text-gray-700">⏰ 定时触发</h3>
          {enabled && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-full bg-green-100 text-green-700">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
              已启用
            </span>
          )}
        </div>
        <button
          onClick={handleToggle}
          disabled={loading}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
            enabled ? "bg-blue-600" : "bg-gray-300"
          }`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              enabled ? "translate-x-6" : "translate-x-1"
            }`}
          />
        </button>
      </div>

      {/* 上次触发时间 */}
      {lastTriggered && (
        <div className="mb-3 text-xs text-gray-500">
          上次触发: {formatTime(lastTriggered)}
        </div>
      )}

      {enabled && (
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {presets.map((p) => (
              <button
                key={p.expr}
                onClick={() => setCronExpr(p.expr)}
                className={`px-3 py-1.5 text-xs rounded-lg border transition-all ${
                  cronExpr === p.expr
                    ? "bg-blue-100 border-blue-400 text-blue-700 shadow-sm"
                    : "border-gray-200 text-gray-600 hover:bg-gray-100 hover:border-gray-300"
                }`}
                title={p.desc}
              >
                {p.label}
              </button>
            ))}
          </div>

          {!cronExpr && presets.find(p => p.expr === "") && (
            <input
              type="text"
              value=""
              onChange={(e) => setCronExpr(e.target.value)}
              placeholder="输入 cron 表达式（如 0 */2 * * *）"
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          )}

          {/* Cron 表达式说明 */}
          <div className="text-xs text-gray-400 bg-white rounded-md p-2 border border-gray-100">
            <div className="font-medium mb-1">💡 Cron 表达式说明：</div>
            <div>* * * * * → 每分钟 | 0 * * * * → 每小时 | 0 0 * * * → 每天午夜</div>
            <div>格式：分 时 日 月 星期</div>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500 font-mono">
              {cronExpr || "未设置"}
            </span>
            <button
              onClick={handleSave}
              disabled={loading}
              className="px-4 py-1.5 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {loading ? "保存中..." : saved ? "✅ 已保存" : "保存设置"}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
