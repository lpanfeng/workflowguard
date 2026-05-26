"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { supabase } from "@/lib/supabase"
import { WORKFLOW_TEMPLATES, getTemplateById } from "@/lib/workflow-templates"
import { toast } from "sonner"
import {
  Plus,
  Loader2,
  Sparkles,
  FileText,
  Database,
  Headphones,
  X,
  ChevronRight,
  Send,
} from "lucide-react"

type Workflow = {
  id: string
  name: string
  template_id: string
}

type TaskCreateDialogProps = {
  userId: string
  onTaskCreated?: () => void
}

export function TaskCreateDialog({ userId, onTaskCreated }: TaskCreateDialogProps) {
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState<"select" | "input">("select")
  const [workflows, setWorkflows] = useState<Workflow[]>([])
  const [selectedWorkflow, setSelectedWorkflow] = useState<Workflow | null>(null)
  const [title, setTitle] = useState("")
  const [content, setContent] = useState("")
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (open) {
      loadWorkflows()
    }
  }, [open])

  const loadWorkflows = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from("workflows")
        .select("id, name, template_id")
        .eq("user_id", userId)
        .eq("is_active", true)
        .order("created_at", { ascending: false })

      if (error) throw error
      setWorkflows(data ?? [])
    } catch (err) {
      console.error("加载工作流失败:", err)
    } finally {
      setLoading(false)
    }
  }

  const templateIcons: Record<string, React.ReactNode> = {
    "customer-service": <Headphones className="h-5 w-5" />,
    "content-publish": <FileText className="h-5 w-5" />,
    "data-entry": <Database className="h-5 w-5" />,
  }

  const templateLabels: Record<string, string> = {
    "customer-service": "客服工单",
    "content-publish": "内容发布",
    "data-entry": "数据录入",
  }

  const templatePlaceholders: Record<string, string> = {
    "customer-service": "输入客户咨询内容或问题...",
    "content-publish": "输入内容主题和要点...",
    "data-entry": "粘贴需要提取的数据或文本...",
  }

  const handleSubmit = async () => {
    if (!selectedWorkflow || !title.trim()) {
      toast.error("请填写任务标题")
      return
    }

    setSaving(true)
    try {
      const res = await fetch("/api/tasks/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workflowId: selectedWorkflow.id,
          userId,
          title: title.trim(),
          inputData: {
            content: content.trim(),
            query: content.trim(),
            description: title.trim(),
          },
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        if (res.status === 403) {
          toast.error("审批配额已用完，请升级套餐")
        } else {
          toast.error(data.error ?? "创建任务失败")
        }
        return
      }

      toast.success(`任务「${title}」创建成功，AI 正在执行...`)
      setOpen(false)
      resetForm()
      onTaskCreated?.()
    } catch (err) {
      console.error(err)
      toast.error("创建任务失败")
    } finally {
      setSaving(false)
    }
  }

  const resetForm = () => {
    setStep("select")
    setSelectedWorkflow(null)
    setTitle("")
    setContent("")
  }

  if (!open) {
    return (
      <>
        {/* Floating Action Button */}
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-6 right-6 z-40 w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 transition-all flex items-center justify-center"
          title="创建新任务"
        >
          <Plus className="h-6 w-6" />
        </button>
      </>
    )
  }

  return (
    <>
      {/* Floating Action Button */}
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-40 w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 transition-all flex items-center justify-center"
        title="创建新任务"
      >
        <Plus className="h-6 w-6" />
      </button>

      {/* Overlay */}
      <div
        className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            setOpen(false)
            resetForm()
          }
        }}
      >
        <Card className="w-full max-w-lg max-h-[85vh] overflow-y-auto">
          <div className="p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg font-semibold">创建新任务</h2>
                <p className="text-sm text-muted-foreground">
                  {step === "select"
                    ? "选择要运行的工作流"
                    : "输入任务内容触发 AI 执行"}
                </p>
              </div>
              <button
                onClick={() => {
                  setOpen(false)
                  resetForm()
                }}
                className="p-1 rounded-md hover:bg-muted transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Step indicator */}
            <div className="flex items-center gap-2 mb-6">
              <div
                className={`flex items-center justify-center w-7 h-7 rounded-full text-xs font-medium ${
                  step === "select"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                1
              </div>
              <span className="text-xs text-muted-foreground">选择工作流</span>
              <ChevronRight className="h-3 w-3 text-muted-foreground" />
              <div
                className={`flex items-center justify-center w-7 h-7 rounded-full text-xs font-medium ${
                  step === "input"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                2
              </div>
              <span className="text-xs text-muted-foreground">输入内容</span>
            </div>

            {/* Step 1: Select workflow */}
            {step === "select" && (
              <div className="space-y-2">
                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  </div>
                ) : workflows.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground mb-3">还没有创建任何工作流</p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        window.location.href = "/workflows/new"
                      }}
                    >
                      创建工作流
                    </Button>
                  </div>
                ) : (
                  workflows.map((wf) => {
                    const template = getTemplateById(wf.template_id)
                    return (
                      <button
                        key={wf.id}
                        onClick={() => {
                          setSelectedWorkflow(wf)
                          setStep("input")
                        }}
                        className={`w-full text-left p-3 rounded-lg border transition-all hover:border-primary/50 hover:shadow-sm ${
                          selectedWorkflow?.id === wf.id
                            ? "border-primary bg-primary/5"
                            : "border-border"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-xl">
                            {templateIcons[wf.template_id] ?? <Sparkles className="h-5 w-5" />}
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm">{wf.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {templateLabels[wf.template_id] ?? wf.template_id}
                            </p>
                          </div>
                          <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                        </div>
                      </button>
                    )
                  })
                )}
              </div>
            )}

            {/* Step 2: Input content */}
            {step === "input" && selectedWorkflow && (
              <div className="space-y-4">
                {/* Selected workflow indicator */}
                <div className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg">
                  <span className="text-lg">
                    {templateIcons[selectedWorkflow.template_id] ?? <Sparkles className="h-4 w-4" />}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{selectedWorkflow.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {templateLabels[selectedWorkflow.template_id] ?? selectedWorkflow.template_id}
                    </p>
                  </div>
                  <button
                    onClick={() => setStep("select")}
                    className="text-xs text-primary hover:underline"
                  >
                    更换
                  </button>
                </div>

                {/* Input form */}
                <div className="space-y-2">
                  <Label htmlFor="task-title">任务标题 *</Label>
                  <Input
                    id="task-title"
                    placeholder="例如：客户咨询回复、周报生成..."
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="task-content">
                    输入内容
                    <span className="text-xs text-muted-foreground ml-1">（AI 将根据此内容生成）</span>
                  </Label>
                  <textarea
                    id="task-content"
                    className="w-full min-h-[120px] p-3 rounded-lg border border-input bg-background text-sm resize-y focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
                    placeholder={templatePlaceholders[selectedWorkflow.template_id] ?? "输入内容..."}
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                  />
                </div>

                {/* Action buttons */}
                <div className="flex gap-3 pt-2">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => setStep("select")}
                  >
                    返回
                  </Button>
                  <Button
                    className="flex-1"
                    onClick={handleSubmit}
                    disabled={saving || !title.trim()}
                  >
                    {saving ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        创建中...
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4 mr-2" />
                        提交任务
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </Card>
      </div>
    </>
  )
}
