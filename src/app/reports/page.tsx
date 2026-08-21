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
import { NavBar } from "@/components/NavBar"
import { MobileNav } from "@/components/MobileNav"
import { Loader2, FileText, Download, BarChart3, TrendingUp, CheckCircle2, XCircle, Clock, Cpu, TrendingDown } from "lucide-react"
import { supabase } from "@/lib/supabase"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  CartesianGrid,
} from "recharts"

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
  modelDistribution: Record<string, number>
  dailyTrend: Array<{ date: string; label: string; executions: number; success: number; failed: number }>
}

const MODEL_LABELS: Record<string, string> = {
  "deepseek-chat": "DeepSeek",
  "deepseek-reasoner": "DeepSeek R1",
  "gpt-4o": "GPT-4o",
  "gpt-4o-mini": "GPT-4o Mini",
  "claude-3-5-sonnet": "Claude 3.5",
  "claude-3-haiku": "Claude 3 Haiku",
  "mock": "模拟模式",
  "unknown": "未知",
}

const CHART_COLORS = ["#6366f1", "#22c55e", "#f59e0b", "#ef4444", "#3b82f6", "#8b5cf6", "#ec4899", "#14b8a6"]

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
      const { data: wfData } = await supabase
        .from("workflows")
        .select("id, name")
        .order("created_at", { ascending: false })

      if (wfData) {
        setWorkflows(wfData)
      }

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

  const primaryModel = Object.entries(report?.modelDistribution ?? {})
    .sort((a, b) => b[1] - a[1])[0]
  const primaryModelLabel = MODEL_LABELS[primaryModel?.[0] ?? ""] ?? primaryModel?.[0] ?? "N/A"

  return (
    <div className="min-h-screen bg-background">
      <NavBar />
      <main className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">执行报告</h1>
            <p className="text-muted-foreground mt-1">查看工作流执行统计与AI调用分析</p>
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
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    总执行次数
                  </CardTitle>
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
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" />
                    成功率
                  </CardTitle>
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
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4" />
                    审批通过率
                  </CardTitle>
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
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <Cpu className="h-4 w-4" />
                    主用AI模型
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{primaryModelLabel}</div>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-sm text-muted-foreground">{primaryModel?.[1] ?? 0} 次调用</span>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Tabs defaultValue="trend" className="mb-6">
              <TabsList>
                <TabsTrigger value="trend">趋势分析</TabsTrigger>
                <TabsTrigger value="models">AI模型分布</TabsTrigger>
                <TabsTrigger value="workflows">工作流明细</TabsTrigger>
              </TabsList>

              {/* Trend Chart */}
              <TabsContent value="trend">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <TrendingUp className="h-5 w-5 text-primary" />
                      7日执行趋势
                    </CardTitle>
                    <CardDescription>每日工作流执行次数与成功率变化</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {report.dailyTrend.length > 0 && report.dailyTrend.some(d => d.executions > 0) ? (
                      <div className="h-72">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={report.dailyTrend} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                            <XAxis dataKey="label" fontSize={12} tickLine={false} axisLine={false} />
                            <YAxis fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
                            <Tooltip
                              contentStyle={{
                                borderRadius: "8px",
                                border: "1px solid hsl(var(--border))",
                                background: "hsl(var(--card))",
                                fontSize: "13px",
                              }}
                            />
                            <Legend wrapperStyle={{ fontSize: "12px" }} />
                            <Bar dataKey="executions" name="执行次数" fill="hsl(238.1 76.2% 60.3%)" radius={[4, 4, 0, 0]} />
                            <Bar dataKey="success" name="成功" fill="hsl(142.1 76.2% 36.3%)" radius={[4, 4, 0, 0]} />
                            <Bar dataKey="failed" name="失败" fill="hsl(0 84.2% 60.2%)" radius={[4, 4, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    ) : (
                      <div className="h-72 flex items-center justify-center">
                        <p className="text-muted-foreground">暂无趋势数据</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Model Distribution */}
              <TabsContent value="models">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-lg">
                        <Cpu className="h-5 w-5 text-primary" />
                        AI模型调用分布
                      </CardTitle>
                      <CardDescription>各AI模型的使用频次统计</CardDescription>
                    </CardHeader>
                    <CardContent>
                      {Object.keys(report.modelDistribution).length > 0 ? (
                        <div className="h-72">
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie
                                data={Object.entries(report.modelDistribution).map(([name, value]) => ({
                                  name: MODEL_LABELS[name] ?? name,
                                  value,
                                }))}
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={100}
                                paddingAngle={5}
                                dataKey="value"
                              >
                                {Object.keys(report.modelDistribution).map((_entry, index) => (
                                  <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                                ))}
                              </Pie>
                              <Tooltip
                                formatter={(value: number) => [`${value} 次`, '调用次数']}
                                contentStyle={{
                                  borderRadius: "8px",
                                  border: "1px solid hsl(var(--border))",
                                  background: "hsl(var(--card))",
                                  fontSize: "13px",
                                }}
                              />
                              <Legend wrapperStyle={{ fontSize: "12px" }} />
                            </PieChart>
                          </ResponsiveContainer>
                        </div>
                      ) : (
                        <div className="h-72 flex items-center justify-center">
                          <p className="text-muted-foreground">暂无AI调用数据</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-lg">
                        <BarChart3 className="h-5 w-5 text-primary" />
                        模型调用排行
                      </CardTitle>
                      <CardDescription>按调用次数排序</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {Object.entries(report.modelDistribution)
                          .sort((a, b) => b[1] - a[1])
                          .map(([model, count], idx) => {
                            const total = Object.values(report.modelDistribution).reduce((s, v) => s + v, 0)
                            const pct = total > 0 ? ((count / total) * 100).toFixed(1) : "0"
                            return (
                              <div key={model} className="flex items-center gap-3">
                                <span className="text-xs font-mono text-muted-foreground w-6">{idx + 1}</span>
                                <div className="flex-1">
                                  <div className="flex items-center justify-between mb-1">
                                    <span className="text-sm font-medium">{MODEL_LABELS[model] ?? model}</span>
                                    <span className="text-sm text-muted-foreground">{count} 次 ({pct}%)</span>
                                  </div>
                                  <div className="bg-muted rounded-full h-2">
                                    <div
                                      className="h-2 rounded-full transition-all"
                                      style={{
                                        width: `${pct}%`,
                                        background: CHART_COLORS[idx % CHART_COLORS.length],
                                      }}
                                    />
                                  </div>
                                </div>
                              </div>
                            )
                          })}
                        {Object.keys(report.modelDistribution).length === 0 && (
                          <p className="text-center text-muted-foreground py-8">暂无数据</p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              {/* Workflow Breakdown */}
              <TabsContent value="workflows">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">各工作流执行明细</CardTitle>
                    <CardDescription>每个工作流的执行次数与成功率</CardDescription>
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
                      {report.workflows.length === 0 && (
                        <p className="text-center text-muted-foreground py-8">暂无工作流数据</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>

            {/* Approval Efficiency */}
            {report.avgApprovalTime && (
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle className="text-lg">审批效率</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                      <p className="text-sm text-muted-foreground">平均审批时长</p>
                      <p className="text-2xl font-bold text-blue-600">{report.avgApprovalTime.toFixed(0)} 分钟</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">总审批次数</p>
                      <p className="text-2xl font-bold">{report.approvalCount + report.rejectionCount}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">重试次数</p>
                      <p className="text-2xl font-bold text-orange-600">{report.retryCount} <span className="text-sm text-muted-foreground font-normal">({report.retryRate.toFixed(1)}%)</span></p>
                    </div>
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
