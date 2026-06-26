// WorkflowGuard — 性能指标 API
// 返回核心 Web Vitals 指标（FCP / LCP / CLS / INP / TTFB）
// 优先从 Supabase analytics 表聚合，若无数据则返回模拟数据用于演示

import { NextResponse } from "next/server"

// 模拟数据（演示用）
function getMockPerformanceMetrics(): Record<string, any> {
  const now = Date.now()
  const oneHourAgo = now - 3600_000

  return {
    summary: {
      fcp: {
        metric: "First Contentful Paint",
        value: 1.2,
        unit: "s",
        rating: "good",
        threshold: 1.8,
      },
      lcp: {
        metric: "Largest Contentful Paint",
        value: 2.4,
        unit: "s",
        rating: "needs_improvement",
        threshold: 2.5,
      },
      cls: {
        metric: "Cumulative Layout Shift",
        value: 0.05,
        unit: "",
        rating: "good",
        threshold: 0.1,
      },
      inp: {
        metric: "Interaction to Next Paint",
        value: 120,
        unit: "ms",
        rating: "good",
        threshold: 200,
      },
      ttfb: {
        metric: "Time to First Byte",
        value: 0.35,
        unit: "s",
        rating: "good",
        threshold: 0.8,
      },
    },
    trends: [
      { time: "0h", fcp: 1.3, lcp: 2.6, cls: 0.06, inp: 130, ttfb: 0.38 },
      { time: "-1h", fcp: 1.2, lcp: 2.5, cls: 0.05, inp: 125, ttfb: 0.36 },
      { time: "-2h", fcp: 1.1, lcp: 2.3, cls: 0.04, inp: 115, ttfb: 0.33 },
      { time: "-3h", fcp: 1.4, lcp: 2.8, cls: 0.07, inp: 140, ttfb: 0.42 },
      { time: "-4h", fcp: 1.2, lcp: 2.4, cls: 0.05, inp: 120, ttfb: 0.35 },
      { time: "-5h", fcp: 1.0, lcp: 2.1, cls: 0.03, inp: 105, ttfb: 0.30 },
      { time: "-6h", fcp: 1.3, lcp: 2.5, cls: 0.06, inp: 135, ttfb: 0.40 },
      { time: "-7h", fcp: 1.1, lcp: 2.2, cls: 0.04, inp: 110, ttfb: 0.32 },
      { time: "-8h", fcp: 1.2, lcp: 2.4, cls: 0.05, inp: 118, ttfb: 0.34 },
      { time: "-9h", fcp: 1.4, lcp: 2.7, cls: 0.08, inp: 145, ttfb: 0.45 },
      { time: "-10h", fcp: 1.1, lcp: 2.3, cls: 0.04, inp: 112, ttfb: 0.31 },
      { time: "-11h", fcp: 1.0, lcp: 2.0, cls: 0.03, inp: 100, ttfb: 0.28 },
      { time: "-12h", fcp: 1.3, lcp: 2.6, cls: 0.06, inp: 132, ttfb: 0.39 },
    ],
    pageBreakdown: [
      { path: "/", fcp: 0.9, lcp: 1.8, cls: 0.02, inp: 95, ttfb: 0.25, sessions: 120 },
      { path: "/dashboard", fcp: 1.1, lcp: 2.2, cls: 0.04, inp: 110, ttfb: 0.30, sessions: 85 },
      { path: "/workflows/list", fcp: 1.3, lcp: 2.8, cls: 0.07, inp: 140, ttfb: 0.38, sessions: 42 },
      { path: "/tasks", fcp: 1.0, lcp: 2.0, cls: 0.03, inp: 100, ttfb: 0.27, sessions: 63 },
      { path: "/templates", fcp: 1.2, lcp: 2.5, cls: 0.05, inp: 125, ttfb: 0.33, sessions: 30 },
      { path: "/pricing", fcp: 0.8, lcp: 1.6, cls: 0.02, inp: 85, ttfb: 0.22, sessions: 48 },
    ],
    deviceBreakdown: {
      mobile: { fcp: 1.5, lcp: 3.1, cls: 0.08, inp: 160, ttfb: 0.45, share: 0.42 },
      desktop: { fcp: 1.0, lcp: 2.0, cls: 0.04, inp: 100, ttfb: 0.28, share: 0.58 },
    },
    generatedAt: new Date().toISOString(),
  }
}

export async function GET() {
  try {
    // TODO: 接入 Supabase analytics 表聚合真实 Web Vitals 数据
    // 当前返回模拟数据用于演示
    const metrics = getMockPerformanceMetrics()

    return NextResponse.json(metrics)
  } catch (err) {
    console.error("[Performance Metrics API Error]", err)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
