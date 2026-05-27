// WorkflowGuard — Stripe Webhook 处理
// POST /api/webhooks/stripe

import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

// 套餐映射：Stripe/Paddle 价格 → WorkflowGuard plan
const PLAN_LIMITS: Record<string, { plan: string; workflows: number; approvals: number }> = {
  basic: { plan: "basic", workflows: 10, approvals: 300 },
  pro: { plan: "pro", workflows: 50, approvals: 2000 },
  team: { plan: "team", workflows: 200, approvals: 10000 },
}

async function handleCheckoutCompleted(session: any) {
  const userId = session.client_reference_id || session.metadata?.userId
  const plan = session.metadata?.plan || "basic"

  if (!userId) {
    console.error("[Stripe Webhook] 缺少 userId")
    return
  }

  const limits = PLAN_LIMITS[plan] || PLAN_LIMITS.basic

  // 更新用户的套餐和配额
  const { error } = await supabaseAdmin
    .from("profiles")
    .update({
      plan: limits.plan,
      workflow_quota: limits.workflows,
      approval_quota: limits.approvals,
      approval_used: 0,
      // 重置日期设为下个月
      reset_date: new Date(
        new Date().getFullYear(),
        new Date().getMonth() + 1,
        1
      ).toISOString().slice(0, 10),
    })
    .eq("id", userId)

  if (error) {
    console.error("[Stripe Webhook] 更新用户套餐失败:", error)
    return
  }

  // 写入审计日志
  await supabaseAdmin.from("audit_logs").insert({
    user_id: userId,
    action: "user_plan_changed",
    details: {
      plan,
      workflows: limits.workflows,
      approvals: limits.approvals,
      source: "stripe_webhook",
      stripe_session_id: session.id,
    },
  })

  console.log(`[Stripe Webhook] 用户 ${userId} 套餐已更新为 ${plan}`)
}

async function handleSubscriptionUpdated(subscription: any) {
  const userId = subscription.metadata?.userId
  const status = subscription.status

  if (!userId) return

  // 如果订阅被取消或过期，降级到 free
  if (status === "canceled" || status === "unpaid" || status === "past_due") {
    await supabaseAdmin
      .from("profiles")
      .update({
        plan: "free",
        workflow_quota: 2,
        approval_quota: 100,
      })
      .eq("id", userId)

    await supabaseAdmin.from("audit_logs").insert({
      user_id: userId,
      action: "user_plan_changed",
      details: {
        plan: "free",
        reason: `subscription_${status}`,
      },
    })

    console.log(`[Stripe Webhook] 用户 ${userId} 订阅 ${status}，已降级为 free`)
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.text()
    const signature = request.headers.get("stripe-signature")

    // 如果 Stripe webhook secret 未配置，先记录并仍尝试处理
    if (process.env.STRIPE_WEBHOOK_SECRET && signature) {
      const Stripe = (await import("stripe")).default
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

      let event
      try {
        event = stripe.webhooks.constructEvent(
          body,
          signature,
          process.env.STRIPE_WEBHOOK_SECRET
        )
      } catch (err) {
        console.error("[Stripe Webhook] 签名验证失败:", err)
        return NextResponse.json({ error: "无效签名" }, { status: 400 })
      }

      const session = event.data.object

      switch (event.type) {
        case "checkout.session.completed":
          await handleCheckoutCompleted(session)
          break
        case "customer.subscription.updated":
          await handleSubscriptionUpdated(session)
          break
        case "customer.subscription.deleted":
          await handleSubscriptionUpdated({ ...session, status: "canceled" })
          break
      }
    } else {
      // 无 webhook secret：尝试直接解析（开发环境）
      try {
        const payload = JSON.parse(body)
        if (payload.type === "checkout.session.completed") {
          await handleCheckoutCompleted(payload.data?.object || payload)
        }
      } catch {
        console.warn("[Stripe Webhook] 无法解析事件，跳过")
      }
    }

    return NextResponse.json({ received: true })
  } catch (err) {
    console.error("[Stripe Webhook] 处理出错:", err)
    return NextResponse.json({ error: "处理失败" }, { status: 500 })
  }
}

export const dynamic = "force-dynamic"
