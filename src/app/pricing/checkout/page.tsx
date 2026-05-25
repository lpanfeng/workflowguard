"use client"

import { useSearchParams, useRouter } from "next/navigation"
import { Suspense, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"
import { Check, ArrowLeft, Loader2 } from "lucide-react"

function CheckoutContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const plan = searchParams.get("plan") || "basic"
  const billing = searchParams.get("billing") || "monthly"
  const [processing, setProcessing] = useState(false)

  const planDetails: Record<string, { name: string; price: number; features: string[] }> = {
    basic: {
      name: "Basic",
      price: billing === "annual" ? 290 : 29,
      features: ["5 个工作流", "每月 100 次审批", "500 次 AI 调用", "邮件+Webhook通知"],
    },
    pro: {
      name: "Pro",
      price: billing === "annual" ? 690 : 69,
      features: ["20 个工作流", "每月 500 次审批", "3000 次 AI 调用", "自定义模板", "多模型选择"],
    },
    team: {
      name: "Team",
      price: billing === "annual" ? 1990 : 199,
      features: ["无限工作流", "无限审批", "团队协作", "企业 SSO", "优先支持"],
    },
  }

  const detail = planDetails[plan]

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
    setProcessing(true)
    // TODO: 集成 Stripe/Paddle 支付
    // 目前展示占位信息
    await new Promise((r) => setTimeout(r, 1500))
    setProcessing(false)
    alert("支付系统正在集成中，敬请期待！")
  }

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="border-b bg-background">
        <div className="container mx-auto px-4 py-3">
          <Link href="/pricing" className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1">
            <ArrowLeft className="h-4 w-4" />
            返回定价
          </Link>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12 max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">确认订阅</CardTitle>
            <CardDescription>
              你正在选择 {detail.name} 套餐（{billing === "annual" ? "年付" : "月付"}）
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* 价格摘要 */}
            <div className="bg-muted/50 rounded-lg p-4">
              <div className="flex justify-between items-center">
                <span className="font-semibold">{detail.name} 套餐</span>
                <span className="text-2xl font-bold">
                  ¥{detail.price}
                  <span className="text-sm font-normal text-muted-foreground">
                    /{billing === "annual" ? "年" : "月"}
                  </span>
                </span>
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

            {/* 支付按钮 */}
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
                `支付 ¥${detail.price}`
              )}
            </Button>

            <p className="text-xs text-muted-foreground text-center">
              支付系统正在集成中，当前为占位页面。正式上线后将支持支付宝、微信支付。
            </p>
          </CardContent>
        </Card>
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
    </Suspense>
  )
}
