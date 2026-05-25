"use client"

import { useState, useEffect } from "react"
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
  Filter,
  Clock,
  FileText,
  UserCheck,
  XCircle,
  CheckCircle2,
  Activity,
  PlusCircle,
  Edit,
  Power,
  LogIn,
  RefreshCw,
  AlertTriangle,
} from "lucide-react"

// 操作类型映射
const ACTION_LABELS: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  task_created: {
    label: "创建任务",
    color: "bg-blue-100 text-blue-700",
    icon: <PlusCircle className="h-3 w-3" />,
  },
  ai_executed: {
    label: "AI 执行",
    color: "bg-purple-100 text-purple-700",
    icon: <Activity className="h-3 w-3" />,
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
    icon: <Edit className="h-3 w-3" />,
  },
  task_completed: {
    label: "完成任务",
    color: "bg-green-100 text-green-700",
    icon: <CheckCircle2 className="h-3 w-3" />,
  },
  workflow_created: {
    label: "创建工作流",
    color: "bg-blue-100 text-blue-700",
    icon: <FileText className="h-3 w-3" />,
  },
  workflow_updated: {
    label: "更新工作流",
    color: "bg-amber-100 text-amber-700",
    icon: <Edit className="h-3 w-3" />,
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

const PAGE_SIZE = 20

export default function AuditLogsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(true)
  const [totalCount, setTotalCount] = useState(0)
  const [page, setPage] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [filterAction, setFilterAction] = useState<string>("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null)

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/login")
    }
  }, [status, router])

  useEffect(() => {
    if (session?.user?.id) {
      loadLogs()
    }
  }, [session, page, filterAction])

  const loadLogs = async () => {
    if (!session?.user?.id) return
    setLoading(true)

    try {
      let query = supabase
        .from("audit_logs")
        .select("*", { count: "exact" })
        .eq("user_id", session.user.id)
        .order("created_at", { ascending: false })
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1)

      if (filterAction !== "all") {
        query = query.eq("action", filterAction)
      }

      const { data, count, error } = await query

      if (error) throw error

      setLogs(data ?? [])
      setTotalCount(count ?? 0)
      setTotalPages(Math.ceil((count ?? 0) / PAGE_SIZE))
    } catch (err) {
      console.error("加载审计日志失败:", err)
      toast.error("加载审计日志失败")
    } finally {
      setLoading(false)
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

  const filteredLogs = logs.filter((log) => {
    if (!searchQuery) return true
    const q = searchQuery.toLowerCase()
    return (
      log.action.toLowerCase().includes(q) ||
      JSON.stringify(log.details).toLowerCase().includes(q) ||
      (log.task_id && log.task_id.toLowerCase().includes(q)) ||
      (log.workflow_id && log.workflow_id.toLowerCase().includes(q))
    )
  })

  return (
    <div className="min-h-screen bg-muted/30">
      {/* 顶部导航 */}
      <header className="border-b bg-background">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/" className="text-xl font-bold">
            WorkflowGuard
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/dashboard">
              <Button variant="ghost" size="sm">仪表盘</Button>
            </Link>
            <Link href="/workflows/new">
              <Button variant="ghost" size="sm">创建工作流</Button>
            </Link>
            <Link href="/tasks">
              <Button variant="ghost" size="sm">任务列表</Button>
            </Link>
            <span className="text-sm text-muted-foreground">
              {session.user.email}
            </span>
            <Avatar className="h-8 w-8">
              <AvatarImage src={session.user.image ?? undefined} />
              <AvatarFallback>
                {session.user.name?.charAt(0) ?? "U"}
              </AvatarFallback>
            </Avatar>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold mb-1">审计日志</h1>
            <p className="text-muted-foreground">
              所有操作全程记录，确保可追溯
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={loadLogs} disabled={loading}>
            {loading ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <RefreshCw className="h-3 w-3 mr-1" />}
            刷新
          </Button>
        </div>

        {/* 筛选区 */}
        <div className="flex flex-wrap gap-3 mb-6 items-center">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="搜索操作类型或详情..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {[
              { value: "all", label: "全部" },
              { value: "task_created", label: "创建任务" },
              { value: "ai_executed", label: "AI 执行" },
              { value: "task_approved", label: "审批通过" },
              { value: "task_rejected", label: "审批驳回" },
              { value: "workflow_created", label: "创建工作流" },
            ].map((opt) => (
              <Button
                key={opt.value}
                variant={filterAction === opt.value ? "default" : "outline"}
                size="sm"
                onClick={() => {
                  setFilterAction(opt.value)
                  setPage(0)
                }}
              >
                {opt.label}
              </Button>
            ))}
          </div>
        </div>

        {/* 日志列表 */}
        {loading ? (
          <div className="text-center py-12">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
            <p className="text-muted-foreground mt-4">加载中...</p>
          </div>
        ) : filteredLogs.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Activity className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground mb-2">暂无审计日志</p>
              <p className="text-xs text-muted-foreground">
                创建工作流或执行任务后，操作记录将显示在这里
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="space-y-2">
              {filteredLogs.map((log) => {
                const cfg = ACTION_LABELS[log.action] ?? {
                  label: log.action,
                  color: "bg-slate-100 text-slate-700",
                  icon: <Activity className="h-3 w-3" />,
                }
                return (
                  <Card
                    key={log.id}
                    className="hover:shadow-sm transition-shadow cursor-pointer"
                    onClick={() => setSelectedLog(log)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div className={`p-1.5 rounded-full ${cfg.color}`}>
                          {cfg.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm">{cfg.label}</span>
                            {log.task_id && (
                              <Badge variant="outline" className="text-xs font-mono">
                                #{log.task_id.slice(0, 8)}
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatTime(log.created_at)}
                          </p>
                          {log.details && Object.keys(log.details).length > 0 && (
                            <p className="text-xs text-muted-foreground mt-1 truncate max-w-md">
                              {JSON.stringify(log.details).slice(0, 120)}
                            </p>
                          )}
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>

            {/* 分页 */}
            <div className="flex items-center justify-between mt-6">
              <p className="text-sm text-muted-foreground">
                共 {totalCount} 条记录，第 {page + 1}/{totalPages} 页
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page === 0}
                  onClick={() => setPage((p) => p - 1)}
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  上一页
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages - 1}
                  onClick={() => setPage((p) => p + 1)}
                >
                  下一页
                  <ChevronRight className="h-4 w-4 ml-1" />
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
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">审计日志详情</CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedLog(null)}
                >
                  ✕
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-xs text-muted-foreground">操作类型</Label>
                <p className="font-medium">
                  {ACTION_LABELS[selectedLog.action]?.label ?? selectedLog.action}
                </p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">时间</Label>
                <p className="text-sm">{formatTime(selectedLog.created_at)}</p>
              </div>
              {selectedLog.task_id && (
                <div>
                  <Label className="text-xs text-muted-foreground">关联任务</Label>
                  <p className="text-sm font-mono">{selectedLog.task_id}</p>
                </div>
              )}
              {selectedLog.workflow_id && (
                <div>
                  <Label className="text-xs text-muted-foreground">关联工作流</Label>
                  <p className="text-sm font-mono">{selectedLog.workflow_id}</p>
                </div>
              )}
              <div>
                <Label className="text-xs text-muted-foreground">详情数据</Label>
                <pre className="bg-muted rounded-lg p-3 text-xs font-mono mt-1 overflow-x-auto">
                  {JSON.stringify(selectedLog.details, null, 2)}
                </pre>
              </div>
              {selectedLog.ip_address && (
                <div>
                  <Label className="text-xs text-muted-foreground">IP 地址</Label>
                  <p className="text-sm">{selectedLog.ip_address}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
