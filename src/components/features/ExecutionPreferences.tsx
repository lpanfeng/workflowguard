"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Settings2, Save, CheckCircle2, AlertCircle } from "lucide-react"
import { toast } from "sonner"

const AI_MODELS = [
  { value: "gpt-4o", label: "GPT-4o (OpenAI)" },
  { value: "claude-sonnet-4", label: "Claude Sonnet 4 (Anthropic)" },
  { value: "qwen-max", label: "Qwen Max (阿里云)" },
  { value: "glm-5", label: "GLM-5 (智谱)" },
  { value: "kimi-k3", label: "Kimi K3 (月之暗面)" },
]

export function ExecutionPreferences() {
  const [timeoutMinutes, setTimeoutMinutes] = useState("5")
  const [retryCount, setRetryCount] = useState("3")
  const [aiModel, setAiModel] = useState("gpt-4o")
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    // Simulate save
    await new Promise(resolve => setTimeout(resolve, 800))
    setSaving(false)
    toast.success("执行偏好已保存")
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings2 className="h-5 w-5 text-primary" />
          工作流执行偏好
        </CardTitle>
        <CardDescription>配置全局工作流执行参数，每个工作流也可单独覆盖</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Timeout */}
        <div className="grid gap-2 max-w-xs">
          <Label htmlFor="timeout">默认超时时间（分钟）</Label>
          <Input
            id="timeout"
            type="number"
            min="1"
            max="60"
            value={timeoutMinutes}
            onChange={(e) => setTimeoutMinutes(e.target.value)}
            placeholder="5"
          />
          <p className="text-xs text-muted-foreground">超过此时长仍未完成将自动中断</p>
        </div>

        {/* Retry Count */}
        <div className="grid gap-2 max-w-xs">
          <Label htmlFor="retries">失败重试次数</Label>
          <Input
            id="retries"
            type="number"
            min="0"
            max="10"
            value={retryCount}
            onChange={(e) => setRetryCount(e.target.value)}
            placeholder="3"
          />
          <p className="text-xs text-muted-foreground">AI调用失败后自动重试，使用指数退避策略</p>
        </div>

        {/* AI Model */}
        <div className="grid gap-2 max-w-xs">
          <Label htmlFor="model">默认AI模型</Label>
          <Select value={aiModel} onValueChange={(v) => setAiModel(v || "gpt-4o")}>
            <SelectTrigger>
              <SelectValue placeholder="选择AI模型" />
            </SelectTrigger>
            <SelectContent>
              {AI_MODELS.map((m) => (
                <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">新工作流将默认使用此模型，已有工作流可单独设置</p>
        </div>

        {/* Save Button */}
        <Button onClick={handleSave} disabled={saving} className="gap-2">
          {saving ? (
            <>
              <span className="animate-spin">⟳</span>
              保存中...
            </>
          ) : (
            <>
              <Save className="h-4 w-4" />
              保存偏好设置
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  )
}
