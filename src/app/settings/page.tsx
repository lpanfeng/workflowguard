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
import { MobileNav } from "@/components/MobileNav"
import { ExecutionPreferences } from "@/components/features/ExecutionPreferences"
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
  Key,
  Copy,
  Trash2,
  Plus,
  Bot,
  Globe,
} from "lucide-react"

interface ApiKey {
  id: string
  name: string
  key_value: string
  last_used_at: string | null
  expires_at: string | null
  is_revoked: boolean
  created_at: string
}

interface WebhookConfig {
  id: string
  name: string
  url: string
  events: string[]
  is_active: boolean
  last_triggered_at: string | null
  last_status: string | null
}

export default function SettingsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [feishuWebhookUrl, setFeishuWebhookUrl] = useState("")
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)

  // API 密钥
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([])
  const [newKeyName, setNewKeyName] = useState("")
  const [generatingKey, setGeneratingKey] = useState(false)
  const [newlyGeneratedKey, setNewlyGeneratedKey] = useState<string | null>(null)
  const [loadingKeys, setLoadingKeys] = useState(false)

  // Webhook 配置
  const [webhooks, setWebhooks] = useState<WebhookConfig[]>([])
  const [showAddWebhook, setShowAddWebhook] = useState(false)
  const [newWebhookName, setNewWebhookName] = useState("")
  const [newWebhookUrl, setNewWebhookUrl] = useState("")

  // 飞书集成状态
  const [feishuStatus, setFeishuStatus] = useState<{
    webhookUrl: string | null
    isBound: boolean
    feishuOpenId: string | null
    boundAt: string | null
  }>({ webhookUrl: null, isBound: false, feishuOpenId: null, boundAt: null })

  // 通知偏好
  const [notificationPrefs, setNotificationPrefs] = useState({
    email_notifications: true,
    email_on_approval_needed: true,
    email_on_approved: true,
    email_on_rejected: true,
    email_on_completed: false,
    digest_enabled: false,
    digest_frequency: "daily" as string,
  })
  const [savingNotif, setSavingNotif] = useState(false)

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/login")
    }
  }, [status, router])

  useEffect(() => {
    if (session?.user?.id) {
      loadSettings()
      loadApiKeys()
      loadWebhooks()
      loadNotificationPrefs()
    }
  }, [session])

  const loadSettings = async () => {
    try {
      const { data } = await supabase
        .from("profiles")
        .select("webhook_url, feishu_open_id, feishu_bound_at")
        .eq("id", session!.user!.id)
        .single()
      if (data) {
        setFeishuWebhookUrl(data.webhook_url ?? "")
        setFeishuStatus({
          webhookUrl: data.webhook_url,
          isBound: !!data.feishu_open_id,
          feishuOpenId: data.feishu_open_id,
          boundAt: data.feishu_bound_at,
        })
      }
    } catch (err) {
      console.error("加载设置失败:", err)
    }
  }

  const loadApiKeys = async () => {
    setLoadingKeys(true)
    try {
      const res = await fetch("/api/settings")
      if (res.ok) {
        const data = await res.json()
        setApiKeys(data.apiKeys ?? [])
      }
    } catch (err) {
      console.error("加载 API 密钥失败:", err)
    } finally {
      setLoadingKeys(false)
    }
  }

  const loadWebhooks = async () => {
    try {
      const res = await fetch("/api/settings")
      if (res.ok) {
        const data = await res.json()
        setWebhooks(data.webhooks ?? [])
      }
    } catch (err) {
      console.error("加载 Webhook 失败:", err)
    }
  }

  // 通知偏好
  const loadNotificationPrefs = async () => {
    try {
      const res = await fetch(`/api/notifications/preferences?userId=${session!.user!.id}`)
      if (res.ok) {
        const data = await res.json()
        if (data.prefs) {
          setNotificationPrefs({
            email_notifications: data.prefs.email_notifications ?? true,
            email_on_approval_needed: data.prefs.email_on_approval_needed ?? true,
            email_on_approved: data.prefs.email_on_approved ?? true,
            email_on_rejected: data.prefs.email_on_rejected ?? true,
            email_on_completed: data.prefs.email_on_completed ?? false,
            digest_enabled: data.prefs.digest_enabled ?? false,
            digest_frequency: data.prefs.digest_frequency ?? "daily",
          })
        }
      }
    } catch (err) {
      console.error("加载通知偏好失败:", err)
    }
  }

  const updatePref = async (key: string, value: boolean | string) => {
    setNotificationPrefs((prev) => ({ ...prev, [key]: value }))
    setSavingNotif(true)
    try {
      const res = await fetch("/api/notifications/preferences", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: session!.user!.id, [key]: value }),
      })
      if (res.ok) {
        toast.success("通知偏好已更新")
      } else {
        toast.error("更新失败，请重试")
      }
    } catch (err) {
      console.error("更新通知偏好失败:", err)
      toast.error("网络错误")
    } finally {
      setSavingNotif(false)
    }
  }

  const handleSaveWebhook = async () => {
    setSaving(true)
    try {
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

  // 生成 API 密钥
  const handleGenerateKey = async () => {
    setGeneratingKey(true)
    setNewlyGeneratedKey(null)
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newKeyName || "default" }),
      })
      const data = await res.json()
      if (res.ok && data.apiKey) {
        setNewlyGeneratedKey(data.apiKey)
        toast.success("API 密钥已生成，请立即复制。关闭后不再显示。")
        await loadApiKeys()
      } else {
        toast.error("生成失败: " + (data.error || "未知错误"))
      }
    } catch (err) {
      toast.error("生成失败")
      console.error(err)
    } finally {
      setGeneratingKey(false)
    }
  }

  // 复制密钥到剪贴板
  const handleCopyKey = (key: string) => {
    navigator.clipboard.writeText(key)
    toast.success("已复制到剪贴板")
  }

  // 撤销 API 密钥
  const handleRevokeKey = async (keyId: string) => {
    try {
      const res = await fetch(`/api/settings?id=${keyId}`, { method: "DELETE" })
      if (res.ok) {
        toast.success("密钥已撤销")
        await loadApiKeys()
      } else {
        toast.error("撤销失败")
      }
    } catch (err) {
      toast.error("撤销失败")
      console.error(err)
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

        {/* API 密钥管理 */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Key className="h-5 w-5 text-primary" />
              <div>
                <CardTitle>API 密钥</CardTitle>
                <CardDescription>
                  管理 API 密钥，用于外部系统调用 WorkflowGuard API
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* 已有密钥列表 */}
            {loadingKeys ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : apiKeys.length > 0 ? (
              <div className="space-y-2">
                {apiKeys.map((key) => (
                  <div
                    key={key.id}
                    className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{key.name}</span>
                        {key.last_used_at && (
                          <span className="text-xs text-muted-foreground">
                            最后使用: {new Date(key.last_used_at).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                      <code className="text-xs text-muted-foreground block truncate mt-1">
                        {key.key_value.substring(0, 16)}...
                      </code>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 ml-4">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleCopyKey(key.key_value)}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRevokeKey(key.id)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                暂无 API 密钥。生成一个密钥用于 API 调用。
              </p>
            )}

            <Separator />

            {/* 生成新密钥 */}
            <div>
              {newlyGeneratedKey ? (
                <div className="space-y-3">
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                    <p className="text-sm font-semibold text-amber-800 mb-1">
                      ⚠️ 新密钥已生成（仅显示一次）
                    </p>
                    <code className="text-xs bg-amber-100 px-2 py-1 rounded block break-all">
                      {newlyGeneratedKey}
                    </code>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleCopyKey(newlyGeneratedKey)}
                    >
                      <Copy className="h-4 w-4 mr-1" />
                      复制密钥
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setNewlyGeneratedKey(null)}
                    >
                      我已保存，关闭
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex gap-2">
                  <Input
                    placeholder="密钥名称（如: production-api）"
                    value={newKeyName}
                    onChange={(e) => setNewKeyName(e.target.value)}
                    className="max-w-xs"
                  />
                  <Button
                    onClick={handleGenerateKey}
                    disabled={generatingKey}
                  >
                    {generatingKey ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-1" />
                    ) : (
                      <Plus className="h-4 w-4 mr-1" />
                    )}
                    生成密钥
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* 飞书集成状态 */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Bot className="h-5 w-5 text-blue-500" />
              <div>
                <CardTitle>飞书集成</CardTitle>
                <CardDescription>
                  WorkflowGuard 与飞书的集成状态
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
              <div className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full ${feishuStatus.isBound ? "bg-green-500" : "bg-gray-300"}`} />
                <div>
                  <p className="font-medium">
                    {feishuStatus.isBound ? "已连接飞书" : "未连接飞书"}
                  </p>
                  {feishuStatus.isBound && feishuStatus.boundAt && (
                    <p className="text-xs text-muted-foreground">
                      绑定时间: {new Date(feishuStatus.boundAt).toLocaleString()}
                    </p>
                  )}
                  {!feishuStatus.isBound && (
                    <p className="text-xs text-muted-foreground">
                      连接飞书后可接收审批卡片通知，直接在飞书中处理审批
                    </p>
                  )}
                </div>
              </div>
              {feishuStatus.isBound ? (
                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                  <Check className="h-3 w-3 mr-1" />
                  已连接
                </Badge>
              ) : (
                <Badge variant="secondary">
                  <X className="h-3 w-3 mr-1" />
                  未连接
                </Badge>
              )}
            </div>

            {feishuStatus.isBound && (
              <div className="text-sm text-muted-foreground bg-blue-50 p-3 rounded-lg">
                <p className="text-blue-700">💡 集成已启用</p>
                <p className="text-blue-600 text-xs mt-1">
                  审批任务将会通过飞书 Bot 发送审批卡片。你可以直接在飞书中
                  点击「通过」或「驳回」来处理审批。
                </p>
              </div>
            )}

            <div className="text-sm text-muted-foreground bg-slate-50 p-3 rounded-lg">
              <p>📌 在 settings 页中配置飞书 App ID 和 App Secret 以启用完整集成。</p>
            </div>
          </CardContent>
        </Card>

        {/* 📧 邮件通知偏好 */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-primary" />
              <div>
                <CardTitle>邮件通知</CardTitle>
                <CardDescription>管理审批相关的邮件通知设置</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* 通知开关 */}
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">邮件通知</p>
                <p className="text-sm text-muted-foreground">接收审批相关的邮件提醒</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={notificationPrefs.email_notifications}
                  onChange={(e) => updatePref("email_notifications", e.target.checked)}
                  disabled={savingNotif}
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary/50 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
              </label>
            </div>

            {notificationPrefs.email_notifications && (
              <>
                <Separator />
                <div className="space-y-3">
                  <h4 className="text-sm font-medium">触发事件</h4>
                  {[
                    { key: "email_on_approval_needed", label: "有新审批待处理" },
                    { key: "email_on_approved", label: "任务审批通过" },
                    { key: "email_on_rejected", label: "任务被驳回" },
                    { key: "email_on_completed", label: "任务全流程完成" },
                  ].map(({ key, label }) => (
                    <div key={key} className="flex items-center justify-between py-1">
                      <span className="text-sm text-muted-foreground">{label}</span>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          className="sr-only peer"
                          checked={(notificationPrefs as any)[key]}
                          onChange={(e) => updatePref(key, e.target.checked)}
                          disabled={savingNotif}
                        />
                        <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary/50 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
                      </label>
                    </div>
                  ))}
                </div>

                <Separator />
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">每日摘要</p>
                    <p className="text-sm text-muted-foreground">定期汇总未处理的审批任务</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      checked={notificationPrefs.digest_enabled}
                      onChange={(e) => updatePref("digest_enabled", e.target.checked)}
                      disabled={savingNotif}
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary/50 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                  </label>
                </div>
              </>
            )}

            <div className="text-xs text-muted-foreground bg-slate-50 p-3 rounded-lg">
              <p>💡 邮件通知需要配置 RESEND_API_KEY 环境变量。通知将发送到你的注册邮箱。</p>
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

      {/* Mobile Bottom Tab Navigation */}
      <MobileNav />
    </div>
  )
}
