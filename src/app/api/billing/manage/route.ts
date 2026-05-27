// WorkflowGuard — 账单管理 API
// GET /api/billing/portal — 获取账单门户 URL（管理订阅、发票）
// POST /api/billing/manage — 取消订阅

import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get("userId")

    if (!userId) {
      return NextResponse.json({ error: "缺少 userId" }, { status: 400 })
    }

    // 获取用户当前套餐信息
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("id, plan, email, name")
      .eq("id", userId)
      .single()

    if (!profile) {
      return NextResponse.json({ error: "用户不存在" }, { status: 404 })
    }

    const planPrices: Record<string, { label: string; price: number }> = {
      free: { label: "免费版", price: 0 },
      basic: { label: "基础版", price: 99 },
      pro: { label: "专业版", price: 299 },
      team: { label: "团队版", price: 999 },
    }

    const planInfo = planPrices[profile.plan] || planPrices.free

    // Stripe 门户链接（如果配置了 Stripe）
    let portalUrl: string | null = null
    if (process.env.STRIPE_SECRET_KEY) {
      const Stripe = (await import("stripe")).default
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

      // 查找用户的 Stripe customer
      const customers = await stripe.customers.list({
        email: profile.email,
        limit: 1,
      })

      if (customers.data.length > 0) {
        const portalSession = await stripe.billingPortal.sessions.create({
          customer: customers.data[0].id,
          return_url: `${request.headers.get("origin") || "https://workflowguard.cn"}/settings`,
        })
        portalUrl = portalSession.url
      }
    }

    return NextResponse.json({
      success: true,
      plan: profile.plan,
      planLabel: planInfo.label,
      price: planInfo.price,
      currency: "CNY",
      billingCycle: "monthly",
      portalUrl,
      // 支持的套餐列表
      plans: [
        { id: "free", label: "免费版", price: 0, workflows: 2, approvals: 100 },
        { id: "basic", label: "基础版", price: 99, workflows: 10, approvals: 300 },
        { id: "pro", label: "专业版", price: 299, workflows: 50, approvals: 2000 },
        { id: "team", label: "团队版", price: 999, workflows: 200, approvals: 10000 },
      ],
    })
  } catch (err) {
    console.error("获取账单信息失败:", err)
    return NextResponse.json({ error: "获取账单信息失败" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  // 取消订阅
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get("userId")

    if (!userId) {
      return NextResponse.json({ error: "缺少 userId" }, { status: 400 })
    }

    if (!process.env.STRIPE_SECRET_KEY) {
      // 无 Stripe，直接降级
      const { error } = await supabaseAdmin
        .from("profiles")
        .update({
          plan: "free",
          workflow_quota: 2,
          approval_quota: 100,
          approval_used: 0,
        })
        .eq("id", userId)

      if (error) throw error

      return NextResponse.json({
        success: true,
        message: "已取消订阅并降级到免费版",
      })
    }

    // Stripe 场景：取消订阅
    const Stripe = (await import("stripe")).default
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("email")
      .eq("id", userId)
      .single()

    if (profile?.email) {
      const customers = await stripe.customers.list({ email: profile.email, limit: 1 })
      if (customers.data.length > 0) {
        const subscriptions = await stripe.subscriptions.list({
          customer: customers.data[0].id,
          limit: 1,
        })
        if (subscriptions.data.length > 0) {
          await stripe.subscriptions.cancel(subscriptions.data[0].id)
        }
      }
    }

    // 降级
    await supabaseAdmin
      .from("profiles")
      .update({
        plan: "free",
        workflow_quota: 2,
        approval_quota: 100,
        approval_used: 0,
      })
      .eq("id", userId)

    return NextResponse.json({
      success: true,
      message: "已取消订阅并降级到免费版",
    })
  } catch (err) {
    console.error("取消订阅失败:", err)
    return NextResponse.json({ error: "取消订阅失败" }, { status: 500 })
  }
}

export const dynamic = "force-dynamic"
