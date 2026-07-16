"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { ArrowLeft, Plus, Trash2, Save } from "lucide-react"
import Link from "next/link"
import { NavBar } from "@/components/NavBar"
import { MobileNav } from "@/components/MobileNav"

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
}

export default function EditTemplatePage() {
  const params = useParams()
  const router = useRouter()
  const [template, setTemplate] = useState<Template | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [category, setCategory] = useState("general")
  const [steps, setSteps] = useState<TemplateStep[]>([{ step_name: "", step_type: "action", description: "" }])

  useEffect(() => {
    if (params.id) fetchTemplate()
  }, [params.id])

  const fetchTemplate = async () => {
    try {
      const res = await fetch(`/api/templates/${params.id}`)
      if (!res.ok) throw new Error("Template not found")
      const data = await res.json()
      setTemplate(data)
      setName(data.name)
      setDescription(data.description || "")
      setCategory(data.category || "general")
      setSteps(data.steps?.length ? data.steps : [{ step_name: "", step_type: "action", description: "" }])
    } catch (err: any) {
      alert(err.message || "Failed to load template")
      router.push("/templates")
    } finally {
      setLoading(false)
    }
  }

  const addStep = () => setSteps([...steps, { step_name: "", step_type: "action", description: "" }])
  const removeStep = (idx: number) => setSteps(steps.filter((_, i) => i !== idx))
  const updateStep = (idx: number, field: string, value: string) => {
    const newSteps = [...steps]
    newSteps[idx] = { ...newSteps[idx], [field]: value }
    setSteps(newSteps)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) { alert("模板名称不能为空"); return }
    setSaving(true)
    try {
      const res = await fetch(`/api/templates/${params.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, description, category, steps }),
      })
      if (res.ok) router.push(`/templates/${params.id}`)
      else {
        const err = await res.json()
        alert(`保存失败: ${err.error || "未知错误"}`)
      }
    } catch (err) {
      alert("保存失败")
    } finally {
      setSaving(false)
    }
  }

  if (loading) return (
    <div className="min-h-screen bg-background">
      <NavBar />
      <main className="container mx-auto px-4 py-8">
        <div className="animate-pulse space-y-4 max-w-3xl mx-auto">
          <div className="h-8 w-48 bg-muted rounded" />
          <div className="space-y-3">
            {[1,2,3].map(i => <div key={i} className="h-12 bg-muted rounded" />)}
          </div>
        </div>
      </main>
    </div>
  )

  return (
    <div className="min-h-screen bg-background">
      <NavBar />
      <main className="container mx-auto px-4 py-8 max-w-3xl">
        <Link href={`/templates/${params.id}`} className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft className="h-4 w-4" /> 返回模板详情
        </Link>

        <h1 className="text-2xl font-bold mb-6">编辑模板</h1>

        <form onSubmit={handleSubmit} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>基本信息</CardTitle>
              <CardDescription>修改模板的基础信息</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="name">模板名称 *</Label>
                <Input id="name" value={name} onChange={e => setName(e.target.value)} placeholder="例如：客户咨询审批流" required />
              </div>
              <div>
                <Label htmlFor="desc">描述</Label>
                <Textarea id="desc" value={description} onChange={e => setDescription(e.target.value)} placeholder="简要描述此模板的用途" rows={3} />
              </div>
              <div>
                <Label htmlFor="category">分类</Label>
                <Input id="category" value={category} onChange={e => setCategory(e.target.value)} placeholder="例如：customer-service" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>工作流步骤 ({steps.length})</CardTitle>
                <CardDescription>定义模板的执行步骤顺序</CardDescription>
              </div>
              <Button type="button" size="sm" variant="outline" onClick={addStep}>
                <Plus className="mr-1 h-3 w-3" /> 添加步骤
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {steps.map((step, idx) => (
                <div key={idx} className="flex gap-3 items-start p-3 border rounded-lg">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold mt-1">
                    {idx + 1}
                  </div>
                  <div className="flex-1 space-y-2">
                    <div className="flex gap-2">
                      <Input
                        placeholder="步骤名称"
                        value={step.step_name}
                        onChange={e => updateStep(idx, "step_name", e.target.value)}
                        className="flex-1"
                      />
                      <select
                        value={step.step_type}
                        onChange={e => updateStep(idx, "step_type", e.target.value)}
                        className="border rounded-md px-2 py-1 bg-background min-w-[120px]"
                      >
                        <option value="action">操作</option>
                        <option value="ai_execute">AI执行</option>
                        <option value="human_approve">人工审批</option>
                        <option value="notify">通知</option>
                      </select>
                    </div>
                    <Textarea
                      placeholder="步骤描述"
                      value={step.description}
                      onChange={e => updateStep(idx, "description", e.target.value)}
                      rows={2}
                    />
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="mt-2"
                    onClick={() => removeStep(idx)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>

          <div className="flex gap-3">
            <Button type="submit" size="lg" disabled={saving}>
              <Save className="h-4 w-4 mr-1" /> {saving ? "保存中..." : "保存修改"}
            </Button>
            <Button type="button" variant="outline" size="lg" onClick={() => router.back()}>取消</Button>
          </div>
        </form>
      </main>
      <MobileNav />
    </div>
  )
}
