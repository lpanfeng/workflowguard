"use client"

import { useState, useRef, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Loader2, Upload, FileText, CheckCircle2, AlertCircle, X } from "lucide-react"

interface ParsedRow {
  step_order: number
  step_name: string
  step_type: string
  description: string
  prompt_template: string
}

interface UploadTemplateProps {
  onSuccess?: (rows: ParsedRow[]) => void
}

export function UploadTemplate({ onSuccess }: UploadTemplateProps) {
  const [dragging, setDragging] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([])
  const [error, setError] = useState<string>("")
  const [fileName, setFileName] = useState("")
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFile = useCallback(async (file: File) => {
    if (!file.name.endsWith(".csv")) {
      setError("只支持 .csv 文件格式")
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      setError("文件大小不能超过 5MB")
      return
    }

    setFileName(file.name)
    setUploading(true)
    setError("")
    setParsedRows([])

    const formData = new FormData()
    formData.append("file", file)

    try {
      const res = await fetch("/api/templates/upload", {
        method: "POST",
        body: formData,
      })
      const data = await res.json()

      if (!res.ok) {
        setError(data.error || "上传失败")
        return
      }

      setParsedRows(data.rows)
      onSuccess?.(data.rows)
    } catch (err: any) {
      setError(err.message || "上传失败，请重试")
    } finally {
      setUploading(false)
    }
  }, [onSuccess])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setDragging(false)
      const file = e.dataTransfer.files[0]
      if (file) handleFile(file)
    },
    [handleFile]
  )

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (file) handleFile(file)
    },
    [handleFile]
  )

  const stepTypeLabel: Record<string, { label: string; color: string }> = {
    ai_execute: { label: "AI 执行", color: "bg-purple-100 text-purple-700" },
    human_approve: { label: "人工审批", color: "bg-amber-100 text-amber-700" },
    notify: { label: "通知", color: "bg-blue-100 text-blue-700" },
    action: { label: "操作", color: "bg-slate-100 text-slate-700" },
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="h-5 w-5" />
          从 CSV 导入工作流
        </CardTitle>
        <CardDescription>
          拖拽或上传 CSV 文件，自动解析为工作流步骤。支持列：step_order, step_name, step_type, description, prompt_template
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Drop Zone */}
        <div
          onDragOver={(e) => {
            e.preventDefault()
            setDragging(true)
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all ${
            dragging
              ? "border-primary bg-primary/5"
              : "border-muted-foreground/20 hover:border-primary/50"
          }`}
        >
          {uploading ? (
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">正在解析...</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center gap-2">
              <AlertCircle className="h-8 w-8 text-red-500" />
              <p className="text-sm text-red-500">{error}</p>
              <Button variant="outline" size="sm" onClick={() => setError("")}>
                重新上传
              </Button>
            </div>
          ) : parsedRows.length > 0 ? (
            <div className="flex flex-col items-center gap-3">
              <CheckCircle2 className="h-8 w-8 text-green-500" />
              <p className="text-sm font-medium">
                ✅ 成功解析 {parsedRows.length} 个步骤
              </p>
              <Button variant="outline" size="sm" onClick={() => { setParsedRows([]); setFileName(""); }}>
                重新上传
              </Button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <FileText className="h-8 w-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                拖拽 CSV 文件到这里，或点击选择文件
              </p>
              <p className="text-xs text-muted-foreground/60">
                最大 5MB
              </p>
            </div>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            className="hidden"
            onChange={handleInputChange}
          />
        </div>

        {/* Preview */}
        {parsedRows.length > 0 && (
          <div className="mt-4 space-y-2">
            <p className="text-sm font-medium flex items-center gap-2">
              <FileText className="h-4 w-4" />
              {fileName} — 预览
            </p>
            <div className="space-y-1 max-h-48 overflow-y-auto">
              {parsedRows.map((row) => (
                <div
                  key={row.step_order}
                  className="flex items-center gap-2 text-sm py-1 px-2 bg-muted/30 rounded"
                >
                  <Badge variant="secondary" className="text-xs shrink-0">
                    #{row.step_order}
                  </Badge>
                  <Badge
                    variant="secondary"
                    className={`text-xs shrink-0 ${stepTypeLabel[row.step_type]?.color || ""}`}
                  >
                    {stepTypeLabel[row.step_type]?.label || row.step_type}
                  </Badge>
                  <span className="truncate">{row.step_name}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Sample CSV Download */}
        <div className="mt-4 p-3 bg-muted/20 rounded-lg">
          <p className="text-xs text-muted-foreground mb-2">
            📄 CSV 格式示例（复制后修改即可）：
          </p>
          <pre className="text-xs bg-muted p-2 rounded overflow-x-auto">
{`step_order,step_name,step_type,description,prompt_template
1,接收咨询,action,接收客户咨询内容,
2,AI生成回复,ai_execute,AI根据上下文生成回复草稿,"你是一个专业的客服助手..."
3,人工审核,human_approve,审核AI生成的回复,
4,发送回复,action,确认后发送给客户,`}
          </pre>
        </div>
      </CardContent>
    </Card>
  )
}
