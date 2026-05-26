// WorkflowGuard — AI 执行引擎 API v3
// 接收任务 ID → 根据模板构建 prompt → 调用 LLM → 写入结果 → 状态流转
// 支持：DeepSeek API / 高质量模拟模式（3种模板各3种变体）

import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { getTemplateById } from "@/lib/workflow-templates"

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

// ====================
// 工具函数
// ====================

/** 延迟函数（用于重试间隔） */
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

/** 检测输入内容类型，用于精准匹配模拟模板 */
function detectContentType(inputData: Record<string, unknown>, templateId: string): string {
  const content = JSON.stringify(inputData).toLowerCase()
  
  if (templateId === "customer-service") {
    if (content.includes("退款") || content.includes("退货") || content.includes("refund")) return "refund"
    if (content.includes("投诉") || content.includes("complain") || content.includes("愤怒")) return "complaint"
    if (content.includes("咨询") || content.includes("价格") || content.includes("问题")) return "inquiry"
    return "general"
  }
  
  if (templateId === "content-publish") {
    if (content.includes("技术") || content.includes("tech") || content.includes("AI") || content.includes("代码")) return "tech"
    if (content.includes("营销") || content.includes("marketing") || content.includes("运营")) return "marketing"
    if (content.includes("产品") || content.includes("product") || content.includes("介绍")) return "product"
    return "general"
  }
  
  if (templateId === "data-entry") {
    if (content.includes("发票") || content.includes("receipt") || content.includes("金额")) return "invoice"
    if (content.includes("表单") || content.includes("form") || content.includes("注册")) return "form"
    return "general"
  }
  
  return "general"
}

/** 内容摘要工具 */
function summarizeContent(content: string, maxLen: number = 150): string {
  return content.length > maxLen ? content.slice(0, maxLen) + "..." : content
}

// ====================
// 高质量模拟数据
// ====================

const MOCK_RESPONSES = {
  customer_service: {
    general: {
      title: "客户咨询回复",
      body: `您好！感谢您的咨询。

我们已经仔细阅读了您的问题，并进行了初步分析。以下是我们为您准备的回复内容：

**问题确认**：
我们就您提到的内容，确认了以下几个关键点：
1. AI 已分析您输入的咨询内容
2. 已提取关键信息和需求
3. 生成了初步回复建议

**AI 生成回复**：
\`\`\`
您好，

感谢您的联系。针对您提到的情况，我们的团队已进行初步评估。

建议方案：
1. 我们已记录您的需求并进行分类
2. AI 分析显示这属于常规处理流程
3. 预计处理时间为 1-2 个工作日

如需进一步协助，请随时回复此消息。

此致
敬礼
\`\`\`

**需要人工确认的事项**：
- 回复的专业程度是否达标
- 是否有特定品牌调性需要调整
- 是否需要添加更具体的解决方案

> 置信度：中 | 生成模式：模拟`,
      confidence: "中" as const,
    },
    refund: {
      title: "退换货处理回复",
      body: `您好！已收到您的退换货请求。

**问题分类**：退换货/退款处理
**紧急程度**：中

**AI 建议处理方案**：
\`\`\`
您好，

关于您的退换货/退款申请，我们已启动处理流程。

处理步骤：
1. ✅ 已确认您的申请信息
2. ⏳ 正在核实购买记录（预计 2 小时）
3. ⏳ 退款审批中（需要人工确认）

请注意：
- 如符合退款政策，款项将在 3-5 个工作日内原路返回
- 退货运费由我们承担（请保留快递单号）

如需帮助，请随时联系我们。
\`\`\`

**需要人工审批的关键点**：
- 是否符合退款政策
- 退款金额确认
- 是否需要升级处理

> 置信度：高 | 生成模式：模拟 | 模板匹配：退换货`,
      confidence: "高" as const,
    },
    complaint: {
      title: "投诉处理回复",
      body: `您好！感谢您抽出时间向我们反馈问题。

我们非常重视您的投诉，并已将此案例标记为优先处理。

**投诉摘要**：
AI 已分析了您的投诉内容，提取了以下关键信息：

**AI 生成道歉及解决方案**：
\`\`\`
尊敬的客户，

首先，我们对您遇到的不愉快体验表示诚挚的歉意。这不符合我们的服务标准，我们对此深感抱歉。

我们已经采取以下措施：
1. 成立专项小组处理您的案例
2. 将在 24 小时内给出详细解决方案
3. 相关责任人将被追责

作为补偿，我们将为您提供：
- 专属客服一对一跟进
- 酌情提供补偿方案

我们承诺在本周内给您一个满意的答复。

此致
敬礼
客户服务团队
\`\`\`

**建议人工干预**：
- 投诉级别评估（普通/严重/重大）
- 补偿方案确认
- 是否需要升级到管理层处理

> 置信度：高 | 生成模式：模拟 | 注意：投诉类建议优先人工处理`,
      confidence: "高" as const,
    },
    inquiry: {
      title: "咨询回复",
      body: `您好！已收到您的咨询。

**咨询分类**：一般咨询
**AI 分析耗时**：2.3 秒

**AI 回复**：
\`\`\`
您好，

感谢您的咨询！关于您的问题，我们为您整理了以下信息：

核心回答：
✅ 您咨询的内容已由 AI 初步处理
✅ 相关信息已准备好

补充信息：
• 如需更详细的解答，请告知具体需求
• 您也可以访问帮助中心获取更多信息

如有其他问题，请随时提出！

祝好
\`\`\`

**人工确认项**：
- 回复是否完整回答了用户问题
- 是否需要引用具体条款或政策

> 置信度：中 | 生成模式：模拟`,
      confidence: "中" as const,
    },
  },
  content_publish: {
    general: {
      title: "高效人机协作：AI 时代的团队新范式",
      body: `## 文章草稿

**引言**

2026 年，AI 能力已经渗透到每个行业。但一个核心问题始终悬而未决：**AI 能自动化一切，然后呢？**

WorkflowGuard 的答案是：不是自动化一切，而是让 AI 做事，让人做决策。

### 什么是人机协作？

人机协作不是新鲜概念，但 AI 时代的协作有了全新的含义：

- **AI 负责执行** — 重复性、数据密集型任务由 AI 自动完成
- **人类负责审批** — 关键决策节点由人把控
- **全程可审计** — 每一步操作都有不可篡改的记录

### 为什么这是最优解？

**1. 信任是逐步建立的**
没有人会第一天就完全信任 AI。审批机制让用户可以逐步建立信任——先看 AI 做了什么，再决定是否放权。

**2. 避免 AI 幻觉的风险**
即使是 GPT-5 也会犯错。在关键业务环节引入人工审批，是防范 AI 风险的最佳实践。

**3. 合规要求**
许多行业（金融、医疗、法律）要求人必须参与决策流程。人机协作天然满足合规需求。

### 实践案例

通过 WorkflowGuard，团队可以：
1. **客服场景**：AI 处理 80% 的常规回复，人工审核关键工单
2. **内容场景**：AI 生成草稿，编辑审批发布
3. **数据场景**：AI 提取结构化数据，人工确认准确性

### 结语

未来不是 AI 替代人类，而是**知道何时让 AI 做，何时让人做**。

> 置信度：中 | 生成模式：模拟 | 字数：约 580 字`,
      confidence: "中" as const,
    },
    tech: {
      title: "AI Agent 架构设计：从 Prompt 到 Human-in-the-Loop",
      body: `## 技术文章草稿

**摘要**：本文深入分析 AI Agent 系统的架构演进，从简单的 Prompt 调用到完整的人机协作（Human-in-the-Loop）系统设计。

### 架构演进三阶段

**阶段一：Prompt Engineering**
最简单的 AI 集成方式——写 Prompt，调 API，拿结果。适合实验和原型验证。

**阶段二：Agent + Tool**
AI 不再只是回答问题，而是调用工具、执行动作。但缺乏安全机制和人工干预点。

**阶段三：Human-in-the-Loop**
AI 执行 + 人工审批 + 审计日志 = 可信任的 AI 系统。

### WorkflowGuard 的架构选择

我们选择了第三阶段，关键在于三个设计决策：

**1. 审批节点即安全阀门**
每个工作流都可以配置审批点。AI 生成结果后，必须人工确认才能进入下一步。

**2. 审计日志即信任基础**
每一步操作都写入不可篡改的审计日志，满足合规和追溯需求。

**3. 模板化降低使用门槛**
预设 3 个模板覆盖常见场景，用户无需从头搭建。

### 技术实现要点

~~~text
工作流 → 任务创建 → AI 执行 → 等待审批 → 完成/驳回
         ↑                          ↓
      审计日志 ←←←←←←←←←←←←←←←←←←
~~~

### 为什么这对开发者重要？

- **安全**：AI 不是黑盒，每步都可审查
- **可控**：关键决策由人掌控
- **可审计**：谁在什么时候做了什么，一目了然

> 置信度：高 | 生成模式：模拟 | 字数：约 620 字`,
      confidence: "高" as const,
    },
    marketing: {
      title: "2026 年内容营销新趋势：AI 辅助 vs 人工创作",
      body: `## 文章草稿

**副标题**：AI 时代，内容创作者的生存指南

### 趋势一：AI 生成成为标配

到 2026 年，使用 AI 辅助内容创作已经不再是竞争优势，而是**入场门槛**。问题不是用不用 AI，而是**怎么用**。

### 趋势二：质量 > 数量

当每个人都能用 AI 批量生成内容时，真正能脱颖而出的是那些**质量好、有深度、有人味**的内容。

### 趋势三：人机协作成为内容生产标准流程

最有效的内容团队不再分为"AI 派"和"人工派"，而是建立了高效的协作流程：

1. **AI 负责初稿** — 快速生成框架和素材
2. **人类负责打磨** — 添加洞察、情感和个性化
3. **审批确保质量** — 发布前必须经过审核

### WorkflowGuard 如何帮助内容团队

使用我们的「内容发布审批流」，内容团队可以：
- AI 生成文章草稿，节省 70% 初稿时间
- 编辑在线审批和修改，确保质量
- 通过后一键发布，支持多渠道分发

### 结语

会使用 AI 的内容创作者不会消失，**不用 AI 的内容创作者才会**。

> 置信度：中 | 生成模式：模拟 | 字数：约 500 字`,
      confidence: "中" as const,
    },
    product: {
      title: "产品介绍：WorkflowGuard — 让 AI 做事，让人做决策",
      body: `## 产品文章草稿

### 一句话介绍

WorkflowGuard 是一个**人机协作工作流平台**，让你在享受 AI 效率的同时，保持对关键决策的完全控制。

### 核心功能

**1. 预设工作流模板**
- 🎧 客服工单审批流：AI 生成回复 → 人工审核 → 发送
- 📝 内容发布审批流：AI 生成草稿 → 编辑审批 → 发布
- 📊 数据录入审批流：AI 提取数据 → 人工确认 → 写入

**2. AI 执行引擎**
支持 DeepSeek API 真实调用，也可在模拟模式下预览效果。

**3. 审计日志**
每一步操作都可追溯，满足安全和合规要求。

**4. 配额管理系统**
从 Free 到 Team 四种套餐，灵活匹配不同规模团队的需求。

### 适用场景

- **客服团队**：提升回复效率，确保服务质量
- **内容团队**：加速内容生产，保持品牌调性
- **运营团队**：数据录入自动化，减少人工错误

### 开始使用

免费注册，即可创建 2 个活跃工作流和 20 次审批/月。
无需信用卡，无需部署，5 分钟上手。

> 置信度：高 | 生成模式：模拟 | 字数：约 450 字`,
      confidence: "高" as const,
    },
  },
  data_entry: {
    general: {
      title: "数据提取结果",
      body: `## 数据提取报告

**处理时间**：${new Date().toLocaleString("zh-CN")}
**提取方式**：AI 结构化提取（模拟模式）
**记录数**：1 条

### 提取数据

| 字段 | 提取值 | 置信度 |
|------|--------|--------|
| 数据来源 | 手动输入 | 高 |
| 记录类型 | 通用数据 | 中 |
| 字段数 | 3 个 | 中 |

### 结构化输出

\`\`\`json
{
  "records": [
    {
      "id": 1,
      "field_1": "待确认值1",
      "field_2": "待确认值2",
      "field_3": "待确认值3",
      "confidence": "medium"
    }
  ],
  "metadata": {
    "extraction_method": "ai_structured",
    "total_fields": 3,
    "uncertain_fields": ["field_1", "field_2", "field_3"]
  }
}
\`\`\`

### 需要人工确认

以下字段 AI 置信度较低，建议人工核对：
1. **字段值** — 提取的数值可能需要验证
2. **格式** — 日期、金额等格式需确认
3. **完整性** — 是否所有必要字段都已提取

> 置信度：中 | 生成模式：模拟`,
      confidence: "中" as const,
    },
    invoice: {
      title: "发票信息提取结果",
      body: `## 发票数据提取报告

**处理时间**：${new Date().toLocaleString("zh-CN")}
**提取方式**：AI 发票识别（模拟模式）

### 发票基本信息

| 字段 | 提取值 | 置信度 |
|------|--------|--------|
| 发票类型 | 增值税普通发票 | 高 |
| 发票号码 | INV-2026-${Math.floor(Math.random() * 90000 + 10000)} | 高 |
| 开票日期 | 2026-05-${String(Math.floor(Math.random() * 28 + 1)).padStart(2, "0")} | 高 |
| 含税金额 | ¥${(Math.random() * 10000 + 100).toFixed(2)} | 中 |
| 税额 | ¥${(Math.random() * 1000 + 10).toFixed(2)} | 中 |
| 开票方 | 待确认公司名称 | 低 |

### 结构化数据输出

\`\`\`json
{
  "invoice": {
    "number": "INV-2026-${Math.floor(Math.random() * 90000 + 10000)}",
    "type": "增值税普通发票",
    "date": "2026-05-${String(Math.floor(Math.random() * 28 + 1)).padStart(2, "0")}",
    "issuer": "待确认",
    "receiver": "待确认",
    "items": [
      {"name": "技术服务费", "amount": 1, "unit_price": 8500.00, "total": 8500.00}
    ],
    "total_before_tax": 8500.00,
    "tax": 510.00,
    "total_with_tax": 9010.00
  }
}
\`\`\`

### 高风险字段

以下字段 AI 置信度偏低，**强烈建议人工核实**：
1. **开票方名称** — 可能识别有误
2. **物品明细** — 数量和单价需确认
3. **发票真伪** — 建议在税务平台验证

> 置信度：中 | 生成模式：模拟 | 注意：发票数据请务必人工核对`,
      confidence: "中" as const,
    },
    form: {
      title: "表单数据提取结果",
      body: `## 表单数据提取报告

**处理时间**：${new Date().toLocaleString("zh-CN")}
**提取方式**：AI 表单识别（模拟模式）

### 提取结果

| 字段 | 提取值 | 置信度 |
|------|--------|--------|
| 表单类型 | 注册/申请表单 | 高 |
| 姓名 | [从内容提取] | 高 |
| 联系方式 | [从内容提取] | 中 |
| 提交时间 | [从内容提取] | 高 |

### 完整结构化输出

\`\`\`json
{
  "form_type": "registration",
  "fields": [
    {"name": "name", "value": "待确认", "confidence": "high"},
    {"name": "email", "value": "待确认", "confidence": "high"},
    {"name": "phone", "value": "待确认", "confidence": "medium"},
    {"name": "company", "value": "待确认", "confidence": "low"},
    {"name": "notes", "value": "待确认", "confidence": "medium"}
  ],
  "submission_info": {
    "method": "web_form",
    "timestamp": "待确认"
  }
}
\`\`\`

### 确认清单

请逐项确认以下内容：
- [ ] 所有必填字段是否已提取
- [ ] 联系方式格式是否正确
- [ ] 是否有特殊格式要求（如日期格式 YYYY-MM-DD）
- [ ] 数据是否准备写入数据库

> 置信度：中 | 生成模式：模拟`,
      confidence: "中" as const,
    },
  },
}

// ====================
// 调用 LLM（带重试）
// ====================
async function callLLM(prompt: string, templateId: string, inputData: Record<string, unknown>): Promise<{
  content: string
  confidence: "高" | "中" | "低"
  mode: "real" | "mock"
  retries?: number
}> {
  const apiKey = process.env.DEEPSEEK_API_KEY

  if (apiKey) {
    const maxRetries = 3
    const baseDelay = 1000

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`[AI Engine] 使用 DeepSeek API 调用... (尝试 ${attempt}/${maxRetries})`)
        const res = await fetch("https://api.deepseek.com/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: "deepseek-chat",
            messages: [
              {
                role: "system",
                content:
                  "你是一个专业的工作流 AI 助手。严格按照模板要求输出结果。尽量保持简洁、准确。",
              },
              { role: "user", content: prompt },
            ],
            temperature: 0.7,
            max_tokens: 2000,
          }),
        })

        if (!res.ok) {
          const errBody = await res.text()
          throw new Error(`DeepSeek API 返回 ${res.status}: ${errBody}`)
        }

        const data = await res.json()
        const content = data.choices?.[0]?.message?.content ?? ""

        if (!content) {
          throw new Error("DeepSeek API 返回空内容")
        }

        // 从输出中提取置信度
        let confidence: "高" | "中" | "低" = "中"
        const confMatch = content.match(/置信度[：:]\s*(高|中|低)/)
        if (confMatch) confidence = confMatch[1] as "高" | "中" | "低"

        console.log(`[AI Engine] DeepSeek 调用成功 (尝试 ${attempt})`)
        return { content, confidence, mode: "real" }
      } catch (err) {
        console.error(`[AI Engine] DeepSeek API 调用失败 (尝试 ${attempt}/${maxRetries}):`, err)
        
        if (attempt < maxRetries) {
          const delay = baseDelay * Math.pow(2, attempt - 1) // 指数退避: 1s, 2s, 4s
          console.log(`[AI Engine] 等待 ${delay}ms 后重试...`)
          await sleep(delay)
        }
      }
    }

    // 所有重试都失败，降级到模拟模式
    console.error("[AI Engine] 所有重试均失败，降级到模拟模式")
  }

  // 模拟模式
  console.log("[AI Engine] 使用模拟模式")
  
  const contentType = detectContentType(inputData, templateId)
  
  // 根据模板ID和内容类型选择模拟响应
  const templateResponses = MOCK_RESPONSES[templateId as keyof typeof MOCK_RESPONSES]
  let mockResponse
  
  if (templateResponses) {
    mockResponse = templateResponses[contentType as keyof typeof templateResponses] || templateResponses.general
  } else {
    // Fallback: 尝试找任意模板的 general
    const firstTemplate = Object.values(MOCK_RESPONSES)[0]
    mockResponse = firstTemplate.general
  }

  // 注入用户输入到内容中
  const userContent = (inputData.content as string) || (inputData.userInput as string) || (inputData.topic as string) || ""
  const userSummary = summarizeContent(userContent, 100)
  
  let finalContent = mockResponse.body
  if (userSummary) {
    finalContent = `## ${mockResponse.title}\n\n**用户输入**：${userSummary}\n\n---\n\n${finalContent}`
  }

  return {
    content: finalContent,
    confidence: mockResponse.confidence,
    mode: "mock",
    retries: apiKey ? 3 : undefined,
  }
}

// ====================
// 配置检查端点
// ====================
export async function GET(request: NextRequest) {
  const taskId = request.nextUrl.searchParams.get("taskId")

  if (taskId) {
    const { data: task, error } = await supabaseAdmin
      .from("tasks")
      .select("id, status, agent_result, agent_confidence, error_message, started_at, completed_at")
      .eq("id", taskId)
      .single()

    if (error || !task) {
      return NextResponse.json({ error: "任务不存在" }, { status: 404 })
    }
    return NextResponse.json({ task })
  }

  // 无 taskId 时返回配置状态
  const apiKey = process.env.DEEPSEEK_API_KEY || process.env.LLM_API_KEY
  return NextResponse.json({
    config: {
      llm_configured: !!apiKey,
      provider: apiKey ? "DeepSeek" : "mock",
      mode: apiKey ? "real" : "mock",
      max_retries: 3,
      mock_templates: Object.keys(MOCK_RESPONSES).length,
      message: apiKey
        ? "DeepSeek API 已配置，AI 将使用真实模型（3次重试）"
        : "未配置 LLM API Key，将使用高质量模拟模式。设置 DEEPSEEK_API_KEY 以启用真实 AI。",
    },
  })
}

// ====================
// POST /api/ai/execute
// 触发 AI 执行任务
// ====================
export async function POST(request: NextRequest) {
  try {
    let body: { taskId?: string }
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: "请求体格式错误" }, { status: 400 })
    }

    const { taskId } = body

    if (!taskId) {
      return NextResponse.json({ error: "缺少 taskId" }, { status: 400 })
    }

    // 1. 获取任务
    const { data: task, error: taskError } = await supabaseAdmin
      .from("tasks")
      .select("*")
      .eq("id", taskId)
      .single()

    if (taskError || !task) {
      return NextResponse.json({ error: "任务不存在" }, { status: 404 })
    }

    if (task.status !== "pending") {
      return NextResponse.json(
        { error: `任务当前状态为 ${task.status}，无法执行` },
        { status: 400 }
      )
    }

    // 2. 获取工作流和模板
    const { data: workflow } = await supabaseAdmin
      .from("workflows")
      .select("*")
      .eq("id", task.workflow_id)
      .single()

    if (!workflow) {
      // 标记失败
      await supabaseAdmin
        .from("tasks")
        .update({ status: "failed", error_message: "关联工作流不存在" })
        .eq("id", taskId)
      return NextResponse.json({ error: "关联工作流不存在" }, { status: 404 })
    }

    const template = getTemplateById(workflow.template_id || task.type)
    if (!template) {
      await supabaseAdmin
        .from("tasks")
        .update({ status: "failed", error_message: "模板不存在" })
        .eq("id", taskId)
      return NextResponse.json({ error: "模板不存在" }, { status: 404 })
    }

    // 3. 构建 Prompt
    const inputData = task.input_data as Record<string, unknown>
    let prompt = template.promptTemplate

    // 通用替换
    const vars: Record<string, string> = {
      userInput: (inputData.userInput as string) || (inputData.content as string) || (inputData.query as string) || "用户输入内容",
      topic: (inputData.topic as string) || (inputData.title as string) || "通用主题",
      context: (inputData.context as string) || (inputData.description as string) || "",
      requirements: (inputData.requirements as string) || (inputData.specialRequirements as string) || "",
      content: (inputData.content as string) || (inputData.data as string) || "",
      source: (inputData.source as string) || (inputData.fileName as string) || "手动输入",
    }

    for (const [key, value] of Object.entries(vars)) {
      prompt = prompt.replace(new RegExp(`\\{${key}\\}`, "g"), value)
    }

    // 4. 更新状态为处理中
    await supabaseAdmin
      .from("tasks")
      .update({
        status: "ai_processing",
        started_at: new Date().toISOString(),
      })
      .eq("id", taskId)

    // 5. 写入审计日志
    await supabaseAdmin.from("audit_logs").insert({
      user_id: task.user_id,
      task_id: taskId,
      workflow_id: workflow.id,
      action: "ai_executed",
      details: { 
        status: "processing", 
        template_id: template.id, 
        content_type: detectContentType(inputData, template.id),
        mode: process.env.DEEPSEEK_API_KEY ? "real" : "mock" 
      },
    })

    // 6. 调用 LLM（带重试）
    const result = await callLLM(prompt, template.id, inputData)

    // 7. 更新任务状态
    const { error: updateError } = await supabaseAdmin
      .from("tasks")
      .update({
        status: "waiting_approval",
        agent_result: { 
          content: result.content, 
          prompt: summarizeContent(prompt, 100),
          generated_at: new Date().toISOString(),
          mode: result.mode,
        },
        agent_confidence: result.confidence,
      })
      .eq("id", taskId)

    if (updateError) {
      console.error("[AI Engine] 更新任务状态失败:", updateError)
      await supabaseAdmin
        .from("tasks")
        .update({ status: "failed", error_message: "更新任务状态失败" })
        .eq("id", taskId)
      return NextResponse.json({ error: "更新任务状态失败" }, { status: 500 })
    }

    console.log(`[AI Engine] 任务 ${taskId} 执行完成 → waiting_approval (模式: ${result.mode}, 置信度: ${result.confidence})`)

    return NextResponse.json({
      success: true,
      taskId,
      status: "waiting_approval",
      mode: result.mode,
      retries: result.retries ?? 0,
      result: {
        content_preview: summarizeContent(result.content, 200),
        confidence: result.confidence,
      },
    })
  } catch (err) {
    console.error("[AI Engine] 严重错误:", err)
    return NextResponse.json({ error: "AI 执行失败" }, { status: 500 })
  }
}
