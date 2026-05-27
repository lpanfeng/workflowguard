// WorkflowGuard — Stripe Checkout Session 创建 API
// POST /api/checkout/create-session

import { NextRequest, NextResponse } from "next/server"

// Stripe 价格 ID（需在 Stripe Dashboard 创建产品后配置）
const PRICE_IDS: Record<string, string> = {
  basic: process.env.STRIPE_PRICE_BASIC || "",
  pro: process.env.STRIPE_PRICE_PRO || "",
  team: process.env.STRIPE_PRICE_TEAM || "",
}

// 国内备选方案：如果 Stripe 未配置，使用 Paddle
const USE_PADDLE = process.env.PADDLE_VENDOR_ID ? true : false

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { plan, userId, email } = body

    if (!plan || !userId) {
      return NextResponse.json({ error: "缺少必填字段: plan, userId" }, { status: 400 })
    }

    if (!["basic", "pro", "team"].includes(plan)) {
      return NextResponse.json({ error: "无效套餐: 可选 basic/pro/team" }, { status: 400 })
    }

    // Stripe 支付流程
    if (!USE_PADDLE) {
      if (!process.env.STRIPE_SECRET_KEY) {
        return NextResponse.json({
          success: true,
          mode: "redirect",
          url: `/pricing/checkout?plan=${plan}&userId=${userId}&email=${email || ""}`,
          message: "Stripe 未配置，跳转到本地支付确认页面",
        })
      }

      const stripeKey = process.env.STRIPE_SECRET_KEY!

      // 动态导入 Stripe
      const Stripe = (await import("stripe")).default
      const stripe = new Stripe(stripeKey)

      const priceId = PRICE_IDS[plan]
      if (!priceId) {
        return NextResponse.json({
          success: true,
          mode: "redirect",
          url: `/pricing/checkout?plan=${plan}&userId=${userId}`,
          message: "价格 ID 未配置，跳转到本地支付确认",
        })
      }

      const session = await stripe.checkout.sessions.create({
        mode: "subscription",
        payment_method_types: ["card"],
        line_items: [{ price: priceId, quantity: 1 }],
        customer_email: email || undefined,
        client_reference_id: userId,
        success_url: `${request.headers.get("origin") || "https://workflowguard.cn"}/pricing/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${request.headers.get("origin") || "https://workflowguard.cn"}/pricing`,
        metadata: { userId, plan },
      })

      return NextResponse.json({ success: true, mode: "stripe", url: session.url })
    }

    // Paddle 支付流程（对国内用户更友好，支持支付宝/微信）
    if (!process.env.PADDLE_API_KEY || !process.env.PADDLE_PRICE_PREFIX) {
      return NextResponse.json({
        success: true,
        mode: "redirect",
        url: `/pricing/checkout?plan=${plan}&userId=${userId}`,
        message: "支付尚未配置，跳转到演示确认页面",
      })
    }

    // Paddle Billing API (v2)
    const items: Record<string, { priceId: string }> = {
      basic: { priceId: `${process.env.PADDLE_PRICE_PREFIX}_basic` },
      pro: { priceId: `${process.env.PADDLE_PRICE_PREFIX}_pro` },
      team: { priceId: `${process.env.PADDLE_PRICE_PREFIX}_team` },
    }

    const paddleRes = await fetch("https://vendors.paddle.com/api/2.0/subscription/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        vendor_id: Number(process.env.PADDLE_VENDOR_ID),
        vendor_auth_code: process.env.PADDLE_API_KEY,
        subscription: {
          plan_id: items[plan]?.priceId || "",
          currency: "CNY",
          user_id: userId,
        },
      }),
    })

    const paddleData = await paddleRes.json()

    if (!paddleData.success) {
      return NextResponse.json({ error: "Paddle 订阅创建失败" }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      mode: "paddle",
      checkoutUrl: paddleData.response?.url,
    })
  } catch (err) {
    console.error("创建结算会话失败:", err)
    return NextResponse.json({ error: "创建结算会话失败" }, { status: 500 })
  }
}

export const dynamic = "force-dynamic"
