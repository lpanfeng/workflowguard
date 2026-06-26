"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  CheckCircle2,
  Workflow,
  Sparkles,
  ClipboardCheck,
  ArrowRight,
  ArrowLeft,
  Loader2,
  Rocket,
} from "lucide-react"
import { supabase } from "@/lib/supabase"
import { MobileNav } from "@/components/MobileNav"
import Link from "next/link"

type OnboardingStep = {
  id: number
  title: string
  description: string
  icon: React.ReactNode
  content: React.ReactNode
  action: {
    label: string
    href?: string
    onClick?: () => void
  }
}

export default function OnboardingPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(0)
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set())
  const [isCompleting, setIsCompleting] = useState(false)

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/login")
    }
  }, [status, router])

  const markStepDone = (step: number) => {
    setCompletedSteps((prev) => new Set(prev).add(step))
    if (step < steps.length - 1) {
      setCurrentStep(step + 1)
    }
  }

  const completeOnboarding = async () => {
    setIsCompleting(true)
    try {
      if (session?.user?.id) {
        // 用 Supabase 更新 profiles 表的 has_onboarded 标记
        await supabase
          .from("profiles")
          .update({ has_onboarded: true })
          .eq("id", session.user.id)
      }
      // Redirect to dashboard
      router.push("/dashboard?onboarded=true")
    } catch {
      router.push("/dashboard?onboarded=true")
    }
  }

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!session?.user) return null

  const steps: OnboardingStep[] = [
    {
      id: 1,
      title: "了解 WorkflowGuard",
      description: "30 秒了解你的 AI 人机协作工作台",
      icon: <Rocket className="h-10 w-10 text-blue-500" />,
      content: (
        <div className="space-y-4">
          <div className="rounded-lg bg-blue-50 dark:bg-blue-950/30 p-4 border border-blue-200 dark:border-blue-800">
            <h3 className="font-semibold text-blue-800 dark:text-blue-300 mb-2">🎯 核心价值</h3>
            <p className="text-sm text-blue-700 dark:text-blue-400">
              WorkflowGuard 让 AI 替你干活，关键决策交给你审批。
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="rounded-lg border p-3 text-center">
              <p className="text-2xl mb-1">🤖</p>
              <p className="text-sm font-semibold">AI 执行</p>
              <p className="text-xs text-muted-foreground">Agent 自动完成工作</p>
            </div>
            <div className="rounded-lg border p-3 text-center">
              <p className="text-2xl mb-1">👤</p>
              <p className="text-sm font-semibold">人工审批</p>
              <p className="text-xs text-muted-foreground">关键节点由你掌控</p>
            </div>
            <div className="rounded-lg border p-3 text-center">
              <p className="text-2xl mb-1">📋</p>
              <p className="text-sm font-semibold">全程审计</p>
              <p className="text-xs text-muted-foreground">每一步都可追溯</p>
            </div>
          </div>
          <div className="text-sm text-muted-foreground mt-2">
            <p>🎧 <strong>客服工单</strong>：AI 生成回复 → 你审批 → 自动发送</p>
            <p>📝 <strong>内容发布</strong>：AI 写初稿 → 你编辑 → 一键发布</p>
            <p>📊 <strong>数据录入</strong>：AI 提取数据 → 你确认 → 写入存储</p>
          </div>
        </div>
      ),
      action: {
        label: "我了解了，下一步 →",
        onClick: () => markStepDone(0),
      },
    },
    {
      id: 2,
      title: "创建你的第一个工作流",
      description: "选择一个模板，30 秒内完成配置",
      icon: <Workflow className="h-10 w-10 text-blue-500" />,
      content: (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            选择一个预设模板开始。每个模板都包含 AI 执行 + 人工审批 + 通知的完整流程。
          </p>
          <div className="grid grid-cols-1 gap-3">
            <Link
              href="/workflows/new?template=customer-service"
              className="block border rounded-lg p-4 hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <span className="text-3xl">🎧</span>
                <div>
                  <h3 className="font-semibold">客服工单审批流</h3>
                  <p className="text-xs text-muted-foreground">
                    AI 自动分析客户咨询，生成回复建议 → 你审批通过后自动发送
                  </p>
                  <Badge variant="secondary" className="mt-1 text-xs">
                    推荐首次使用
                  </Badge>
                </div>
              </div>
            </Link>
            <Link
              href="/workflows/new?template=content-publish"
              className="block border rounded-lg p-4 hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <span className="text-3xl">📝</span>
                <div>
                  <h3 className="font-semibold">内容发布审批流</h3>
                  <p className="text-xs text-muted-foreground">
                    AI 生成文章草稿 → 你在线编辑审批 → 完成
                  </p>
                </div>
              </div>
            </Link>
            <Link
              href="/workflows/new?template=data-entry"
              className="block border rounded-lg p-4 hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <span className="text-3xl">📊</span>
                <div>
                  <h3 className="font-semibold">数据录入审批流</h3>
                  <p className="text-xs text-muted-foreground">
                    AI 从文档中提取结构化数据 → 你逐项确认 → 写入数据库
                  </p>
                </div>
              </div>
            </Link>
          </div>
        </div>
      ),
      action: {
        label: "去创建一个工作流",
        href: "/workflows/new?template=customer-service",
      },
    },
    {
      id: 3,
      title: "审批你的第一个任务",
      description: "AI 执行后，你来做最终决策",
      icon: <ClipboardCheck className="h-10 w-10 text-green-500" />,
      content: (
        <div className="space-y-4">
          <div className="rounded-lg bg-amber-50 dark:bg-amber-950/30 p-4 border border-amber-200 dark:border-amber-800">
            <h3 className="font-semibold text-amber-800 dark:text-amber-300 mb-2">⚡ 核心原则</h3>
            <p className="text-sm text-amber-700 dark:text-amber-400">
              AI 只建议，你来做决定。
            </p>
          </div>
          <div className="space-y-2">
            <div className="flex items-start gap-3 p-3 rounded-lg border">
              <span className="text-lg">1️⃣</span>
              <div>
                <p className="text-sm font-semibold">AI 自动执行</p>
                <p className="text-xs text-muted-foreground">
                  AI 根据你的输入自动处理，生成结果草案
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 rounded-lg border">
              <span className="text-lg">2️⃣</span>
              <div>
                <p className="text-sm font-semibold">等待你的审批</p>
                <p className="text-xs text-muted-foreground">
                  系统通知你有任务需审批，查看 AI 生成的内容
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 rounded-lg border">
              <span className="text-lg">3️⃣</span>
              <div>
                <p className="text-sm font-semibold">通过或驳回</p>
                <p className="text-xs text-muted-foreground">
                  如果满意 → 点通过，AI 结果生效。不满意 → 驳回，系统终止。
                </p>
              </div>
            </div>
          </div>
          <Link href="/tasks">
            <Button variant="outline" className="w-full">
              去看看待审批的任务 →
            </Button>
          </Link>
        </div>
      ),
      action: {
        label: "我明白了，开始使用！",
        onClick: () => markStepDone(2),
      },
    },
  ]

  const step = steps[currentStep]
  if (!step) {
    router.push("/dashboard?onboarded=true")
    return null
  }

  const isLastStep = currentStep === steps.length - 1
  const allDone = completedSteps.size === steps.length

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-950 dark:to-blue-950 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-100 dark:bg-blue-900 mb-4">
            <Rocket className="h-8 w-8 text-blue-600 dark:text-blue-400" />
          </div>
          <h1 className="text-3xl font-bold">欢迎使用 WorkflowGuard 🎉</h1>
          <p className="text-muted-foreground mt-2">
            跟着 3 步快速上手，5 分钟后就能用上你的第一个工作流
          </p>
        </div>

        {/* Progress */}
        <div className="flex items-center justify-center gap-2 mb-6">
          {steps.map((s, i) => (
            <div key={s.id} className="flex items-center gap-2">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-colors ${
                  completedSteps.has(i) || currentStep === i
                    ? "bg-blue-600 text-white"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {completedSteps.has(i) ? "✓" : s.id}
              </div>
              {i < steps.length - 1 && (
                <div
                  className={`w-12 h-1 rounded transition-colors ${
                    completedSteps.has(i) ? "bg-blue-600" : "bg-muted"
                  }`}
                />
              )}
            </div>
          ))}
        </div>

        {/* Step Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              {step.icon}
              <div>
                <CardTitle>{step.title}</CardTitle>
                <CardDescription>{step.description}</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {step.content}
          </CardContent>
        </Card>

        {/* Navigation */}
        <div className="flex items-center justify-between mt-6">
          <div>
            {currentStep > 0 && (
              <Button
                variant="ghost"
                onClick={() => setCurrentStep((p) => Math.max(0, p - 1))}
              >
                <ArrowLeft className="h-4 w-4 mr-1" />
                上一步
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => router.push("/dashboard?onboarded=true")}
            >
              跳过引导
            </Button>
            {step.action.href ? (
              <Link href={step.action.href}>
                <Button>
                  {step.action.label}
                  <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              </Link>
            ) : allDone ? (
              <Button onClick={completeOnboarding} disabled={isCompleting}>
                {isCompleting ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-1" />
                ) : null}
                {isCompleting ? "跳转中..." : "🚀 开始使用 WorkflowGuard"}
              </Button>
            ) : (
              <Button onClick={step.action.onClick}>
                {step.action.label}
              </Button>
            )}
          </div>
        </div>

        {/* Footer hint */}
        <p className="text-center text-xs text-muted-foreground mt-8">
          WorkflowGuard v0.1 · 人机协作工作流平台 · 你的数据安全可控
        </p>

        {/* Mobile Bottom Tab Navigation */}
        <MobileNav />
      </div>
    </div>
  )
}
