"use client"

import { useState, useEffect, useCallback } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"
import Link from "next/link"
import {
  Loader2,
  ChevronLeft,
  ChevronRight,
  Search,
  Clock,
  FileText,
  XCircle,
  CheckCircle2,
  Activity,
  RefreshCw,
  AlertTriangle,
  Power,
  LogIn,
  RefreshCcw,
  Zap,
  Eye,
  Filter,
  Calendar,
} from "lucide-react"

// 操作类型映射
const ACTION_LABELS: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  task_created: {
    label: "创建任务",
    color: "bg-blue-100 text-blue-700",
    icon: <Activity className="h-3 w-3" />,
  },
  ai_executed: {
    label: "AI 执行",
    color: "bg-purple-100 text-purple-700",
    icon: <Zap className="h-3 w-3" />,
  },
  ai_failed: {
    label: "AI 失败",
    color: "bg-red-100 text-red-700",
    icon: <AlertTriangle className="h-3 w-3" />,
  },
  task_approved: {
    label: "审批通过",
    color: "bg-green-100 text-green-700",
    icon: <CheckCircle2 className="h-3 w-3" />,
  },
  task_rejected: {
    label: "审批驳回",
    color: "bg-red-100 text-red-700",
    icon: <XCircle className="h-3 w-3" />,
  },
  task_modified: {
    label: "修改任务",
    color: "bg-amber-100 text-amber-700",
    icon: <FileText className="h-3 w-3" />,
  },
  task_completed: {
    label: "完成任务",
    color: "bg-emerald-100 text-emerald-700",
    icon: <CheckCircle2 className="h-3 w-3" />,
  },
  task_resumed: {
    label: "恢复执行",
    color: "bg-cyan-100 text-cyan-700",
    icon: <RefreshCcw className="h-3 w-3" />,
  },
  workflow_created: {
    label: "创建工作流",
    color: "bg-blue-100 text-blue-700",
    icon: <FileText className="h-3 w-3" />,
  },
  workflow_updated: {
    label: "更新工作流",
    color: "bg-amber-100 text-amber-700",
    icon: <FileText className="h-3 w-3" />,
  },
  workflow_deactivated: {
    label: "停用工作流",
    color: "bg-gray-100 text-gray-700",
    icon: <Power className="h-3 w-3" />,
  },
  user_login: {
    label: "用户登录",
    color: "bg-slate-100 text-slate-700",
    icon: <LogIn className="h-3 w-3" />,
  },
  user_plan_changed: {
    label: "套餐变更",
    color: "bg-indigo-100 text-indigo-700",
    icon: <RefreshCw className="h-3 w-3" />,
  },
}

type AuditLog = {
  id: string
  user_id: string
  task_id: string | null
  workflow_id: string | null
  action: string
  details: Record<string, unknown>
  ip_address: string | null
  user_agent: string | null
  created_at: string
}

type PaginationInfo = {
  page: number
  pageSize: number
  total: number
  totalPages: number
}

export default function AuditLogsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(true)
  const [pagination, setPagination] = useState<PaginationInfo>({
    page: 0, pageSize: 50, total: 0, totalPages: 0,
  })
  const [filterAction, setFilterAction] = useState<string>("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null)
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")
  const [showFilters, setShowFilters] = useState(false)

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/login")
    }
  }, [status, router])

  const loadLogs = useCallback(async () => {
    if (!session?.user?.id) return
    setLoading(true)

    try {
      const params = new URLSearchParams({
        page: String(pagination.page),
        pageSize: String(pagination.pageSize),
      })

      if (filterAction !== "all") params.set("action", filterAction)
      if (dateFrom) params.set("dateFrom", dateFrom)
      if (dateTo) params.set("dateTo", dateTo)
      if (searchQuery) params.set("search", searchQuery)

      const res = await fetch(`/api/audit-logs?${params.toString()}`)
      const result = await res.json()

      if (result.success) {
        setLogs(result.data ?? [])
        setPagination(result.pagination)
      }
    } catch (err) {
      console.error("加载审计日志失败:", err)
      toast.error("加载审计日志失败")
    } finally {
      setLoading(false)
    }
  }, [session, pagination.page, pagination.pageSize, filterAction, dateFrom, dateTo, searchQuery])

  useEffect(() => {
    if (session?.user?.id) {
      loadLogs()
    }
  }, [session, pagination.page, filterAction, dateFrom, dateTo]) // search debounced

  const handleSearch = useCallback(() => {
    setPagination(prev => ({ ...prev, page: 0 }))
    // Debounce search
    clearTimeout((window as any)._auditSearchTimer)
    ;(window as any)._auditSearchTimer = setTimeout(loadLogs, 300)
  }, [loadLogs])

  const handleRecover = async (taskId: string) => {
    try {
      const res = await fetch("/api/workflows/recover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId }),
      })
      const result = await res.json()

      if (res.ok && result.success) {
        toast.success("任务已恢复执行")
        loadLogs()
      } else {
        toast.error(result.error || "恢复失败")
      }
    } catch (err) {
      toast.error("恢复执行失败")
    }
  }

  // 检查某条日志对应的任务是否可以恢复
  const canRecoverLog = (log: AuditLog): boolean => {
    if (log.action !== "task_approved") return false
    if (!log.task_id) return false
    // 检查该任务当前是否为 approved 状态
    return true
  }

  const formatTime = (iso: string) => {
    const d = new Date(iso)
    return d.toLocaleString("zh-CN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    })
  }

  const formatDetails = (details: Record<string, unknown>) => {
    if (!details || Object.keys(details).length === 0) return "无详情"
    try {
      return JSON.stringify(details).slice(0, 200)
    } catch {
      return "无法解析"
    }
  }

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">加载中...</p>
      </div>
    )
  }

  if (!session?.user) return null

  const filterOptions = [
    { value: "all", label: "全部" },
    { value: "task_created", label: "创建任务" },
    { value: "ai_executed", label: "AI 执行" },
    { value: "task_approved", label: "审批通过" },
    { value: "task_rejected", label: "审批驳回" },
    { value: "task_resumed", label: "恢复执行" },
    { value: "workflow_created", label: "创建工作流" },
    { value: "ai_failed", label: "AI 失败" },
  ]

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="border-b bg-background">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/" className="text-xl font-bold">
            WorkflowGuard
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/dashboard"><Button variant="ghost" size="sm">仪表盘</Button></Link>
            <Link href="/workflows/new"><Button variant="ghost" size="sm">创建工作流</Button></Link>
            <Link href="/tasks"><Button variant="ghost" size="sm">任务列表</Button></Link>
            <span className="text-sm text-muted-foreground">{session.user.email}</span>
            <Avatar className="h-8 w-8">
              <AvatarImage src={session.user.image ?? undefined} />
              <AvatarFallback>{session.user.name?.charAt(0) ?? "U"}</AvatarFallback>
            </Avatar>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold mb-1">审计日志</h1>
            <p className="text-muted-foreground">所有操作全程记录，确保可追溯</p>
          </div>
          <Button variant="outline" size="sm" onClick={loadLogs} disabled={loading}>
            {loading ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <RefreshCw className="h-3 w-3 mr-1" />}
            刷新
          </Button>
        </div>

        {/* 筛选区 */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex flex-wrap gap-3 items-center">
              {/* 搜索 */}
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="搜索操作类型或详情..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  className="pl-10"
                />
              </div>

              {/* 高级筛选切换 */}
              <Button variant="outline" size="sm" onClick={() => setShowFilters(!showFilters)}>
                <Filter className="h-3 w-3 mr-1" />
                {showFilters ? "收起" : "更多筛选"}
              </Button>

              {/* 日期筛选 */}
              {showFilters && (
                <>
                  <div className="flex items-center gap-1">
                    <Calendar className="h-3 w-3 text-muted-foreground" />
                    <Input
                      type="date"
                      value={dateFrom}
                      onChange={(e) => setDateFrom(e.target.value)}
                      className="w-32 h-8 text-sm"
                    />
                    <span className="text-xs text-muted-foreground">至</span>
                    <Input
                      type="date"
                      value={dateTo}
                      onChange={(e) => setDateTo(e.target.value)}
                      className="w-32 h-8 text-sm"
                    />
                  </div>
                  <Button variant="outline" size="sm" onClick={() => { setDateFrom(""); setDateTo(""); setPagination(p => ({ ...p, page: 0 })); loadLogs(); }}>
                    重置
                  </Button>
                </>
              )}
            </div>

            {/* 操作类型筛选 */}
            <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t">
              {filterOptions.map((opt) => (
                <Button
                  key={opt.value}
                  variant={filterAction === opt.value ? "default" : "outline"}
                  size="sm"
                  onClick={() => { setFilterAction(opt.value); setPagination(p => ({ ...p, page: 0 })); }}
                >
                  {opt.label}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* 日志列表 */}
        {loading ? (
          <div className="text-center py-12">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
            <p className="text-muted-foreground mt-4">加载中...</p>
          </div>
        ) : logs.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Activity className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground mb-2">暂无审计日志</p>
              <p className="text-xs text-muted-foreground">创建工作流或执行任务后，操作记录将显示在这里</p>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* 表格视图 */}
            <div className="rounded-lg border overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left px-4 py-2 font-medium text-muted-foreground">时间</th>
                    <th className="text-left px-4 py-2 font-medium text-muted-foreground">操作</th>
                    <th className="text-left px-4 py-2 font-medium text-muted-foreground">任务</th>
                    <th className="text-left px-4 py-2 font-medium text-muted-foreground">详情</th>
                    <th className="text-right px-4 py-2 font-medium text-muted-foreground">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => {
                    const cfg = ACTION_LABELS[log.action] ?? { label: log.action, color: "bg-slate-100 text-slate-700", icon: <Activity className="h-3 w-3" /> }
                    const isApproved = log.action === "task_approved" && log.task_id
                    return (
                      <tr key={log.id} className="border-t hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            {formatTime(log.created_at)}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <Badge className={`${cfg.color} font-normal`}>
                            <span className="mr-1">{cfg.icon}</span>
                            {cfg.label}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          {log.task_id ? (
                            <Badge variant="outline" className="text-xs font-mono">
                              #{log.task_id.slice(0, 8)}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground text-xs">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 max-w-xs">
                          <p className="text-xs text-muted-foreground truncate">{formatDetails(log.details)}</p>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button variant="ghost" size="sm" onClick={() => setSelectedLog(log)}>
                              <Eye className="h-3 w-3" />
                            </Button>
                            {isApproved && (
                              <Button variant="ghost" size="sm" onClick={() => handleRecover(log.task_id!)} className="text-cyan-600 hover:text-cyan-700">
                                <RefreshCcw className="h-3 w-3" />
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* 分页 */}
            <div className="flex items-center justify-between mt-6">
              <p className="text-sm text-muted-foreground">
                共 {pagination.total} 条记录，第 {pagination.page + 1}/{pagination.totalPages} 页
              </p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={pagination.page === 0} onClick={() => setPagination(p => ({ ...p, page: p.page - 1 }))}>
                  <ChevronLeft className="h-4 w-4 mr-1" />上一页
                </Button>
                <Button variant="outline" size="sm" disabled={pagination.page >= pagination.totalPages - 1} onClick={() => setPagination(p => ({ ...p, page: p.page + 1 }))}>
                  下一页<ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>
          </>
        )}
      </main>

      {/* 详情弹窗 */}
      {selectedLog && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-lg max-h-[80vh] overflow-y-auto">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">审计日志详情</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setSelectedLog(null)}>✕</Button>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-xs text-muted-foreground">操作类型</Label>
                <p className="font-medium">{ACTION_LABELS[selectedLog.action]?.label ?? selectedLog.action}</p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">时间</Label>
                <p className="text-sm">{formatTime(selectedLog.created_at)}</p>
              </div>
              {selectedLog.task_id && (
                <div><Label className="text-xs text-muted-foreground">关联任务</Label><p className="text-sm font-mono">{selectedLog.task_id}</p></div>
              )}
              {selectedLog.workflow_id && (
                <div><Label className="text-xs text-muted-foreground">关联工作流</Label><p className="text-sm font-mono">{selectedLog.workflow_id}</p></div>
              )}
              <div>
                <Label className="text-xs text-muted-foreground">详情数据</Label>
                <pre className="bg-muted rounded-lg p-3 text-xs font-mono mt-1 overflow-x-auto">
                  {JSON.stringify(selectedLog.details, null, 2)}
                </pre>
              </div>
              {selectedLog.ip_address && (
                <div><Label className="text-xs text-muted-foreground">IP 地址</Label><p className="text-sm">{selectedLog.ip_address}</p></div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
