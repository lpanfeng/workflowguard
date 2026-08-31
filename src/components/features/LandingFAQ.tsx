"use client"

import { useState } from "react"
import { ChevronDown, ChevronUp } from "lucide-react"

const FAQ_ITEMS = [
  {
    q: "WorkflowGuard 安全吗？我的数据会被谁看到？",
    a: "WorkflowGuard 采用端到端加密，所有数据存储在 Supabase（基于 PostgreSQL）上，采用 Row Level Security (RLS) 确保你的数据只有授权用户才能访问。我们的代码是开源的，你可以自行审计。我们不会将你的数据用于任何训练或其他目的。",
  },
  {
    q: "我不会编程，能用 WorkflowGuard 吗？",
    a: "完全可以。WorkflowGuard 的预设模板开箱即用，选择模板 → 命名工作流 → 开始执行，三步搞定。整个流程不需要写一行代码。即使是第一次使用 AI 工具的用户，也能在 5 分钟内完成配置。",
  },
  {
    q: "免费版够用吗？有什么限制？",
    a: "免费版包含：2 个活跃工作流、每月 100 次 AI 调用、20 次审批额度。对于个人用户或小团队完全够用。如果需要更多额度或团队功能，可以升级到专业版。专业版按月/年订阅，支持无限工作流和更多 AI 调用。",
  },
  {
    q: "WorkflowGuard 和飞书/钉钉审批有什么区别？",
    a: "飞书/钉钉的审批主要解决的是人→人的审批流程。WorkflowGuard 的核心区别在于：我们解决了人→AI→人的审批流程。AI 生成方案或执行任务，关键节点由人审批，全程可审计。这是传统 OA 系统做不到的。",
  },
  {
    q: "WorkflowGuard 支持哪些 AI 模型？",
    a: "目前已支持 DeepSeek（默认，性价比最高）、OpenAI GPT-4、Claude。你可以在设置中自由切换模型，也可以自定义 prompt 模板来满足特定业务需求。",
  },
  {
    q: "WorkflowGuard 什么时候正式上线？",
    a: "目前处于 Beta 阶段，核心功能已完整可用。我们正在收集用户反馈进行优化。加入等待名单后，你会优先收到正式版通知和早期体验资格。",
  },
  {
    q: "可以集成到我的现有系统吗？",
    a: "WorkflowGuard 支持通过 API 与现有系统集成。目前已原生集成飞书（审批通知 + Bot 交互），后续计划支持钉钉、企业微信、Slack 等主流协作平台。",
  },
  {
    q: "数据可以导出吗？支持自定义报告吗？",
    a: "支持。所有工作流执行记录和审计日志都可以导出为 CSV 格式。专业版用户还可以自定义仪表盘视图和报告模板，满足特定业务的汇报需求。",
  },
]

export function LandingFAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(null)

  return (
    <div className="max-w-3xl mx-auto space-y-3">
      {FAQ_ITEMS.map((item, i) => (
        <div
          key={i}
          className="border rounded-xl overflow-hidden transition-shadow hover:shadow-md"
        >
          <button
            onClick={() => setOpenIndex(openIndex === i ? null : i)}
            className="w-full flex items-center justify-between p-5 text-left bg-white"
          >
            <span className="font-medium pr-4">{item.q}</span>
            {openIndex === i ? (
              <ChevronUp className="h-5 w-5 text-muted-foreground shrink-0" />
            ) : (
              <ChevronDown className="h-5 w-5 text-muted-foreground shrink-0" />
            )}
          </button>
          {openIndex === i && (
            <div className="p-5 pt-0 text-sm text-muted-foreground leading-relaxed border-t bg-muted/20">
              {item.a}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
