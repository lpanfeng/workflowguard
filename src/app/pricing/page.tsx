"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Check, X, Loader2, ArrowRight, Sparkles, Zap, Building2 } from "lucide-react"
import { supabase } from "@/lib/supabase"
import type { PlanLimit } from "@/lib/database.types"

const PLAN_ICONS: Record<string, React.ReactNode> = {
  free: <Sparkles className="h-5 w-5" />,
  basic: <Zap className="h-5 w-5" />,
  pro: <Sparkles className="h-5 w-5" />,
  team: <Building2 className="h-5 w-5" />,
}

const PLAN_ACCENT: Record<string, string> = {
  free: "border-slate-200",
  basic: "border-blue-300",
  pro: "border-purple-400 ring-2 ring-purple-200",
  team: "border-slate-900",
}

const PLAN_BG_ACCENT: Record<string, string> = {
  free: "from-slate-50 to-white",
  basic: "from-blue-50 to-white",
  pro: "from-purple-50 to-white",
  team: "from-slate-100 to-white",
}

const PLAN_BADGE: Record<string, string | null> = {
  free: null,
  basic: null,
  pro: "最受欢迎",
  team: "企业方案",
}

export default function PricingPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [planLimits, setPlanLimits] = useState<PlanLimit[]>([])
  const [currentPlan, setCurrentPlan] = useState<string | null>(null)
  const [usage, setUsage] = useState<{ workflows: number; approvals: number } | null>(null)
  const [loading, setLoading] = useState(true)
  const [annual, setAnnual] = useState(false)

  useEffect(() => {
    loadData()
  }, [session])

  const loadData = async () => {
    setLoading(true)
    try {
      // 获取套餐配置
      const { data: plans } = await supabase
        .from("plan_limits")
        .select("*")
        .order("price_monthly", { ascending: true })

      if (plans) setPlanLimits(plans)

      // 获取用户当前套餐和使用量
      if (session?.user?.id) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("plan, approval_used")
          .eq("id", session.user.id)
          .single()

        if (profile) {
          setCurrentPlan(profile.plan)

          // 获取工作流数量
          const { count: wfCount } = await supabase
            .from("workflows")
            .select("*", { count: "exact", head: true })
            .eq("user_id", session.user.id)

          setUsage({
            workflows: wfCount ?? 0,
            approvals: profile.approval_used ?? 0,
          })
        }
      }
    } catch (err) {
      console.error("加载套餐数据失败:", err)
    } finally {
      setLoading(false)
    }
  }

  const getPlanDisplay = (plan: PlanLimit) => {
    const features: { text: string; included: boolean }[] = [
      { text: `${plan.max_workflows} 个工作流`, included: plan.max_workflows > 0 },
      { text: `每月 ${plan.max_approvals} 次审批`, included: plan.max_approvals > 0 },
      { text: `每月 ${plan.max_ai_calls} 次 AI 调用`, included: plan.max_ai_calls > 0 },
      { text: "3 个预设工作流模板", included: true },
      { text: "基础审计日志", included: plan.price_monthly < 6900 || true },
      { text: "自定义工作流模板", included: plan.price_monthly >= 6900 },
      { text: "多模型选择 (OpenAI/Claude)", included: plan.price_monthly >= 6900 },
      { text: "团队协作", included: plan.price_monthly >= 19900 },
      { text: "企业 SSO", included: plan.price_monthly >= 19900 },
      { text: "优先支持", included: plan.price_monthly >= 19900 },
    ]

    // 合并数据库 features 中的自定义功能
    if (plan.features) {
      plan.features.forEach((f) => {
        if (!features.some((fe) => fe.text === f)) {
          features.push({ text: f, included: true })
        }
      })
    }

    return features
  }

  const formatPrice = (cents: number) => {
    const monthly = cents / 100
    if (monthly === 0) return "免费"
    if (annual) {
      const yearly = monthly * 10 // 2 months free
      return `¥${yearly.toLocaleString()}`
    }
    return `¥${monthly.toLocaleString()}`
  }

  const formatPeriod = (cents: number) => {
    if (cents === 0) return ""
    return annual ? "/年" : "/月"
  }

  const isCurrentPlan = (planName: string) => {
    return currentPlan === planName
  }

  const handleSelectPlan = async (planName: string) => {
    if (!session?.user) {
      router.push("/auth/login")
      return
    }

    if (planName === "free") {
      // Free plan - no payment needed
      router.push("/dashboard")
      return
    }

    // 付费计划 — 跳转到支付页面（占位）
    router.push(`/pricing/checkout?plan=${planName}&billing=${annual ? "annual" : "monthly"}`)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  // 获取当前套餐的计划详情用于使用量展示
  const currentPlanLimit = planLimits.find(p => p.plan === currentPlan)

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      {/* Navigation */}
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/" className="text-xl font-bold">
            WorkflowGuard
          </Link>
          <div className="flex items-center gap-3">
            {session?.user ? (
              <Link href="/dashboard">
                <Button variant="ghost" size="sm">进入控制台</Button>
              </Link>
            ) : (
              <>
                <Link href="/auth/login">
                  <Button variant="ghost" size="sm">登录</Button>
                </Link>
                <Link href="/auth/register">
                  <Button size="sm">免费注册</Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-16">
        {/* Hero */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">
            简单透明的定价
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            从免费开始，随着你的需求增长灵活升级。所有套餐均包含 14 天免费试用。
          </p>

          {/* Current usage summary - logged in users */}
          {session?.user && currentPlan && currentPlanLimit && usage && (
            <div className="max-w-3xl mx-auto mt-8 p-4 bg-white rounded-xl border shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-sm px-3 py-1">
                    当前套餐: {PLAN_ICONS[currentPlan]} {currentPlan.toUpperCase()}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  {currentPlanLimit.max_workflows} 个工作流 · {currentPlanLimit.max_approvals} 次审批
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="text-muted-foreground">工作流使用量</span>
                    <span className="font-medium">{usage.workflows}/{currentPlanLimit.max_workflows}</span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-500 rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(100, (usage.workflows / currentPlanLimit.max_workflows) * 100)}%` }}
                    />
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="text-muted-foreground">审批使用量</span>
                    <span className="font-medium">{usage.approvals}/{currentPlanLimit.max_approvals}</span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        usage.approvals >= currentPlanLimit.max_approvals ? "bg-amber-500" : "bg-green-500"
                      }`}
                      style={{ width: `${Math.min(100, (usage.approvals / currentPlanLimit.max_approvals) * 100)}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Billing toggle */}
          <div className="flex items-center justify-center gap-3 mt-6">
            <span className={`text-sm ${!annual ? "font-semibold" : "text-muted-foreground"}`}>
              月付
            </span>
            <button
              onClick={() => setAnnual(!annual)}
              className={`relative w-12 h-6 rounded-full transition-colors ${
                annual ? "bg-purple-600" : "bg-slate-300"
              }`}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                  annual ? "translate-x-6" : "translate-x-0"
                }`}
              />
            </button>
            <span className={`text-sm ${annual ? "font-semibold" : "text-muted-foreground"}`}>
              年付
            </span>
            {annual && (
              <Badge variant="secondary" className="bg-green-100 text-green-700">
                省 2 个月
              </Badge>
            )}
          </div>
        </div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
          {planLimits.map((plan) => {
            const features = getPlanDisplay(plan)
            const isCurrent = isCurrentPlan(plan.plan)
            const badge = PLAN_BADGE[plan.plan]

            return (
              <Card
                key={plan.plan}
                className={`relative flex flex-col bg-gradient-to-b ${PLAN_BG_ACCENT[plan.plan]} ${PLAN_ACCENT[plan.plan]}`}
              >
                {badge && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge
                      className={
                        plan.plan === "pro"
                          ? "bg-purple-600 text-white"
                          : "bg-slate-900 text-white"
                      }
                    >
                      {badge}
                    </Badge>
                  </div>
                )}

                <CardHeader>
                  <div className="flex items-center gap-2 mb-2">
                    {PLAN_ICONS[plan.plan]}
                    <CardTitle className="capitalize">{plan.plan}</CardTitle>
                  </div>
                  <div className="mt-2">
                    <span className="text-3xl font-bold">
                      {formatPrice(plan.price_monthly)}
                    </span>
                    {formatPeriod(plan.price_monthly) && (
                      <span className="text-muted-foreground ml-1">
                        {formatPeriod(plan.price_monthly)}
                      </span>
                    )}
                  </div>
                  <CardDescription>
                    {plan.plan === "free" && "适合个人试用，体验人机协作工作流"}
                    {plan.plan === "basic" && "适合小团队，提升日常运营效率"}
                    {plan.plan === "pro" && "适合成长型团队，充分发挥 AI 潜力"}
                    {plan.plan === "team" && "适合企业，全面掌控 AI 工作流"}
                  </CardDescription>
                </CardHeader>

                <CardContent className="flex-1">
                  <ul className="space-y-3">
                    {features.map((feature, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm">
                        {feature.included ? (
                          <Check className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                        ) : (
                          <X className="h-4 w-4 text-slate-300 mt-0.5 shrink-0" />
                        )}
                        <span className={feature.included ? "" : "text-muted-foreground"}>
                          {feature.text}
                        </span>
                      </li>
                    ))}
                  </ul>
                </CardContent>

                <CardFooter>
                  {isCurrent ? (
                    <Button className="w-full" variant="outline" disabled>
                      当前套餐
                    </Button>
                  ) : plan.plan === "free" ? (
                    <Link href={session ? "/dashboard" : "/auth/register"} className="w-full">
                      <Button variant="outline" className="w-full">
                        开始免费使用
                        <ArrowRight className="h-4 w-4 ml-2" />
                      </Button>
                    </Link>
                  ) : (
                    <Button
                      className="w-full"
                      variant={plan.plan === "pro" ? "default" : "outline"}
                      onClick={() => handleSelectPlan(plan.plan)}
                    >
                      {session ? "升级方案" : "注册并升级"}
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                  )}
                </CardFooter>
              </Card>
            )
          })}
        </div>

        {/* FAQ Section */}
        <div className="max-w-3xl mx-auto mt-20">
          <h2 className="text-2xl font-bold text-center mb-8">常见问题</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <h3 className="font-semibold">免费套餐有什么限制？</h3>
              <p className="text-sm text-muted-foreground">
                免费套餐最多创建 2 个工作流，每月 20 次审批和 100 次 AI 调用。适合个人试用和体验。
              </p>
            </div>
            <div className="space-y-2">
              <h3 className="font-semibold">可以随时升级或降级吗？</h3>
              <p className="text-sm text-muted-foreground">
                是的。升级立即生效，按比例计费。降级将在当前计费周期结束后生效。
              </p>
            </div>
            <div className="space-y-2">
              <h3 className="font-semibold">14 天免费试用怎么算？</h3>
              <p className="text-sm text-muted-foreground">
                注册后自动激活 14 天 Pro 套餐试用，无限制使用所有功能。到期后自动降级为免费套餐。
              </p>
            </div>
            <div className="space-y-2">
              <h3 className="font-semibold">支持哪些支付方式？</h3>
              <p className="text-sm text-muted-foreground">
                支持支付宝、微信支付和银行卡。企业用户可申请对公转账和发票。
              </p>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="text-center mt-16 p-8 bg-gradient-to-r from-purple-50 to-blue-50 rounded-2xl">
          <h2 className="text-2xl font-bold mb-2">准备好开始了吗？</h2>
          <p className="text-muted-foreground mb-6">
            无需信用卡，免费注册即可开始使用。
          </p>
          <Link href={session ? "/dashboard" : "/auth/register"}>
            <Button size="lg" className="bg-purple-600 hover:bg-purple-700">
              免费开始使用
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </Link>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t mt-16 py-8">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>© 2026 WorkflowGuard. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}
