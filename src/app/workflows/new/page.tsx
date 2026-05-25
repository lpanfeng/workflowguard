"use client"

import { Suspense, useState } from "react"
import { useSession } from "next-auth/react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { supabase } from "@/lib/supabase"
import { WORKFLOW_TEMPLATES, type WorkflowTemplate } from "@/lib/workflow-templates"
import { toast } from "sonner"
import { ArrowLeft, Check, ChevronRight, Loader2 } from "lucide-react"
import Link from "next/link"
import { useEffect } from "react"

function NewWorkflowForm() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const searchParams = useSearchParams()
  const preselectedTemplate = searchParams.get("template")

  const [step, setStep] = useState<"select" | "configure">(
    preselectedTemplate ? "configure" : "select"
  )
  const [selectedTemplate, setSelectedTemplate] = useState<WorkflowTemplate | null>(
    preselectedTemplate
      ? WORKFLOW_TEMPLATES.find((t) => t.id === preselectedTemplate) ?? null
      : null
  )
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [isActive, setIsActive] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/login")
    }
  }, [status, router])

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">加载中...</p>
      </div>
    )
  }

  if (!session?.user) return null

  const handleSelectTemplate = (template: WorkflowTemplate) => {
    setSelectedTemplate(template)
    setName(template.name)
    setDescription(template.description)
    setStep("configure")
  }

  const handleSave = async () => {
    if (!selectedTemplate || !name.trim()) {
      toast.error("请填写工作流名称")
      return
    }

    setSaving(true)
    try {
      // 1. 检查配额
      const { data: profile } = await supabase
        .from("profiles")
        .select("workflow_quota, plan")
        .eq("id", session.user.id)
        .single()

      if (!profile) {
        toast.error("无法获取用户信息")
        setSaving(false)
        return
      }

      // 2. 统计已有活跃工作流数
      const { count } = await supabase
        .from("workflows")
        .select("*", { count: "exact", head: true })
        .eq("user_id", session.user.id)
        .eq("is_active", true)

      if (count != null && count >= profile.workflow_quota) {
        toast.error(`免费版最多创建 ${profile.workflow_quota} 个活跃工作流，请升级套餐或停用其他工作流`)
        setSaving(false)
        return
      }

      // 3. 创建新工作流
      const { error } = await supabase.from("workflows").insert({
        user_id: session.user.id,
        template_id: selectedTemplate.id,
        name: name.trim(),
        description: description.trim() || null,
        config: {},
        is_active: isActive,
      })

      if (error) {
        toast.error(`创建失败: ${error.message}`)
        setSaving(false)
        return
      }

      toast.success("工作流创建成功！")
      router.push("/dashboard")
    } catch (err) {
      toast.error("创建失败，请稍后重试")
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  const templateIcons: Record<string, string> = {
    "customer-service": "🎧",
    "content-publish": "📝",
    "data-entry": "📊",
  }

  return (
    <div className="min-h-screen bg-muted/30">
      {/* 顶部导航 */}
      <header className="border-b bg-background">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/" className="text-xl font-bold">
            WorkflowGuard
          </Link>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">{session.user.email}</span>
            <Avatar className="h-8 w-8">
              <AvatarImage src={session.user.image ?? undefined} />
              <AvatarFallback>{session.user.name?.charAt(0) ?? "U"}</AvatarFallback>
            </Avatar>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-3xl">
        {/* 返回按钮 */}
        {step === "configure" && (
          <button
            onClick={() => {
              setStep("select")
              setSelectedTemplate(null)
            }}
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            返回选择模板
          </button>
        )}

        {/* 步骤指示器 */}
        <div className="flex items-center gap-2 mb-8">
          <div
            className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium ${
              step === "select" || step === "configure"
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground"
            }`}
          >
            {step === "configure" ? <Check className="h-4 w-4" /> : "1"}
          </div>
          <span className="text-sm font-medium">选择模板</span>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
          <div
            className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium ${
              step === "configure"
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground"
            }`}
          >
            2
          </div>
          <span className="text-sm font-medium">配置工作流</span>
        </div>

        {/* === Step 1: 选择模板 === */}
        {step === "select" && (
          <>
            <h1 className="text-3xl font-bold mb-2">选择工作流模板</h1>
            <p className="text-muted-foreground mb-8">选择一个预置模板快速开始，后续可以自定义</p>

            <div className="grid gap-4">
              {WORKFLOW_TEMPLATES.map((template) => (
                <Card
                  key={template.id}
                  className="cursor-pointer hover:border-primary/50 hover:shadow-md transition-all"
                  onClick={() => handleSelectTemplate(template)}
                >
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-3xl">
                          {templateIcons[template.id] ?? "📋"}
                        </span>
                        <div>
                          <CardTitle className="text-lg">{template.name}</CardTitle>
                          <CardDescription>{template.description}</CardDescription>
                        </div>
                      </div>
                      <Badge variant="secondary">{template.category}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      {template.steps.map((step, idx) => (
                        <span key={step.id} className="flex items-center gap-1">
                          <Badge variant="outline" className="text-xs">
                            {step.type === "ai_execute"
                              ? "🤖 AI"
                              : step.type === "human_approve"
                              ? "👤 审批"
                              : step.type === "action"
                              ? "⚡ 执行"
                              : "📥 输入"}
                          </Badge>
                          {idx < template.steps.length - 1 && (
                            <span className="text-muted-foreground/40">→</span>
                          )}
                        </span>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </>
        )}

        {/* === Step 2: 配置工作流 === */}
        {step === "configure" && selectedTemplate && (
          <>
            <h1 className="text-3xl font-bold mb-2">配置工作流</h1>
            <p className="text-muted-foreground mb-8">
              为你的 {selectedTemplate.name} 命名和配置
            </p>

            {/* 模板特定提示 */}
            {selectedTemplate.id === "customer-service" && (
              <Card className="mb-4 border-amber-200 bg-amber-50/50">
                <CardContent className="p-4 text-sm">
                  <p className="font-medium text-amber-800 mb-1">💡 客服工单适用场景</p>
                  <p className="text-amber-700">
                    客户咨询/投诉 → AI 生成回复草稿 → 人工审核 → 发送。
                    适合：售后工单、客户支持、售前咨询。
                    创建后，在仪表盘点击「创建任务」输入客户问题即可触发 AI。
                  </p>
                </CardContent>
              </Card>
            )}
            {selectedTemplate.id === "content-publish" && (
              <Card className="mb-4 border-green-200 bg-green-50/50">
                <CardContent className="p-4 text-sm">
                  <p className="font-medium text-green-800 mb-1">💡 内容发布适用场景</p>
                  <p className="text-green-700">
                    输入主题 → AI 生成文章草稿 → 编辑审批 → 发布。
                    适合：公众号文章、产品文案、社交媒体内容。
                    创建后可以输入主题和特殊要求，AI 生成内容后人工审核发布。
                  </p>
                </CardContent>
              </Card>
            )}
            {selectedTemplate.id === "data-entry" && (
              <Card className="mb-4 border-blue-200 bg-blue-50/50">
                <CardContent className="p-4 text-sm">
                  <p className="font-medium text-blue-800 mb-1">💡 数据录入适用场景</p>
                  <p className="text-blue-700">
                    上传数据 → AI 提取结构化信息 → 人工确认 → 写入存储。
                    适合：发票录入、表单数据提取、文档信息结构化。
                    支持文本粘贴或图片上传（后续支持 OCR），AI 提取数据后人工确认。
                  </p>
                </CardContent>
              </Card>
            )}

            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="text-base">模板预览</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-2xl">
                    {templateIcons[selectedTemplate.id] ?? "📋"}
                  </span>
                  <div>
                    <p className="font-medium">{selectedTemplate.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {selectedTemplate.description}
                    </p>
                  </div>
                </div>
                <div className="space-y-3">
                  {selectedTemplate.steps.map((step, idx) => (
                    <div key={step.id} className="flex items-start gap-3">
                      <div className="flex flex-col items-center">
                        <div
                          className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                            step.type === "ai_execute"
                              ? "bg-purple-100 text-purple-700"
                              : step.type === "human_approve"
                              ? "bg-amber-100 text-amber-700"
                              : "bg-blue-100 text-blue-700"
                          }`}
                        >
                          {idx + 1}
                        </div>
                        {idx < selectedTemplate.steps.length - 1 && (
                          <div className="w-0.5 h-6 bg-border" />
                        )}
                      </div>
                      <div className="pt-0.5">
                        <p className="text-sm font-medium">{step.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {step.description}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">工作流名称 *</Label>
                <Input
                  id="name"
                  placeholder="例如：客户咨询自动回复"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">描述（可选）</Label>
                <Input
                  id="description"
                  placeholder="简短描述这个工作流的用途"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                />
                <Label htmlFor="isActive" className="cursor-pointer">
                  创建后立即启用
                </Label>
              </div>
            </div>

            <div className="flex gap-3 mt-8">
              <Button
                variant="outline"
                onClick={() => {
                  setStep("select")
                  setSelectedTemplate(null)
                }}
              >
                取消
              </Button>
              <Button onClick={handleSave} disabled={saving || !name.trim()}>
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    创建中...
                  </>
                ) : (
                  "创建工作流"
                )}
              </Button>
            </div>
          </>
        )}
      </main>
    </div>
  )
}

export default function NewWorkflowPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">加载中...</p>
      </div>
    }>
      <NewWorkflowForm />
    </Suspense>
  )
}
