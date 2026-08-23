"use client"

import { useEffect } from "react"

// 简化的 GA4 集成 — 使用 gtag
declare global {
  interface Window {
    gtag: (...args: any[]) => void
    dataLayer: any[]
  }
}

export function Analytics() {
  useEffect(() => {
    // 这里可以接入真实的 GA4 Measurement ID
    // const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID
    if (typeof window !== "undefined") {
      // 模拟页面访问记录
      window.gtag?.("config", "G-XXXXXXXXXX", {
        page_path: window.location.pathname,
      })
    }
  }, [])

  return null
}
