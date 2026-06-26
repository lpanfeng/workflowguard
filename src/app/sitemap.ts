import type { MetadataRoute } from "next"

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = "https://workflowguard.cn"

  return [
    // 核心页面
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${baseUrl}/pricing`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/dashboard`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.6,
    },
    {
      url: `${baseUrl}/tasks`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.5,
    },
    {
      url: `${baseUrl}/workflows/new`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.5,
    },
    {
      url: `${baseUrl}/audit-logs`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.3,
    },
    // 模板库
    {
      url: `${baseUrl}/templates`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.7,
    },
    {
      url: `${baseUrl}/templates/new`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.5,
    },
    // 工作流列表
    {
      url: `${baseUrl}/workflows/list`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.6,
    },
    // 指标面板
    {
      url: `${baseUrl}/metrics`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.5,
    },
    // 设置
    {
      url: `${baseUrl}/settings`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.4,
    },
    // 反馈
    {
      url: `${baseUrl}/feedback`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.4,
    },
    // 隐私政策
    {
      url: `${baseUrl}/privacy`,
      lastModified: new Date(),
      changeFrequency: "yearly",
      priority: 0.3,
    },
    // 服务条款
    {
      url: `${baseUrl}/terms`,
      lastModified: new Date(),
      changeFrequency: "yearly",
      priority: 0.3,
    },
    // 认证页面
    {
      url: `${baseUrl}/auth/login`,
      lastModified: new Date(),
      changeFrequency: "yearly",
      priority: 0.2,
    },
    {
      url: `${baseUrl}/auth/register`,
      lastModified: new Date(),
      changeFrequency: "yearly",
      priority: 0.2,
    },
    {
      url: `${baseUrl}/auth/reset`,
      lastModified: new Date(),
      changeFrequency: "yearly",
      priority: 0.2,
    },
    // 支付相关
    {
      url: `${baseUrl}/pricing/checkout`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.4,
    },
    {
      url: `${baseUrl}/pricing/success`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.3,
    },
    // Onboarding
    {
      url: `${baseUrl}/onboarding`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.5,
    },
  ]
}
