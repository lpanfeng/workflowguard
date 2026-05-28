"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { supabase } from "@/lib/supabase"
import { NavBar } from "@/components/NavBar"
import { WORKFLOW_TEMPLATES } from "@/lib/workflow-templates"
import { toast } from "sonner"
import { Loader2, Plus, Play, Pause, Trash2, ExternalLink, ChevronRight } from "lucide-react"
import Link from "next/link"

type WorkflowRecord = {
  id: string
  user_id: string
  name: string
  description: string | null
  template_id: string
  config: Record<string, unknown>
  is_active: boolean
  created_at: string
}

const templateIcons: Record<string, string> = {
  "customer-service": "🎧",
  "content-publish": "📝",
  "data-entry": "📊",
}

export default function WorkflowListPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [workflows, setWorkflows] = useState<WorkflowRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/login")
    }
  }, [status, router])

  useEffect(() => {
    if (!session?.user?.id) return

    const fetchWorkflows = async () => {
      try {
        const { data, error } = await supabase
          .from("workflows")
          .select("*")
          .eq("user_id", session.user.id)
          .order("created_at", { ascending: false })

        if (error) throw error
        setWorkflows(data ?? [])
      } catch (err) {
        console.error("获取工作流列表失败:", err)
        toast.error("加载工作流列表失败")
      } finally {
        setLoading(false)
      }
    }

    fetchWorkflows()
  }, [session?.user?.id])

  const handleToggleActive = async (workflow: WorkflowRecord) => {
    try {
      const { error } = await supabase
        .from("workflows")
        .update({ is_active: !workflow.is_active })
        .eq("id", workflow.id)

      if (error) throw error

      setWorkflows((prev) =>
        prev.map((w) =>
          w.id === workflow.id ? { ...w, is_active: !w.is_active } : w
        )
      )
      toast.success(workflow.is_active ? "已停用工作流" : "已启用工作流")
    } catch (err) {
      console.error(err)
      toast.error("操作失败")
    }
  }

  const handleDelete = async (workflowId: string) => {
    try {
      const { error } = await supabase
        .from("workflows")
        .update({ is_active: false })
        .eq("id", workflowId)

      if (error) throw error

      setWorkflows((prev) => prev.filter((w) => w.id !== workflowId))
      toast.success("工作流已删除")
      setConfirmDelete(null)
    } catch (err) {
      console.error(err)
      toast.error("删除失败")
    }
  }

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin mr-2" />
        <p className="text-muted-foreground">加载中...</p>
      </div>
    )
  }

  if (!session?.user) return null

  const activeCount = workflows.filter((w) => w.is_active).length

  return (
    <div className="min-h-screen bg-muted/30">
      <NavBar />

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        {/* 页面标题 */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">工作流</h1>
            <p className="text-muted-foreground mt-1">
              管理和监控你的工作流
            </p>
          </div>
          <Link href="/workflows/new">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              新建工作流
            </Button>
          </Link>
        </div>

        {/* 概览统计 */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-2xl">{workflows.length}</CardTitle>
              <CardDescription>总工作流</CardDescription>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-2xl">{activeCount}</CardTitle>
              <CardDescription>活跃中</CardDescription>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-2xl">{workflows.length - activeCount}</CardTitle>
              <CardDescription>已停用</CardDescription>
            </CardHeader>
          </Card>
        </div>

        {/* 工作流列表 */}
        {workflows.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-3xl mb-4">📋</p>
              <p className="text-lg font-medium mb-2">还没有工作流</p>
              <p className="text-muted-foreground mb-6">从模板创建一个工作流，开始使用 AI + 人工审批流程</p>
              <Link href="/workflows/new">
                <Button size="lg">
                  <Plus className="h-4 w-4 mr-2" />
                  创建第一个工作流
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {workflows.map((workflow) => {
              const template = WORKFLOW_TEMPLATES.find((t) => t.id === workflow.template_id)
              return (
                <Card key={workflow.id} className="hover:shadow-sm transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <span className="text-2xl">
                          {templateIcons[workflow.template_id] ?? "📋"}
                        </span>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-medium">{workflow.name}</p>
                            {template && (
                              <Badge variant="secondary" className="text-xs">
                                {template.name}
                              </Badge>
                            )}
                            <Badge
                              variant={workflow.is_active ? "default" : "outline"}
                              className="text-xs"
                            >
                              {workflow.is_active ? "活跃" : "停用"}
                            </Badge>
                          </div>
                          {workflow.description && (
                            <p className="text-sm text-muted-foreground mt-0.5">
                              {workflow.description}
                            </p>
                          )}
                          <p className="text-xs text-muted-foreground mt-1">
                            创建于 {new Date(workflow.created_at).toLocaleDateString("zh-CN")}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleToggleActive(workflow)}
                          title={workflow.is_active ? "停用" : "启用"}
                        >
                          {workflow.is_active ? (
                            <Pause className="h-4 w-4" />
                          ) : (
                            <Play className="h-4 w-4" />
                          )}
                        </Button>
                        {confirmDelete === workflow.id ? (
                          <div className="flex gap-1">
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => handleDelete(workflow.id)}
                            >
                              确认
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setConfirmDelete(null)}
                            >
                              取消
                            </Button>
                          </div>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setConfirmDelete(workflow.id)}
                            title="删除"
                          >
                            <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}
