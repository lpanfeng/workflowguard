"use client"

import { useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"
import { Separator } from "@/components/ui/separator"
import {
  FileText,
  Loader2,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Edit3,
  Send,
  RefreshCw,
  Save,
  Layout,
  ArrowLeft,
  Type,
  Target,
} from "lucide-react"

// ====================
// Types
// ====================

type ContentStep = "input" | "generating" | "review" | "editing" | "complete" | "error"

type ContentDraft = {
  title: string
  body: string
  summary: string
  keywords: string[]
}

type ContentStyle = "formal" | "conversational" | "technical" | "marketing" | "storytelling"

type ContentLength = "short" | "medium" | "long"

// ====================
// Props
// ====================

interface ContentPublishFlowProps {
  workflowId: string
  userId: string
  onComplete?: () => void
  onBack?: () => void
}

export function ContentPublishFlow({ workflowId, userId, onComplete, onBack }: ContentPublishFlowProps) {
  const [step, setStep] = useState<ContentStep>("input")
  const [topic, setTopic] = useState("")
  const [requirements, setRequirements] = useState("")
  const [style, setStyle] = useState<ContentStyle>("formal")
  const [targetAudience, setTargetAudience] = useState("")
  const [length, setLength] = useState<ContentLength>("medium")

  const [draft, setDraft] = useState<ContentDraft | null>(null)
  const [revisedDraft, setRevisedDraft] = useState<ContentDraft | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [isPublishing, setIsPublishing] = useState(false)

  // 编辑模式
  const [editTitle, setEditTitle] = useState("")
  const [editBody, setEditBody] = useState("")

  const handleGenerate = useCallback(async () => {
    if (!topic.trim()) {
      toast.error("请输入内容主题")
      return
    }

    setIsGenerating(true)
    setStep("generating")

    try {
      // 调用本地 AI 执行 API
      const response = await fetch("/api/ai/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workflowId,
          templateId: "content-publish",
          inputs: {
            topic: topic.trim(),
            requirements: requirements.trim() || "无特殊要求",
            style,
            targetAudience: targetAudience.trim() || "通用受众",
            length,
          },
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `AI 生成失败 (${response.status})`)
      }

      const data = await response.json()
      const result = data.result || data

      // 解析 AI 输出
      let title = ""
      let body = ""
      let summary = ""
      const keywords: string[] = []

      if (typeof result === "string") {
        // 简单文本解析
        const lines = result.split("\n").filter((l: string) => l.trim())
        title = lines[0]?.replace(/^[#*]+\s*/, "") || topic
        body = result
        summary = lines.slice(1, 3).join("\n") || body.slice(0, 200)
      } else if (typeof result === "object") {
        title = result.title || topic
        body = result.body || result.content || JSON.stringify(result)
        summary = result.summary || result.description || body.slice(0, 200)
        if (Array.isArray(result.keywords)) keywords.push(...result.keywords.map(String))
      }

      const newDraft: ContentDraft = { title, body, summary, keywords }
      setDraft(newDraft)

      // 初始化编辑内容
      setEditTitle(title)
      setEditBody(body)

      setStep("review")
      toast.success("内容生成完成，请审核")
    } catch (err) {
      console.error("AI 生成错误:", err)
      setStep("error")
      toast.error(err instanceof Error ? err.message : "内容生成失败，请重试")
    } finally {
      setIsGenerating(false)
    }
  }, [topic, requirements, style, targetAudience, length, workflowId])

  const handleRegenerate = useCallback(() => {
    setDraft(null)
    setRevisedDraft(null)
    handleGenerate()
  }, [handleGenerate])

  const handleEditSave = useCallback(() => {
    if (!draft) return
    const revised: ContentDraft = {
      ...draft,
      title: editTitle.trim() || draft.title,
      body: editBody,
    }
    setRevisedDraft(revised)
    setDraft(revised)
    setStep("review")
    toast.success("修改已保存")
  }, [draft, editTitle, editBody])

  const handlePublish = useCallback(async () => {
    if (!draft) return
    setIsPublishing(true)

    try {
      // 记录发布结果到工作流
      const response = await fetch("/api/workflows/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workflowId,
          templateId: "content-publish",
          result: {
            status: "published",
            title: draft.title,
            bodyLength: draft.body.length,
            summary: draft.summary,
            keywords: draft.keywords,
            publishedAt: new Date().toISOString(),
          },
        }),
      })

      if (!response.ok) throw new Error("发布记录失败")

      setStep("complete")
      toast.success("内容已发布！")
      onComplete?.()
    } catch (err) {
      toast.error("发布失败，请重试")
    } finally {
      setIsPublishing(false)
    }
  }, [draft, workflowId, onComplete])

  // ====================
  // Render
  // ====================

  const lengthLabels: Record<ContentLength, string> = {
    short: "简短（300-500字）",
    medium: "中等（800-1500字）",
    long: "详细（2000字+）",
  }

  const styleLabels: Record<ContentStyle, string> = {
    formal: "正式风格",
    conversational: "口语化",
    technical: "技术风格",
    marketing: "营销风格",
    storytelling: "叙事风格",
  }

  // ======== 输入阶段 ========
  if (step === "input") {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2 mb-2">
          {onBack && (
            <button onClick={onBack} className="text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-4 w-4" />
            </button>
          )}
          <h3 className="text-lg font-semibold">📝 内容创作</h3>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Target className="h-4 w-4" />
              内容主题
            </CardTitle>
            <CardDescription>输入你想要创作的内容主题和关键要求</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="topic">主题 *</Label>
              <Input
                id="topic"
                placeholder="例如：AI Agent 在客服场景的应用实践"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="requirements">特殊要求（可选）</Label>
              <Textarea
                id="requirements"
                placeholder="例如：要求以案例开头，包含具体数据，语气亲切..."
                value={requirements}
                onChange={(e) => setRequirements(e.target.value)}
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="audience">目标读者（可选）</Label>
              <Input
                id="audience"
                placeholder="例如：技术管理者、创业者、内容运营..."
                value={targetAudience}
                onChange={(e) => setTargetAudience(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>写作风格</Label>
                <Select value={style} onValueChange={(v) => setStyle(v as ContentStyle)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(styleLabels).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>内容长度</Label>
                <Select value={length} onValueChange={(v) => setLength(v as ContentLength)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(lengthLabels).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        <Button
          onClick={handleGenerate}
          disabled={!topic.trim() || isGenerating}
          className="w-full"
        >
          {isGenerating ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              AI 正在生成...
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4 mr-2" />
              AI 生成内容
            </>
          )}
        </Button>
      </div>
    )
  }

  // ======== 生成中 ========
  if (step === "generating") {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <div className="flex flex-col items-center gap-4">
            <div className="relative">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
              <Sparkles className="h-5 w-5 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-primary-foreground" />
            </div>
            <div>
              <p className="font-medium text-lg">AI 正在创作内容</p>
              <p className="text-sm text-muted-foreground mt-1">
                根据主题「{topic.length > 30 ? topic.slice(0, 30) + "..." : topic}」生成中...
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  // ======== 审核阶段 ========
  if (step === "review" && draft) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-500" />
            <h3 className="text-lg font-semibold">内容审核</h3>
          </div>
          <Badge variant="outline" className="text-xs">
            AI 生成草稿
          </Badge>
        </div>

        {/* 标题 */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Type className="h-4 w-4" />
              标题
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xl font-semibold leading-relaxed">{draft.title}</p>
          </CardContent>
        </Card>

        {/* 正文 */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="h-4 w-4" />
                正文
              </CardTitle>
              <span className="text-xs text-muted-foreground">
                约 {draft.body.length} 字
              </span>
            </div>
          </CardHeader>
          <CardContent>
            <div className="prose prose-sm max-w-none whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
              {draft.body.length > 1000
                ? draft.body.slice(0, 1000) + "...\n\n[内容较长，点击编辑查看全文]"
                : draft.body}
            </div>
          </CardContent>
        </Card>

        {/* 关键词 */}
        {draft.keywords.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm text-muted-foreground">关键词：</span>
            {draft.keywords.map((kw, i) => (
              <Badge key={i} variant="secondary" className="text-xs">
                {kw}
              </Badge>
            ))}
          </div>
        )}

        {/* 操作按钮 */}
        <div className="flex flex-wrap gap-3">
          <Button variant="outline" onClick={() => {
            setEditTitle(draft.title)
            setEditBody(draft.body)
            setStep("editing")
          }}>
            <Edit3 className="h-4 w-4 mr-2" />
            编辑修改
          </Button>
          <Button variant="outline" onClick={handleRegenerate}>
            <RefreshCw className="h-4 w-4 mr-2" />
            重新生成
          </Button>
          <Button onClick={handlePublish} disabled={isPublishing}>
            {isPublishing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                发布中...
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                确认发布
              </>
            )}
          </Button>
        </div>
      </div>
    )
  }

  // ======== 编辑阶段 ========
  if (step === "editing") {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <Edit3 className="h-5 w-5 text-amber-500" />
          <h3 className="text-lg font-semibold">编辑内容</h3>
          <Badge variant="secondary" className="text-xs">编辑模式</Badge>
        </div>

        <Card>
          <CardContent className="pt-6 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="editTitle">标题</Label>
              <Input
                id="editTitle"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="editBody">正文</Label>
              <Textarea
                id="editBody"
                value={editBody}
                onChange={(e) => setEditBody(e.target.value)}
                rows={18}
                className="font-mono text-sm leading-relaxed"
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-3">
          <Button variant="outline" onClick={() => setStep("review")}>
            取消编辑
          </Button>
          <Button onClick={handleEditSave}>
            <Save className="h-4 w-4 mr-2" />
            保存修改
          </Button>
        </div>
      </div>
    )
  }

  // ======== 发布完成 ========
  if (step === "complete") {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <div className="flex flex-col items-center gap-4">
            <CheckCircle2 className="h-16 w-16 text-green-500" />
            <div>
              <p className="text-xl font-semibold">内容已发布！</p>
              <p className="text-sm text-muted-foreground mt-1">
                「{draft?.title}」已提交到审批流程
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  // ======== 错误阶段 ========
  if (step === "error") {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <div className="flex flex-col items-center gap-4">
            <AlertTriangle className="h-12 w-12 text-red-500" />
            <div>
              <p className="font-semibold text-lg">生成失败</p>
              <p className="text-sm text-muted-foreground mt-1">
                AI 内容生成出错，请检查 API 配置后重试
              </p>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setStep("input")}>
                返回修改参数
              </Button>
              <Button onClick={handleRegenerate}>
                <RefreshCw className="h-4 w-4 mr-2" />
                重新生成
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return null
}
