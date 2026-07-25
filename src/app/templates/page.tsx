"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Search, Plus, Trash2, Edit2, ArrowRight, Copy, BarChart3, X } from "lucide-react"
import Link from "next/link"
import { NavBar } from "@/components/NavBar"
import { MobileNav } from "@/components/MobileNav"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

interface Template {
  id: string
  name: string
  description: string
  category: string
  steps: any[]
  config: Record<string, any>
  created_at: string
  updated_at: string
  usage_count?: number
}

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [selectedCategory, setSelectedCategory] = useState<string>("all")
  const [selectedTemplates, setSelectedTemplates] = useState<Set<string>>(new Set())
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [bulkDeleteLoading, setBulkDeleteLoading] = useState(false)

  useEffect(() => {
    fetchTemplates()
  }, [])

  const fetchTemplates = async () => {
    try {
      const res = await fetch("/api/templates?page=1&limit=50")
      const data = await res.json()

      // Fetch usage stats in parallel
      let templateUsage: Record<string, number> = {}
      try {
        const statsRes = await fetch("/api/templates/stats")
        if (statsRes.ok) {
          const stats = await statsRes.json()
          templateUsage = stats.template_usage || {}
        }
      } catch { /* stats unavailable, continue without it */ }

      const enriched = (data.templates || []).map((t: Template) => ({
        ...t,
        usage_count: templateUsage[t.id] || 0,
      }))
      setTemplates(enriched)
    } catch (err) {
      console.error("Failed to fetch templates:", err)
    } finally {
      setLoading(false)
    }
  }

  const categories = ["all", ...Array.from(new Set(templates.map((t: Template) => t.category)))]

  const filtered = templates.filter(t => {
    const matchSearch = t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.description.toLowerCase().includes(search.toLowerCase())
    const matchCat = selectedCategory === "all" || t.category === selectedCategory
    return matchSearch && matchCat
  })

  const totalUsage = templates.reduce((sum, t) => sum + (t.usage_count || 0), 0)

  const toggleSelect = (id: string) => {
    const next = new Set(selectedTemplates)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setSelectedTemplates(next)
  }

  const handleBulkDelete = async () => {
    if (selectedTemplates.size === 0) return
    setBulkDeleteLoading(true)
    try {
      const results = await Promise.all(
        Array.from(selectedTemplates).map(async (id) => {
          try {
            const res = await fetch(`/api/templates/${id}`, { method: "DELETE" })
            return res.ok ? id : null
          } catch {
            return null
          }
        })
      )
      const deleted = results.filter(Boolean) as string[]
      setTemplates(prev => prev.filter(t => !deleted.includes(t.id)))
      setSelectedTemplates(new Set())
      setDeleteDialogOpen(false)
    } catch (err) {
      console.error("Bulk delete failed:", err)
    } finally {
      setBulkDeleteLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <NavBar />
      <main className="container mx-auto px-4 py-8">
        {/* Header */}
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

        {/* Stats Bar */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{templates.length}</div>
              <div className="text-sm text-muted-foreground">总模板数</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{categories.length - 1}</div>
              <div className="text-sm text-muted-foreground">类别数</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{totalUsage}</div>
              <div className="text-sm text-muted-foreground">累计使用次数</div>
            </CardContent>
          </Card>
        </div>

        {/* Search & Filter */}
        <div className="flex gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="搜索模板名称或描述..."
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

        {/* Bulk Actions Bar */}
        {selectedTemplates.size > 0 && (
          <div className="flex items-center gap-3 mb-4 p-3 bg-muted/50 rounded-lg">
            <span className="text-sm font-medium">已选 {selectedTemplates.size} 项</span>
            <Button size="sm" variant="destructive" onClick={() => setDeleteDialogOpen(true)}>
              <Trash2 className="mr-2 h-3 w-3" /> 批量删除
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setSelectedTemplates(new Set())}>
              取消选择
            </Button>
          </div>
        )}

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
              <TemplateCard
                key={template.id}
                template={template}
                selected={selectedTemplates.has(template.id)}
                onSelect={toggleSelect}
                onDelete={fetchTemplates}
              />
            ))}
          </div>
        )}
      </main>

      {/* Bulk Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>确认批量删除</DialogTitle>
            <DialogDescription>
              确定要删除选中的 {selectedTemplates.size} 个模板吗？此操作不可恢复。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)} disabled={bulkDeleteLoading}>
              取消
            </Button>
            <Button variant="destructive" onClick={handleBulkDelete} disabled={bulkDeleteLoading}>
              {bulkDeleteLoading ? "删除中..." : "确认删除"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Mobile Bottom Tab Navigation */}
      <MobileNav />
    </div>
  )
}

function TemplateCard({
  template,
  selected,
  onSelect,
  onDelete,
}: {
  template: Template
  selected: boolean
  onSelect: (id: string) => void
  onDelete: () => void
}) {
  const [deleteConfirm, setDeleteConfirm] = useState(false)

  const handleDelete = async () => {
    if (!deleteConfirm) {
      setDeleteConfirm(true)
      setTimeout(() => setDeleteConfirm(false), 3000)
      return
    }
    try {
      await fetch(`/api/templates/${template.id}`, { method: "DELETE" })
      onDelete()
    } catch (err) {
      console.error("Delete failed:", err)
    }
  }

  const handleDuplicate = async () => {
    try {
      const res = await fetch(`/api/templates/${template.id}/duplicate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      })
      if (!res.ok) throw new Error("Duplicate failed")
      onDelete()
    } catch (err) {
      console.error("Duplicate failed:", err)
      alert("复制失败，请重试")
    }
  }

  return (
    <Card className={`hover:shadow-md transition-shadow ${selected ? 'ring-2 ring-primary' : ''}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start gap-3">
          {/* Checkbox for bulk select */}
          <input
            type="checkbox"
            checked={selected}
            onChange={() => onSelect(template.id)}
            className="mt-1 h-4 w-4 rounded border-gray-300"
          />
          <div className="flex-1">
            <div className="flex items-start justify-between">
              <CardTitle className="text-lg">{template.name}</CardTitle>
              <Badge variant="secondary">{template.category}</Badge>
            </div>
            <CardDescription className="mt-1 line-clamp-2">{template.description}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between text-sm text-muted-foreground mb-4">
          <div className="flex items-center gap-3">
            <span>{template.steps?.length || 0} 个步骤</span>
            <span className="flex items-center gap-1">
              <BarChart3 className="h-3 w-3" />
              {(template.usage_count || 0)} 次使用
            </span>
          </div>
          <span>{new Date(template.created_at).toLocaleDateString("zh-CN")}</span>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" className="flex-1">
            <Link href={`/templates/${template.id}`} className="flex items-center gap-1">
              详情 <ArrowRight className="ml-1 h-3 w-3" />
            </Link>
          </Button>
          <Button size="sm" variant="ghost" className="p-2" onClick={handleDuplicate} title="复制模板">
            <Copy className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="p-2"
            onClick={handleDelete}
            title={deleteConfirm ? "再次点击确认删除" : "删除模板"}
          >
            {deleteConfirm ? (
              <X className="h-4 w-4 text-destructive animate-pulse" />
            ) : (
              <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
            )}
          </Button>
        </div>
        {deleteConfirm && (
          <p className="text-xs text-destructive mt-2 animate-pulse">再次点击删除按钮确认</p>
        )}
      </CardContent>
    </Card>
  )
}
