"use client"

import { useSearchParams, useRouter } from "next/navigation"
import { Suspense, useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import { MobileNav } from "@/components/MobileNav"
import { Check, ArrowLeft, Loader2, AlertCircle } from "lucide-react"

function CheckoutContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { data: session, status } = useSession()
  const plan = searchParams.get("plan") || "basic"
  const billing = searchParams.get("billing") || "monthly"
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isSubscribed, setIsSubscribed] = useState(false)

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push(`/auth/login?callbackUrl=/pricing/checkout?plan=${plan}&billing=${billing}`)
    }
  }, [status])

  const planDetails: Record<string, { name: string; price: number; priceAnnual: number; features: string[] }> = {
    basic: {
      name: "基础版 Basic",
      price: 99,
      priceAnnual: 990,
      features: ["10 个工作流", "每月 300 次审批", "1000 次 AI 调用", "邮件 + Webhook 通知", "7 天日志保留"],
    },
    pro: {
      name: "专业版 Pro",
      price: 299,
      priceAnnual: 2990,
      features: ["50 个工作流", "每月 2000 次审批", "10000 次 AI 调用", "自定义工作流模板", "多模型选择 (OpenAI/Claude)", "30 天日志保留", "优先邮件支持"],
    },
    team: {
      name: "团队版 Team",
      price: 999,
      priceAnnual: 9990,
      features: ["200 个工作流", "每月 10000 次审批", "无限 AI 调用", "团队协作与权限管理", "企业 SSO / 飞书集成", "90 天日志保留", "专属客户成功经理", "SLA 保障"],
    },
  }

  const detail = planDetails[plan]
  const finalPrice = billing === "annual" ? detail?.priceAnnual : detail?.price

  if (!detail) {
    return (
      <div className="text-center py-16">
        <p className="text-muted-foreground mb-4">未找到该套餐</p>
        <Link href="/pricing">
          <Button variant="outline">返回定价页面</Button>
        </Link>
      </div>
    )
  }

  const handlePayment = async () => {
    if (!session?.user?.id) return

    setProcessing(true)
    setError(null)

    try {
      const res = await fetch("/api/checkout/create-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plan,
          userId: session.user.id,
          email: session.user.email,
        }),
      })

      const data = await res.json()

      if (!data.success) {
        setError(data.error || "创建支付会话失败")
        return
      }

      if (data.url) {
        // 跳转到 Stripe Checkout 或本地支付页面
        if (data.mode === "stripe") {
          window.location.href = data.url
        } else {
          // 本地支付确认页面
          router.push(data.url)
        }
      } else if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl
      } else {
        setError("支付服务暂时不可用")
      }
    } catch (err) {
      console.error("支付处理失败:", err)
      setError("网络错误，请稍后重试")
    } finally {
      setProcessing(false)
    }
  }

  // 模拟本地支付成功（用于演示/开发环境）
  const handleLocalPay = async () => {
    setProcessing(true)
    try {
      // 直接调用确认 API 更新用户套餐
      const res = await fetch("/api/webhooks/stripe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "checkout.session.completed",
          data: {
            object: {
              id: `demo_${Date.now()}`,
              client_reference_id: session?.user?.id,
              metadata: { userId: session?.user?.id, plan },
            },
          },
        }),
      })

      if (res.ok) {
        setIsSubscribed(true)
      } else {
        setError("更新套餐失败")
      }
    } catch {
      setError("处理失败")
    } finally {
      setProcessing(false)
    }
  }

  if (isSubscribed) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-green-50 to-white">
        <main className="container mx-auto px-4 py-16 max-w-lg text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <Check className="h-8 w-8 text-green-600" />
          </div>
          <h1 className="text-3xl font-bold mb-4">支付成功！🎉</h1>
          <p className="text-muted-foreground mb-8">
            你已成功升级到 <strong>{detail.name}</strong> 套餐。所有高级功能现已可用。
          </p>
          <Link href="/dashboard">
            <Button size="lg">
              进入控制台
              <ArrowLeft className="h-4 w-4 ml-2 rotate-180" />
            </Button>
          </Link>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="border-b bg-background">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/pricing" className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1">
            <ArrowLeft className="h-4 w-4" />
            返回定价
          </Link>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              {billing === "annual" ? "年付" : "月付"}
            </Badge>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12 max-w-2xl">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
          {/* 订单摘要 */}
          <div className="md:col-span-3">
            <Card>
              <CardHeader>
                <CardTitle className="text-2xl">确认订单</CardTitle>
                <CardDescription>
                  你正在订阅 {detail.name} 套餐
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* 价格摘要 */}
                <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg p-4 border">
                  <div className="flex justify-between items-center">
                    <div>
                      <span className="font-semibold">{detail.name}</span>
                      {plan === "pro" && <Badge className="ml-2 bg-purple-600 text-white text-xs">最受欢迎</Badge>}
                    </div>
                    <div className="text-right">
                      <span className="text-3xl font-bold">¥{finalPrice}</span>
                      <span className="text-sm text-muted-foreground">
                        /{billing === "annual" ? "年" : "月"}
                      </span>
                      {billing === "annual" && (
                        <div className="text-xs text-green-600 font-medium">
                          省 ¥{detail.price * 12 - detail.priceAnnual}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* 功能列表 */}
                <div>
                  <h3 className="font-semibold mb-3">包含功能</h3>
                  <ul className="space-y-2">
                    {detail.features.map((f, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm">
                        <Check className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                        {f}
                      </li>
                    ))}
                  </ul>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* 支付面板 */}
          <div className="md:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">支付方式</CardTitle>
                <CardDescription>选择支付方式完成订阅</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {error && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2 text-sm text-red-700">
                    <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                    {error}
                  </div>
                )}

                {/* Stripe 支付按钮 */}
                <Button
                  className="w-full"
                  size="lg"
                  onClick={handlePayment}
                  disabled={processing}
                >
                  {processing ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      处理中...
                    </>
                  ) : (
                    `💳 信用卡支付 ¥${finalPrice}`
                  )}
                </Button>

                {/* 演示模式（开发环境） */}
                {!process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY && (
                  <>
                    <div className="relative">
                      <div className="absolute inset-0 flex items-center">
                        <span className="w-full border-t" />
                      </div>
                      <div className="relative flex justify-center text-xs">
                        <span className="bg-background px-2 text-muted-foreground">
                          开发模式
                        </span>
                      </div>
                    </div>

                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={handleLocalPay}
                      disabled={processing}
                    >
                      模拟支付成功（开发环境）
                    </Button>
                  </>
                )}

                <div className="bg-muted/50 rounded-lg p-3 text-xs text-muted-foreground space-y-1">
                  <p>🔒 安全加密支付</p>
                  <p>💳 支持 Visa / Mastercard / 支付宝 / 微信支付</p>
                  <p>🔄 随时取消，无隐藏费用</p>
                </div>
              </CardContent>
            </Card>

            {/* 担保 */}
            <div className="mt-4 text-center">
              <p className="text-xs text-muted-foreground">
                14 天无理由退款。如有疑问，请联系 support@workflowguard.cn
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    }>
      <CheckoutContent />

      {/* Mobile Bottom Tab Navigation */}
      <MobileNav />
    </Suspense>
  )
}
