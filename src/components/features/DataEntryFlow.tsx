"use client"

import { useState, useCallback, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { supabase } from "@/lib/supabase"
import {
  Upload,
  FileText,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ChevronRight,
  Database,
  Eye,
  Edit3,
  Save,
  ArrowLeft,
} from "lucide-react"
import { useRouter } from "next/navigation"

// ====================
// Types
// ====================

type DataEntryStep = "upload" | "ai_extracting" | "review" | "confirming" | "complete" | "error"

type ExtractedField = {
  key: string
  label: string
  value: string
  confidence: "high" | "medium" | "low"
  editable: boolean
}

type DataEntryConfig = {
  workflowId: string
  userId: string
}

// ====================
// 预设提取模板
// ====================

const EXTRACTION_TEMPLATES = [
  {
    id: "invoice",
    name: "发票信息提取",
    description: "从发票图片/文本中提取发票号、金额、日期、公司信息",
    fields: [
      { key: "invoice_no", label: "发票号码", value: "", confidence: "medium" as const, editable: true },
      { key: "amount", label: "金额（含税）", value: "", confidence: "medium" as const, editable: true },
      { key: "date", label: "开票日期", value: "", confidence: "medium" as const, editable: true },
      { key: "seller", label: "销售方", value: "", confidence: "medium" as const, editable: true },
      { key: "buyer", label: "购买方", value: "", confidence: "medium" as const, editable: true },
    ],
    icon: "🧾",
  },
  {
    id: "business_card",
    name: "名片信息提取",
    description: "从名片图片中提取姓名、公司、职位、联系方式",
    fields: [
      { key: "name", label: "姓名", value: "", confidence: "medium" as const, editable: true },
      { key: "company", label: "公司", value: "", confidence: "medium" as const, editable: true },
      { key: "title", label: "职位", value: "", confidence: "medium" as const, editable: true },
      { key: "phone", label: "电话", value: "", confidence: "medium" as const, editable: true },
      { key: "email", label: "邮箱", value: "", confidence: "medium" as const, editable: true },
    ],
    icon: "👤",
  },
  {
    id: "form_data",
    name: "表单数据提取",
    description: "从填写好的表单/文档中提取结构化字段数据",
    fields: [
      { key: "form_type", label: "表单类型", value: "", confidence: "medium" as const, editable: true },
      { key: "field_count", label: "字段数量", value: "", confidence: "medium" as const, editable: true },
      { key: "summary", label: "内容摘要", value: "", confidence: "medium" as const, editable: true },
    ],
    icon: "📋",
  },
]

// ====================
// 模拟 AI 提取函数（占位）
// ====================

async function simulateAIExtraction(
  textContent: string,
  templateId: string,
  fields: ExtractedField[]
): Promise<{ fields: ExtractedField[]; rawResult: string }> {
  // 模拟 AI 处理延迟
  await new Promise((resolve) => setTimeout(resolve, 2000))

  // 模拟提取结果 — 未来这里会调用真实的 AI API
  const now = new Date()
  const mockResults: Record<string, ExtractedField[]> = {
    invoice: [
      { key: "invoice_no", label: "发票号码", value: `INV-${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(Math.floor(Math.random() * 9999)).padStart(4, "0")}`, confidence: "high", editable: true },
      { key: "amount", label: "金额（含税）", value: `¥${(Math.random() * 10000 + 100).toFixed(2)}`, confidence: "medium", editable: true },
      { key: "date", label: "开票日期", value: now.toISOString().slice(0, 10), confidence: "high", editable: true },
      { key: "seller", label: "销售方", value: textContent.includes("公司") ? textContent.split("公司")[0] + "科技公司" : "示例科技有限公司", confidence: "low", editable: true },
      { key: "buyer", label: "购买方", value: "WorkflowGuard 有限公司", confidence: "medium", editable: true },
    ],
    business_card: [
      { key: "name", label: "姓名", value: "张明", confidence: "high", editable: true },
      { key: "company", label: "公司", value: textContent.includes("科技") ? "创新科技有限公司" : "示例企业咨询", confidence: "medium", editable: true },
      { key: "title", label: "职位", value: "技术总监", confidence: "high", editable: true },
      { key: "phone", label: "电话", value: "138-0000-1234", confidence: "medium", editable: true },
      { key: "email", label: "邮箱", value: "zhangming@example.com", confidence: "medium", editable: true },
    ],
    form_data: [
      { key: "form_type", label: "表单类型", value: textContent.includes("申请") ? "申请表" : textContent.includes("报告") ? "报告" : "通用数据表单", confidence: "medium", editable: true },
      { key: "field_count", label: "字段数量", value: `${Math.floor(textContent.length / 50) + 3} 个字段`, confidence: "low", editable: true },
      { key: "summary", label: "内容摘要", value: textContent.slice(0, 100) + (textContent.length > 100 ? "..." : ""), confidence: "high", editable: true },
    ],
  }

  return {
    fields: mockResults[templateId] ?? fields.map((f) => ({ ...f, value: "[AI 未能自动提取]" })),
    rawResult: JSON.stringify(mockResults[templateId] ?? fields, null, 2),
  }
}

// ====================
// 主组件
// ====================

export default function DataEntryFlow({ workflowId, userId }: DataEntryConfig) {
  const router = useRouter()
  const [step, setStep] = useState<DataEntryStep>("upload")
  const [selectedTemplate, setSelectedTemplate] = useState<typeof EXTRACTION_TEMPLATES[number] | null>(null)
  const [textContent, setTextContent] = useState("")
  const [fileName, setFileName] = useState<string | null>(null)
  const [extractedFields, setExtractedFields] = useState<ExtractedField[]>([])
  const [rawResult, setRawResult] = useState("")
  const [errorMsg, setErrorMsg] = useState("")
  const [saving, setSaving] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // 选择提取模板
  const handleSelectTemplate = (tpl: typeof EXTRACTION_TEMPLATES[number]) => {
    setSelectedTemplate(tpl)
  }

  // 文件上传处理
  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setFileName(file.name)

    // 如果是文本文件，读取内容
    if (file.type === "text/plain" || file.name.endsWith(".txt") || file.name.endsWith(".csv")) {
      const reader = new FileReader()
      reader.onload = (ev) => {
        const content = ev.target?.result as string
        setTextContent(content)
        toast.success(`已读取文件: ${file.name} (${content.length} 字符)`)
      }
      reader.readAsText(file)
    } else {
      // 图片或其他文件 — 占位处理
      toast.info(`文件 "${file.name}" 已上传。未来版本将支持 OCR 识别。当前请手动粘贴文本内容。`)
    }
  }, [])

  // 触发 AI 提取
  const handleStartExtraction = async () => {
    if (!selectedTemplate) {
      toast.error("请先选择提取模板")
      return
    }
    if (!textContent.trim() && !fileName) {
      toast.error("请先上传文件或粘贴文本内容")
      return
    }

    setStep("ai_extracting")
    setErrorMsg("")

    try {
      const result = await simulateAIExtraction(textContent, selectedTemplate.id, selectedTemplate.fields)
      setExtractedFields(result.fields)
      setRawResult(result.rawResult)
      setStep("review")
      toast.success("AI 提取完成，请检查结果")
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "AI 提取失败")
      setStep("error")
    }
  }

  // 编辑字段
  const handleFieldChange = (key: string, newValue: string) => {
    setExtractedFields((prev) =>
      prev.map((f) => (f.key === key ? { ...f, value: newValue, confidence: "medium" as const } : f))
    )
  }

  // 确认并保存
  const handleConfirm = async () => {
    if (!selectedTemplate) return

    setStep("confirming")
    setSaving(true)

    try {
      // 创建任务记录
      const { data: task, error: taskError } = await supabase
        .from("tasks")
        .insert({
          workflow_id: workflowId,
          user_id: userId,
          type: "data_entry",
          status: "completed",
          title: `数据录入: ${selectedTemplate.name}`,
          input_data: {
            template_id: selectedTemplate.id,
            source_text: textContent.slice(0, 500),
            file_name: fileName,
          },
          agent_result: { fields: extractedFields, raw_result: rawResult },
          approved_result: extractedFields.reduce((acc, f) => ({ ...acc, [f.key]: f.value }), {}),
          completed_at: new Date().toISOString(),
        })
        .select()
        .single()

      if (taskError) {
        throw new Error(taskError.message)
      }

      // 写入审计日志
      await supabase
        .from("audit_logs")
        .insert({
          user_id: userId,
          workflow_id: workflowId,
          action: "data_entry_completed",
          details: {
            task_id: task?.id,
            template: selectedTemplate.name,
            fields_count: extractedFields.length,
            confirmed_at: new Date().toISOString(),
          },
        })

      setStep("complete")
      toast.success("数据已确认并保存！")
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "保存失败")
      setStep("error")
      toast.error("保存失败，请重试")
    } finally {
      setSaving(false)
    }
  }

  const getConfidenceBadge = (confidence: string) => {
    switch (confidence) {
      case "high":
        return <Badge className="bg-green-100 text-green-700 hover:bg-green-100">高可信度</Badge>
      case "medium":
        return <Badge className="bg-yellow-100 text-yellow-700 hover:bg-yellow-100">中可信度</Badge>
      case "low":
        return <Badge className="bg-red-100 text-red-700 hover:bg-red-100">低可信度 · 建议检查</Badge>
      default:
        return null
    }
  }

  const getStepIcon = (step: DataEntryStep) => {
    switch (step) {
      case "upload":
        return <Upload className="h-5 w-5 text-blue-500" />
      case "ai_extracting":
        return <Loader2 className="h-5 w-5 text-purple-500 animate-spin" />
      case "review":
        return <Eye className="h-5 w-5 text-amber-500" />
      case "confirming":
        return <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />
      case "complete":
        return <CheckCircle2 className="h-5 w-5 text-green-500" />
      case "error":
        return <XCircle className="h-5 w-5 text-red-500" />
    }
  }

  const getStepLabel = (step: DataEntryStep) => {
    switch (step) {
      case "upload":
        return "上传数据"
      case "ai_extracting":
        return "AI 提取中..."
      case "review":
        return "审核数据"
      case "confirming":
        return "保存中..."
      case "complete":
        return "完成"
      case "error":
        return "出错"
    }
  }

  // ====================
  // Step: Upload
  // ====================

  if (step === "upload") {
    return (
      <div className="space-y-6">
        {/* 步骤指示器 */}
        <div className="flex items-center gap-3 text-sm">
          <span className="flex items-center gap-1">
            {getStepIcon("upload")}
            {getStepLabel("upload")}
          </span>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
          <span className="text-muted-foreground flex items-center gap-1">
            {getStepIcon("ai_extracting")}
            AI 提取
          </span>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
          <span className="text-muted-foreground flex items-center gap-1">
            {getStepIcon("review")}
            人工确认
          </span>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>选择数据提取模板</CardTitle>
            <CardDescription>
              选择你要提取的数据类型，AI 会根据模板自动识别并提取字段
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3">
              {EXTRACTION_TEMPLATES.map((tpl) => (
                <div
                  key={tpl.id}
                  className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                    selectedTemplate?.id === tpl.id
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50 hover:bg-accent/50"
                  }`}
                  onClick={() => handleSelectTemplate(tpl)}
                >
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">{tpl.icon}</span>
                    <div className="flex-1">
                      <p className="font-medium">{tpl.name}</p>
                      <p className="text-sm text-muted-foreground">{tpl.description}</p>
                      <div className="flex gap-2 mt-2 flex-wrap">
                        {tpl.fields.map((f) => (
                          <Badge key={f.key} variant="secondary" className="text-xs">
                            {f.label}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>上传数据源</CardTitle>
            <CardDescription>
              上传文件或粘贴文本内容，AI 将从中提取结构化数据
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* 文件上传 */}
            <div
              className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:bg-accent/50 transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".txt,.csv,.json,.jpg,.jpeg,.png,.pdf"
                className="hidden"
                onChange={handleFileUpload}
              />
              <Upload className="h-8 w-8 mx-auto mb-3 text-muted-foreground" />
              <p className="text-sm font-medium">
                {fileName ? `已选择: ${fileName}` : "点击上传文件"}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                支持 TXT, CSV, JSON, JPG, PNG, PDF（OCR 即将支持）
              </p>
            </div>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">或者手动输入</span>
              </div>
            </div>

            <div className="space-y-2">
              <Label>文本内容</Label>
              <Textarea
                placeholder="粘贴需要提取数据的文本内容..."
                value={textContent}
                onChange={(e) => setTextContent(e.target.value)}
                rows={6}
              />
              <p className="text-xs text-muted-foreground">
                {textContent.length} 字符
              </p>
            </div>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => router.push("/dashboard")}>
                返回仪表盘
              </Button>
              <Button
                onClick={handleStartExtraction}
                disabled={!selectedTemplate || (!textContent.trim() && !fileName)}
              >
                <Database className="h-4 w-4 mr-2" />
                启动 AI 提取
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // ====================
  // Step: AI Extracting (loading)
  // ====================

  if (step === "ai_extracting") {
    return (
      <Card>
        <CardContent className="py-16 text-center">
          <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-primary" />
          <h3 className="text-lg font-semibold mb-2">AI 正在提取数据...</h3>
          <p className="text-muted-foreground text-sm">
            正在分析 {fileName ?? "文本内容"}，从 {selectedTemplate?.name ?? "数据"} 中提取结构化字段
          </p>
          <div className="mt-6 flex justify-center gap-2">
            {selectedTemplate?.fields.map((f, i) => (
              <div
                key={f.key}
                className="w-2 h-8 rounded-full bg-primary/20 animate-pulse"
                style={{ animationDelay: `${i * 0.2}s` }}
              />
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  // ====================
  // Step: Review (人工审核)
  // ====================

  if (step === "review") {
    return (
      <div className="space-y-6">
        {/* 步骤指示器 */}
        <div className="flex items-center gap-3 text-sm">
          <span className="flex items-center gap-1 text-muted-foreground">
            <CheckCircle2 className="h-4 w-4 text-green-500" />
            上传数据
          </span>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
          <span className="flex items-center gap-1 text-muted-foreground">
            <CheckCircle2 className="h-4 w-4 text-green-500" />
            AI 提取
          </span>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
          <span className="flex items-center gap-1">
            {getStepIcon("review")}
            人工确认
          </span>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>审核提取结果</CardTitle>
                <CardDescription>
                  请检查 AI 提取的数据，修改不准确的内容后确认保存
                </CardDescription>
              </div>
              <span className="text-2xl">{selectedTemplate?.icon}</span>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* 源数据预览 */}
            <div className="bg-muted/50 rounded-lg p-3">
              <p className="text-xs font-medium text-muted-foreground mb-1">源数据预览</p>
              <p className="text-sm line-clamp-3">{textContent.slice(0, 200)}{textContent.length > 200 ? "..." : ""}</p>
            </div>

            {/* 提取字段 */}
            <div className="space-y-3">
              <p className="text-sm font-medium flex items-center gap-2">
                <Edit3 className="h-4 w-4" />
                提取的字段（点击可编辑）
              </p>
              {extractedFields.map((field) => (
                <div key={field.key} className="flex items-start gap-3 p-3 rounded-lg border">
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <Label className="text-xs text-muted-foreground">{field.label}</Label>
                      {getConfidenceBadge(field.confidence)}
                    </div>
                    {field.editable ? (
                      <Input
                        value={field.value}
                        onChange={(e) => handleFieldChange(field.key, e.target.value)}
                        className="font-medium"
                      />
                    ) : (
                      <p className="font-medium">{field.value}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-between pt-4">
              <Button
                variant="outline"
                onClick={() => {
                  setStep("upload")
                  setExtractedFields([])
                }}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                重新上传
              </Button>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setStep("upload")
                    setExtractedFields([])
                    toast.info("已放弃当前提取结果")
                  }}
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  放弃
                </Button>
                <Button onClick={handleConfirm}>
                  <Save className="h-4 w-4 mr-2" />
                  确认并保存
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // ====================
  // Step: Confirming
  // ====================

  if (step === "confirming") {
    return (
      <Card>
        <CardContent className="py-16 text-center">
          <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-primary" />
          <h3 className="text-lg font-semibold mb-2">正在保存数据...</h3>
          <p className="text-muted-foreground text-sm">
            正在将确认的数据写入系统
          </p>
        </CardContent>
      </Card>
    )
  }

  // ====================
  // Step: Complete
  // ====================

  if (step === "complete") {
    return (
      <Card>
        <CardContent className="py-16 text-center">
          <CheckCircle2 className="h-16 w-16 mx-auto mb-4 text-green-500" />
          <h3 className="text-xl font-semibold mb-2">数据录入完成！</h3>
          <p className="text-muted-foreground mb-2">
            已从 {selectedTemplate?.name} 中提取并确认 {extractedFields.length} 个字段
          </p>
          <div className="flex justify-center gap-1 mb-6">
            {extractedFields.map((f) => (
              <Badge key={f.key} variant="outline" className="text-xs">
                {f.label}: {f.value.slice(0, 20)}
              </Badge>
            ))}
          </div>
          <div className="flex justify-center gap-3">
            <Button
              variant="outline"
              onClick={() => {
                setStep("upload")
                setTextContent("")
                setFileName(null)
                setExtractedFields([])
                setSelectedTemplate(null)
              }}
            >
              继续录入
            </Button>
            <Button onClick={() => router.push("/dashboard")}>
              返回仪表盘
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  // ====================
  // Step: Error
  // ====================

  if (step === "error") {
    return (
      <Card>
        <CardContent className="py-16 text-center">
          <AlertTriangle className="h-16 w-16 mx-auto mb-4 text-red-500" />
          <h3 className="text-xl font-semibold mb-2">处理出错</h3>
          <p className="text-muted-foreground mb-6">{errorMsg}</p>
          <div className="flex justify-center gap-3">
            <Button variant="outline" onClick={() => { setStep("upload"); setErrorMsg("") }}>
              返回重试
            </Button>
            <Button onClick={() => router.push("/dashboard")}>
              返回仪表盘
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return null
}
