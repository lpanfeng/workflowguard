"use client"

import { Suspense, useEffect, useState } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { CheckCircle2, Loader2, ArrowRight } from "lucide-react"
import Link from "next/link"

function SuccessContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const sessionId = searchParams.get("session_id")
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading")

  useEffect(() => {
    if (!sessionId) {
      // 可能在开发环境，直接显示成功
      setTimeout(() => setStatus("success"), 1000)
      return
    }

    // Stripe 成功回调后，webhook 会自动更新配额
    // 这里只是给用户展示成功页
    const timer = setTimeout(() => setStatus("success"), 2000)
    return () => clearTimeout(timer)
  }, [sessionId])

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">正在确认支付结果...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 via-white to-green-50 flex items-center justify-center">
      <div className="text-center max-w-md mx-auto px-4">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle2 className="h-10 w-10 text-green-600" />
        </div>
        <h1 className="text-3xl font-bold mb-3">🎉 支付成功！</h1>
        <p className="text-muted-foreground mb-2">
          感谢你的订阅！你的套餐已立即生效，所有高级功能现已可用。
        </p>
        <p className="text-sm text-muted-foreground mb-8">
          订单号：{sessionId ? sessionId.slice(0, 16) : "DEV-" + Date.now().toString(36).toUpperCase()}
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/dashboard">
            <Button size="lg">
              进入控制台
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </Link>
          <Link href="/settings">
            <Button variant="outline" size="lg">
              查看套餐详情
            </Button>
          </Link>
        </div>
        <div className="mt-8 p-4 bg-blue-50 rounded-lg text-sm text-left">
          <p className="font-medium text-blue-800 mb-1">💡 下一步</p>
          <ul className="text-blue-700 space-y-1 text-xs">
            <li>1. 创建工作流：选择 AI 审批模板，配置你的第一个自动化流程</li>
            <li>2. 创建任务：提交任务让 AI 自动处理</li>
            <li>3. 配置通知：在设置中配置飞书 Webhook，实时接收审批通知</li>
          </ul>
        </div>
      </div>
    </div>
  )
}

export default function SuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    }>
      <SuccessContent />
    </Suspense>
  )
}
