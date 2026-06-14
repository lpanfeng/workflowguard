"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { NavBar } from "@/components/NavBar"
import { supabase } from "@/lib/supabase"
import { Plus, FileText, Upload, Trash2, RefreshCw } from "lucide-react"
import Link from "next/link"
import { UploadTemplate } from "@/components/features/UploadTemplate"
import { toast } from "sonner"

export default function WorkflowsList() {
  const { data: session } = useSession()
  const router = useRouter()
  const [workflows, setWorkflows] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const loadWorkflows = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from("workflows")
      .select("*")
      .eq("is_active", true)
      .order("created_at", { ascending: false })
    if (!error && data) {
      setWorkflows(data)
    }
    setLoading(false)
  }

  useEffect(() => {
    if (session) loadWorkflows()
  }, [session])

  const handleDelete = async (id: string) => {
    if (!confirm("确认停用此工作流？")) return
    const { error } = await supabase
      .from("workflows")
      .update({ is_active: false })
      .eq("id", id)
    if (!error) {
      toast.success("工作流已停用")
      loadWorkflows()
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <NavBar />
      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold">我的工作流</h1>
            <p className="text-muted-foreground">管理你的 AI 工作流</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => router.push("/workflows/new")}>
              <Plus className="h-4 w-4 mr-2" />
              创建模板
            </Button>
          </div>
        </div>

        {workflows.length === 0 ? (
          <Card>
            <CardContent className="pt-8 text-center">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground mb-4">还没有工作流</p>
              <div className="flex gap-3 justify-center">
                <Link href="/workflows/new">
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    选择模板创建
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {workflows.map((w) => (
              <Card key={w.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CardTitle>{w.name}</CardTitle>
                      <Badge variant="outline">ID: {w.id.slice(0, 8)}...</Badge>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => router.push(`/workflows/${w.id}`)}
                      >
                        <RefreshCw className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(w.id)}
                        className="text-red-500"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <CardDescription>
                    {w.description || "暂无描述"} · 创建于 {new Date(w.created_at).toLocaleDateString()}
                  </CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        )}

        {/* CSV Import */}
        <div className="mt-8">
          <UploadTemplate onSuccess={(rows) => {
            toast.success(`已解析 ${rows.length} 个步骤`)
          }} />
        </div>
      </main>
    </div>
  )
}
