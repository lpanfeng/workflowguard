"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { NavBar } from "@/components/NavBar"
import { MobileNav } from "@/components/MobileNav"
import { Loader2, FileText, Download, BarChart3, TrendingUp, CheckCircle2, XCircle, Clock } from "lucide-react"
import { supabase } from "@/lib/supabase"

interface WeeklyReport {
  week: string
  totalExecutions: number
  successCount: number
  failedCount: number
  approvalCount: number
  rejectionCount: number
  avgApprovalTime: number | null
  successRate: number
  approvalRate: number
  retryCount: number
  retryRate: number
  workflows: { id: string; name: string; executions: number; successRate: number }[]
}

export default function ReportsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [report, setReport] = useState<WeeklyReport | null>(null)
  const [selectedWorkflow, setSelectedWorkflow] = useState<string>("all")
  const [workflows, setWorkflows] = useState<{ id: string; name: string }[]>([])
  const [weekRange, setWeekRange] = useState<string>("this-week")

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin")
      return
    }
    if (status === "authenticated") {
      fetchData()
    }
  }, [status])

  const fetchData = async () => {
    setLoading(true)
    try {
      // Fetch workflows for filter
      const { data: wfData } = await supabase
        .from("workflows")
        .select("id, name")
        .order("created_at", { ascending: false })

      if (wfData) {
        setWorkflows(wfData)
      }

      // Build API params
      const params = new URLSearchParams({
        range: weekRange,
        ...(selectedWorkflow !== "all" && { workflow_id: selectedWorkflow }),
      })

      const res = await fetch(`/api/reports/weekly?${params}`)
      if (!res.ok) throw new Error("Failed to fetch report")

      const data = await res.json()
      setReport(data)
    } catch (err) {
      console.error("Failed to fetch weekly report:", err)
    } finally {
      setLoading(false)
    }
  }

  const handleExportCSV = () => {
    if (!report) return
    const headers = ["Metric", "Value"]
    const rows = [
      ["Total Executions", report.totalExecutions],
      ["Success Count", report.successCount],
      ["Failed Count", report.failedCount],
      ["Approval Count", report.approvalCount],
      ["Rejection Count", report.rejectionCount],
      ["Success Rate", `${report.successRate.toFixed(1)}%`],
      ["Approval Rate", `${report.approvalRate.toFixed(1)}%`],
      ["Retry Count", report.retryCount],
      ["Retry Rate", `${report.retryRate.toFixed(1)}%`],
      ["Avg Approval Time", report.avgApprovalTime ? `${report.avgApprovalTime.toFixed(0)} min` : "N/A"],
    ]
    const csv = [headers.join(","), ...rows.map(r => r.join(","))].join("\n")
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `workflowguard-weekly-report-${report.week}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <NavBar />
      <main className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">执行报告</h1>
            <p className="text-muted-foreground mt-1">查看工作流执行统计与分析</p>
          </div>
          <Button onClick={handleExportCSV} variant="outline" disabled={!report}>
            <Download className="mr-2 h-4 w-4" />
            导出 CSV
          </Button>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label>时间范围</Label>
                <Select value={weekRange} onValueChange={(v) => setWeekRange(v || "")}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="this-week">本周</SelectItem>
                    <SelectItem value="last-week">上周</SelectItem>
                    <SelectItem value="two-weeks">近两周</SelectItem>
                    <SelectItem value="this-month">本月</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>工作流筛选</Label>
                <Select value={selectedWorkflow} onValueChange={(v) => setSelectedWorkflow(v || "")}>
                  <SelectTrigger>
                    <SelectValue placeholder="全部工作流" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">全部工作流</SelectItem>
                    {workflows.map((wf) => (
                      <SelectItem key={wf.id} value={wf.id}>{wf.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end">
                <Button onClick={fetchData} className="w-full">
                  <BarChart3 className="mr-2 h-4 w-4" />
                  刷新数据
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {report && (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">总执行次数</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{report.totalExecutions}</div>
                  <Badge variant="secondary" className="mt-2">
                    <Clock className="mr-1 h-3 w-3" />
                    {report.week}
                  </Badge>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">成功率</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-green-600">{report.successRate.toFixed(1)}%</div>
                  <div className="flex items-center gap-2 mt-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    <span className="text-sm text-muted-foreground">{report.successCount} 成功</span>
                    <XCircle className="h-4 w-4 text-red-500 ml-1" />
                    <span className="text-sm text-muted-foreground">{report.failedCount} 失败</span>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">审批通过率</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-blue-600">{report.approvalRate.toFixed(1)}%</div>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-sm text-muted-foreground">{report.approvalCount} 通过 / {report.rejectionCount} 驳回</span>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">重试率</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-orange-600">{report.retryRate.toFixed(1)}%</div>
                  <div className="flex items-center gap-2 mt-2">
                    <TrendingUp className="h-4 w-4 text-orange-500" />
                    <span className="text-sm text-muted-foreground">{report.retryCount} 次重试</span>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Avg Approval Time */}
            {report.avgApprovalTime && (
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle className="text-lg">审批效率</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    平均审批时长：<span className="text-blue-600">{report.avgApprovalTime.toFixed(0)} 分钟</span>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Per-Workflow Breakdown */}
            {report.workflows.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">各工作流执行明细</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {report.workflows.map((wf) => (
                      <div key={wf.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                        <div>
                          <span className="font-medium">{wf.name}</span>
                          <span className="text-sm text-muted-foreground ml-2">
                            {wf.executions} 次执行
                          </span>
                        </div>
                        <Badge variant={wf.successRate >= 80 ? "default" : wf.successRate >= 50 ? "secondary" : "destructive"}>
                          {wf.successRate.toFixed(1)}% 成功率
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}

        {!report && !loading && (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>暂无数据，请先创建工作流并执行</p>
            </CardContent>
          </Card>
        )}
      </main>
      <MobileNav />
    </div>
  )
}
