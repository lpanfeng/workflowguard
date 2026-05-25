"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"
import Link from "next/link"
import {
  ArrowLeft,
  Bell,
  Webhook,
  MessageSquare,
  Loader2,
  Check,
  X,
  CreditCard,
  TrendingUp,
  Workflow,
  ShieldCheck,
} from "lucide-react"

export default function SettingsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [feishuWebhookUrl, setFeishuWebhookUrl] = useState("")
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/login")
    }
  }, [status, router])

  useEffect(() => {
    if (session?.user?.id) {
      loadSettings()
    }
  }, [session])

  const loadSettings = async () => {
    try {
      const { data } = await supabase
        .from("profiles")
        .select("webhook_url")
        .eq("id", session!.user!.id)
        .single()
      if (data?.webhook_url) {
        setFeishuWebhookUrl(data.webhook_url)
      }
    } catch (err) {
      console.error("加载设置失败:", err)
    }
  }

  const handleSaveWebhook = async () => {
    setSaving(true)
    try {
      // 更新 profiles 表的 webhook_url 字段
      // 注意：需要先在 profiles 表添加 webhook_url 字段
      const { error } = await supabase
        .from("profiles")
        .update({ webhook_url: feishuWebhookUrl || null })
        .eq("id", session!.user!.id)

      if (error) {
        toast.error("保存失败: " + error.message)
        return
      }
      toast.success("Webhook 地址已保存")
    } catch (err) {
      toast.error("保存失败")
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  const handleTestWebhook = async () => {
    if (!feishuWebhookUrl) {
      toast.error("请先输入 Webhook 地址")
      return
    }
    setTesting(true)
    try {
      const res = await fetch(feishuWebhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          msg_type: "text",
          content: { text: "✅ WorkflowGuard 通知测试！\n您已成功配置通知。\n\n当有任务需要审批时，您将在此收到通知。" },
        }),
      })
      if (res.ok) {
        toast.success("测试消息已发送！请检查飞书")
      } else {
        toast.error("发送失败，请检查 Webhook 地址")
      }
    } catch {
      toast.error("网络错误，请检查 Webhook 地址")
    } finally {
      setTesting(false)
    }
  }

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">加载中...</p>
      </div>
    )
  }

  if (!session?.user) return null

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="border-b bg-background">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/" className="text-xl font-bold">
            WorkflowGuard
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/dashboard">
              <Button variant="ghost" size="sm">仪表盘</Button>
            </Link>
            <Avatar className="h-8 w-8">
              <AvatarImage src={session.user.image ?? undefined} />
              <AvatarFallback>{session.user.name?.charAt(0) ?? "U"}</AvatarFallback>
            </Avatar>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-3xl">
        <div className="flex items-center gap-3 mb-8">
          <Link href="/dashboard">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-1" />
              返回
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">设置</h1>
            <p className="text-muted-foreground mt-1">管理你的 WorkflowGuard 配置</p>
          </div>
        </div>

        {/* 通知设置 */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-primary" />
              <div>
                <CardTitle>通知设置</CardTitle>
                <CardDescription>
                  配置任务审批和系统通知的接收方式
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* 飞书 Webhook */}
            <div>
              <div className="flex items-center gap-2 mb-1">
                <MessageSquare className="h-4 w-4 text-blue-500" />
                <Label className="font-medium">飞书 Webhook</Label>
                <Badge variant="secondary" className="text-xs">推荐</Badge>
              </div>
              <p className="text-sm text-muted-foreground mb-3">
                输入飞书群机器人的 Webhook 地址，当有任务需要审批时自动通知。
                在飞书群中添加「自定义机器人」并复制 Webhook 地址。
              </p>
              <div className="flex gap-2">
                <Input
                  placeholder="https://open.feishu.cn/open-apis/bot/v2/hook/..."
                  value={feishuWebhookUrl}
                  onChange={(e) => setFeishuWebhookUrl(e.target.value)}
                  className="flex-1"
                />
                <Button
                  variant="outline"
                  onClick={handleTestWebhook}
                  disabled={testing}
                >
                  {testing ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "测试"
                  )}
                </Button>
                <Button onClick={handleSaveWebhook} disabled={saving}>
                  {saving ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-1" />
                  ) : null}
                  保存
                </Button>
              </div>
            </div>

            <Separator />

            {/* 邮件通知 */}
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Bell className="h-4 w-4 text-gray-500" />
                <Label className="font-medium">邮件通知</Label>
                <Badge variant="secondary" className="text-xs">即将推出</Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                通过邮件接收任务审批通知。当前账户邮箱：{session.user.email}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* 套餐与用量 */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-primary" />
              <div>
                <CardTitle>套餐与用量</CardTitle>
                <CardDescription>查看当前套餐使用情况和升级选项</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">当前套餐</p>
                <Badge variant="secondary" className="mt-1 capitalize">{(session.user as any).plan ?? "free"}</Badge>
              </div>
              <Link href="/pricing">
                <Button variant="outline" size="sm">
                  查看套餐
                  <TrendingUp className="h-4 w-4 ml-1" />
                </Button>
              </Link>
            </div>
            <Separator />
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-muted/50 rounded-lg p-3">
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Workflow className="h-3 w-3" />
                  工作流使用
                </p>
                <p className="text-lg font-semibold mt-1">
                  {((session.user as any).workflow_quota ?? 0) > 0 ? `${(session.user as any).workflow_quota ?? 0} / ${(session.user as any).workflow_quota ?? 2}` : "查询中..."}
                </p>
              </div>
              <div className="bg-muted/50 rounded-lg p-3">
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <ShieldCheck className="h-3 w-3" />
                  审批用量
                </p>
                <p className="text-lg font-semibold mt-1">
                  {((session.user as any).approval_used ?? 0) >= 0 ? `${(session.user as any).approval_used ?? 0} / ${(session.user as any).approval_quota ?? 20}` : "查询中..."}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 账号信息 */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Avatar className="h-8 w-8">
                <AvatarImage src={session.user.image ?? undefined} />
                <AvatarFallback>{session.user.name?.charAt(0) ?? "U"}</AvatarFallback>
              </Avatar>
              <div>
                <CardTitle>账号信息</CardTitle>
                <CardDescription>你的账户详情和套餐状态</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">名称</span>
                <p className="font-medium">{session.user.name ?? "未设置"}</p>
              </div>
              <div>
                <span className="text-muted-foreground">邮箱</span>
                <p className="font-medium">{session.user.email}</p>
              </div>
              <div>
                <span className="text-muted-foreground">角色</span>
                <p className="font-medium capitalize">{(session.user as any).role ?? "user"}</p>
              </div>
              <div>
                <span className="text-muted-foreground">套餐</span>
                <Badge variant="outline">{(session.user as any).plan ?? "free"}</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
