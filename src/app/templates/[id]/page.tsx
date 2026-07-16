"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { ArrowLeft, Edit2, Copy, Trash2, Play, Clock, CheckCircle2, AlertCircle, ExternalLink } from "lucide-react"
import Link from "next/link"
import { NavBar } from "@/components/NavBar"
import { MobileNav } from "@/components/MobileNav"
import { useTranslations } from "next-intl"

interface TemplateStep {
  step_name: string
  step_type: string
  description: string
}

interface Template {
  id: string
  name: string
  description: string
  category: string
  steps: TemplateStep[]
  config: Record<string, any>
  created_at: string
  updated_at: string
  user_id?: string
}

export default function TemplateDetailPage() {
  const params = useParams()
  const router = useRouter()
  const t = useTranslations("Templates")
  const [template, setTemplate] = useState<Template | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [activeTab, setActiveTab] = useState("overview")

  useEffect(() => {
    if (params.id) fetchTemplate()
  }, [params.id])

  const fetchTemplate = async () => {
    try {
      const res = await fetch(`/api/templates/${params.id}`)
      if (!res.ok) throw new Error("Template not found")
      const data = await res.json()
      setTemplate(data)
    } catch (err: any) {
      setError(err.message || "Failed to load template")
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm("确定要删除这个模板吗？此操作不可撤销。")) return
    try {
      const res = await fetch(`/api/templates/${params.id}`, { method: "DELETE" })
      if (res.ok) router.push("/templates")
    } catch (err) {
      alert("删除失败")
    }
  }

  const handleDuplicate = async () => {
    if (!template) return
    try {
      const res = await fetch("/api/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...template,
          name: `${template.name} (副本)`,
          id: undefined,
          created_at: undefined,
          updated_at: undefined,
        }),
      })
      if (res.ok) router.push("/templates")
    } catch (err) {
      alert("复制失败")
    }
  }

  const getTypeBadge = (type: string) => {
    const colors: Record<string, string> = {
      action: "bg-blue-100 text-blue-800",
      ai_execute: "bg-purple-100 text-purple-800",
      human_approve: "bg-amber-100 text-amber-800",
      notify: "bg-green-100 text-green-800",
    }
    const labels: Record<string, string> = {
      action: "操作",
      ai_execute: "AI执行",
      human_approve: "人工审批",
      notify: "通知",
    }
    return (
      <Badge className={colors[type] || "bg-gray-100"}>
        {labels[type] || type}
      </Badge>
    )
  }

  if (loading) return (
    <div className="min-h-screen bg-background">
      <NavBar />
      <main className="container mx-auto px-4 py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-64 bg-muted rounded" />
          <div className="h-4 w-96 bg-muted rounded" />
          <div className="space-y-3 mt-8">
            {[1,2,3].map(i => <div key={i} className="h-20 bg-muted rounded-lg" />)}
          </div>
        </div>
      </main>
    </div>
  )

  if (error || !template) return (
    <div className="min-h-screen bg-background">
      <NavBar />
      <main className="container mx-auto px-4 py-8">
        <Card className="max-w-2xl mx-auto">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="h-12 w-12 mx-auto text-destructive mb-4" />
            <h2 className="text-xl font-semibold mb-2">未找到模板</h2>
            <p className="text-muted-foreground mb-4">{error || "该模板可能已被删除"}</p>
            <Button onClick={() => router.push("/templates")}>返回模板库</Button>
          </CardContent>
        </Card>
      </main>
    </div>
  )

  return (
    <div className="min-h-screen bg-background">
      <NavBar />
      <main className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-center gap-3">
            <Link href="/templates">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-1" /> 返回
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                {template.name}
                <Badge variant="outline" className="ml-2">{template.category}</Badge>
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                创建于 {new Date(template.created_at).toLocaleDateString("zh-CN")} · 
                更新于 {new Date(template.updated_at).toLocaleDateString("zh-CN")}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleDuplicate}>
              <Copy className="h-4 w-4 mr-1" /> 复制
            </Button>
            <Link href={`/templates/${template.id}/edit`}>
              <Button variant="outline" size="sm">
                <Edit2 className="h-4 w-4 mr-1" /> 编辑
              </Button>
            </Link>
            <Button variant="destructive" size="sm" onClick={handleDelete}>
              <Trash2 className="h-4 w-4 mr-1" /> 删除
            </Button>
          </div>
        </div>

        {/* Description */}
        {template.description && (
          <Card className="mb-6">
            <CardContent className="pt-6">
              <p className="text-foreground">{template.description}</p>
            </CardContent>
          </Card>
        )}

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview">概览</TabsTrigger>
            <TabsTrigger value="steps">工作流步骤</TabsTrigger>
            <TabsTrigger value="config">配置</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4 mt-4">
            <Card>
              <CardHeader>
                <CardTitle>模板信息</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between py-2 border-b">
                  <span className="text-muted-foreground">ID</span>
                  <code className="text-xs bg-muted px-2 py-1 rounded">{template.id}</code>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="text-muted-foreground">分类</span>
                  <span>{template.category}</span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="text-muted-foreground">步骤数</span>
                  <span>{template.steps?.length || 0}</span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-muted-foreground">类型分布</span>
                  <div className="flex gap-1">
                    {["action","ai_execute","human_approve","notify"].map(type => {
                      const count = (template.steps || []).filter(s => s.step_type === type).length
                      return count > 0 ? <Badge key={type} variant="secondary">{getTypeBadge(type)} ×{count}</Badge> : null
                    })}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>快速操作</CardTitle>
              </CardHeader>
              <CardContent className="flex gap-3">
                <Button onClick={() => router.push(`/workflows/new?template=${template.id}`)}>
                  <Play className="h-4 w-4 mr-1" /> 基于此模板创建工作流
                </Button>
                <Button variant="outline" onClick={handleDuplicate}>
                  <Copy className="h-4 w-4 mr-1" /> 复制模板
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="steps" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>工作流步骤 ({template.steps?.length || 0})</CardTitle>
                <CardDescription>定义模板的执行流程</CardDescription>
              </CardHeader>
              <CardContent>
                {(!template.steps || template.steps.length === 0) ? (
                  <p className="text-muted-foreground text-center py-8">暂无步骤，请编辑模板添加</p>
                ) : (
                  <div className="space-y-3">
                    {template.steps.map((step, idx) => (
                      <div key={idx} className="flex gap-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">
                          {idx + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium truncate">{step.step_name || "(未命名)"}</span>
                            {getTypeBadge(step.step_type)}
                          </div>
                          {step.description && (
                            <p className="text-sm text-muted-foreground line-clamp-2">{step.description}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="config" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>高级配置</CardTitle>
                <CardDescription>模板的额外参数和配置</CardDescription>
              </CardHeader>
              <CardContent>
                {Object.keys(template.config || {}).length > 0 ? (
                  <pre className="bg-muted p-4 rounded-lg text-sm overflow-x-auto">
                    {JSON.stringify(template.config, null, 2)}
                  </pre>
                ) : (
                  <p className="text-muted-foreground text-center py-8">暂无自定义配置</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
      <MobileNav />
    </div>
  )
}
