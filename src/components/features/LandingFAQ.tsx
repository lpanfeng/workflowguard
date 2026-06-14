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
    a: "免费版包含：2 个活跃工作流、每月 100 次 AI 调用、20 次审批额度。对于个人用户或小团队完全够用。如果需要更多额度或团队功能，可以升级到专业版。",
  },
  {
    q: "WorkflowGuard 和飞书/钉钉审批有什么区别？",
    a: "飞书/钉钉的审批主要解决的是人→人的审批流程。WorkflowGuard 的核心区别在于：我们解决了人→AI→人的审批流程。AI 生成方案或执行任务，关键节点由人审批，全程可审计。这是传统 OA 系统做不到的。",
  },
  {
    q: "WorkflowGuard 支持哪些 AI 模型？",
    a: "目前已支持 DeepSeek（默认，性价比最高）、OpenAI GPT-4、Claude。你可以在设置中自由切换模型，也可以自定义 prompt 模板来满足特定业务需求。",
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
