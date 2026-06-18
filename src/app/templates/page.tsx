"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Search, Plus, Trash2, Edit2, ArrowRight } from "lucide-react"
import Link from "next/link"
import { NavBar } from "@/components/NavBar"
import { MobileNav } from "@/components/MobileNav"

interface Template {
  id: string
  name: string
  description: string
  category: string
  steps: any[]
  config: Record<string, any>
  created_at: string
  updated_at: string
}

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [selectedCategory, setSelectedCategory] = useState<string>("all")

  useEffect(() => {
    fetchTemplates()
  }, [])

  const fetchTemplates = async () => {
    try {
      const res = await fetch("/api/templates?page=1&limit=50")
      const data = await res.json()
      setTemplates(data.templates || [])
    } catch (err) {
      console.error("Failed to fetch templates:", err)
    } finally {
      setLoading(false)
    }
  }

  const categories = ["all", ...Array.from(new Set(templates.map(t => t.category)))]

  const filtered = templates.filter(t => {
    const matchSearch = t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.description.toLowerCase().includes(search.toLowerCase())
    const matchCat = selectedCategory === "all" || t.category === selectedCategory
    return matchSearch && matchCat
  })

  return (
    <div className="min-h-screen bg-background">
      <NavBar />
      <main className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">模板库</h1>
            <p className="text-muted-foreground mt-1">管理和使用预置工作流模板</p>
          </div>
          <Link href="/templates/new">
            <Button>
              <Plus className="mr-2 h-4 w-4" /> 新建模板
            </Button>
          </Link>
        </div>

        {/* Search & Filter */}
        <div className="flex gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="搜索模板..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="border rounded-md px-3 py-2 bg-background"
          >
            {categories.map(cat => (
              <option key={cat} value={cat}>{cat === "all" ? "全部类别" : cat}</option>
            ))}
          </select>
        </div>

        {/* Template Grid */}
        {loading ? (
          <div className="text-center py-12 text-muted-foreground">加载中...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">暂无模板</p>
            <Link href="/templates/new">
              <Button variant="outline" className="mt-4">
                <Plus className="mr-2 h-4 w-4" /> 创建第一个模板
              </Button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map(template => (
              <TemplateCard key={template.id} template={template} onDelete={fetchTemplates} />
            ))}
          </div>
        )}
      </main>
    </div>
  )
}

function TemplateCard({ template, onDelete }: { template: Template; onDelete: () => void }) {
  const handleDelete = async () => {
    if (!confirm(`确定删除模板「${template.name}」？`)) return
    try {
      await fetch(`/api/templates/${template.id}`, { method: "DELETE" })
      onDelete()
    } catch (err) {
      console.error("Delete failed:", err)
    }
  }

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-lg">{template.name}</CardTitle>
            <CardDescription className="mt-1">{template.description}</CardDescription>
          </div>
          <Badge variant="secondary">{template.category}</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between text-sm text-muted-foreground mb-4">
          <span>{template.steps?.length || 0} 个步骤</span>
          <span>{new Date(template.created_at).toLocaleDateString("zh-CN")}</span>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" className="flex-1">
            <Link href={`/templates/${template.id}`} className="flex items-center gap-1">
              详情 <ArrowRight className="ml-1 h-3 w-3" />
            </Link>
          </Button>
          <Button size="sm" variant="ghost" className="p-2" onClick={handleDelete}>
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
