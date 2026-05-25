// WorkflowGuard — AI 执行引擎 API v2
// 接收任务 ID → 根据模板构建 prompt → 调用 LLM → 写入结果 → 状态流转
// 支持：DeepSeek API / 模拟模式

import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { getTemplateById } from "@/lib/workflow-templates"

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

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
      message: apiKey
        ? "DeepSeek API 已配置，AI 将使用真实模型"
        : "未配置 LLM API Key，将使用模拟模式。设置 DEEPSEEK_API_KEY 以启用真实 AI。",
    },
  })
}

// ====================
// 调用 LLM
// ====================
async function callLLM(prompt: string): Promise<{
  content: string
  confidence: "高" | "中" | "低"
}> {
  const apiKey = process.env.DEEPSEEK_API_KEY

  if (apiKey) {
    try {
      console.log("[AI Engine] 使用 DeepSeek API 调用...")
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

      console.log("[AI Engine] DeepSeek 调用成功")
      return { content, confidence }
    } catch (err) {
      console.error("[AI Engine] DeepSeek API 调用失败，降级到模拟模式:", err)
      // 降级到模拟
    }
  }

  // 模拟模式 — 生成更真实的内容
  console.log("[AI Engine] 使用模拟模式")
  const mockResponses: Record<string, string> = {
    customer_service: `## AI 回复草稿

**客户咨询摘要**：
已收到您的咨询请求，AI 已初步分析内容。

**AI 建议回复**：
\`\`\`
您好！感谢您的咨询。

关于您提到的问题，我们已经进行了初步分析。AI 建议如下：
1. 已理解您的需求
2. 建议人工审核此回复
3. 确认后即可发送

如需进一步帮助，请随时告知。
\`\`\`

**需要确认的信息**：
- 回复语气是否合适
- 是否包含所有必要信息
- 是否有特定品牌用语需要调整

> 置信度：中 | 生成模式：模拟`,
    content_publish: `## 内容草稿

**标题**：高效人机协作：AI 时代的团队新范式

**正文**：

在 2026 年的今天，AI 已经从新奇工具变成了基础设施。然而，自动化并非万能药——许多团队发现，纯粹依赖 AI 自动化带来的问题比解决的问题还多。

WorkflowGuard 提出了第三条道路：人机协作。

### 什么是人机协作？

简单来说：AI 负责执行，人类负责决策。

具体而言：
1. **AI 执行**：重复性、数据密集型任务由 AI 自动完成
2. **人工审批**：关键节点必须由人确认
3. **全程可审计**：每一步操作都有记录

### 为什么这比纯自动化更靠谱？

核心原因有三个：
- **AI 幻觉**：即使是最好的模型也会出错
- **业务复杂性**：自动规则无法覆盖所有例外情况
- **信任建设**：逐步建立对 AI 的信任，而非一步到位

**关键要点**：
1. 人机协作是目前最优的 AI 落地路径
2. 审批节点是关键的安全阀门
3. 从小规模试点开始最稳妥

> 置信度：中 | 生成模式：模拟`,
    data_entry: `## 数据提取结果

| 字段 | 提取值 | 确定性 |
|------|--------|--------|
| 数据来源 | 用户输入 | 高 |
| 提取方式 | AI 结构化提取 | 中 |
| 记录数 | 1 条 | 中 |

**原始内容**：
${prompt.slice(0, 200)}...

**结构化数据**：
\`\`\`json
{
  "type": "data_entry_record",
  "fields": [
    {"name": "field_1", "value": "待确认", "confidence": "medium"},
    {"name": "field_2", "value": "待确认", "confidence": "medium"}
  ],
  "total_records": 1
}
\`\`\`

**不确定的字段**：
- 部分字段需要人工确认
- 格式可能需要调整

> 置信度：中 | 生成模式：模拟`,
  }

  return {
    content: mockResponses[mockResponses[prompt.toLowerCase().includes("客服") || prompt.toLowerCase().includes("customer") ? "customer_service" : ""] as keyof typeof mockResponses] || mockResponses.customer_service,
    confidence: "中" as "高" | "中" | "低",
  }
}

// ====================
// POST /api/ai/execute
// 触发 AI 执行任务
// ====================
export async function POST(request: NextRequest) {
  try {
    const { taskId } = await request.json()

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
      return NextResponse.json({ error: "关联工作流不存在" }, { status: 404 })
    }

    const template = getTemplateById(workflow.template_id || task.type)
    if (!template) {
      return NextResponse.json({ error: "模板不存在" }, { status: 404 })
    }

    // 3. 构建 Prompt
    const inputData = task.input_data as Record<string, unknown>
    let prompt = template.promptTemplate

    // 通用替换 — 处理所有可能的变量占位符
    const vars: Record<string, string> = {
      userInput: (inputData.userInput as string) || inputData.content as string || inputData.query as string || "用户输入内容",
      topic: (inputData.topic as string) || inputData.title as string || "通用主题",
      context: (inputData.context as string) || inputData.description as string || "",
      requirements: (inputData.requirements as string) || inputData.specialRequirements as string || "",
      content: (inputData.content as string) || inputData.data as string || "",
      source: (inputData.source as string) || inputData.fileName as string || "手动输入",
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

    // 5. 写入审计日志：开始处理
    await supabaseAdmin.from("audit_logs").insert({
      user_id: task.user_id,
      task_id: taskId,
      workflow_id: workflow.id,
      action: "ai_executed",
      details: { status: "processing", template_id: template.id, mode: process.env.DEEPSEEK_API_KEY ? "real" : "mock" },
    })

    // 6. 调用 LLM
    const result = await callLLM(prompt)

    // 7. 更新任务为等待审批
    const { error: updateError } = await supabaseAdmin
      .from("tasks")
      .update({
        status: "waiting_approval",
        agent_result: { content: result.content, prompt: prompt.slice(0, 200) + "...", generated_at: new Date().toISOString() },
        agent_confidence: result.confidence,
      })
      .eq("id", taskId)

    if (updateError) {
      console.error("[AI Engine] 更新任务状态失败:", updateError)
      return NextResponse.json({ error: "更新任务状态失败" }, { status: 500 })
    }

    console.log(`[AI Engine] 任务 ${taskId} 执行完成，状态: waiting_approval，置信度: ${result.confidence}`)

    return NextResponse.json({
      success: true,
      taskId,
      status: "waiting_approval",
      mode: process.env.DEEPSEEK_API_KEY ? "real" : "mock",
      result: {
        content_preview: result.content.slice(0, 200) + "...",
        confidence: result.confidence,
      },
    })
  } catch (err) {
    console.error("[AI Engine] 严重错误:", err)

    // 标记为失败
    if (typeof err === "object" && err && "taskId" in (request as any)) {
      try {
        const { taskId } = await request.clone().json()
        if (taskId) {
          await supabaseAdmin
            .from("tasks")
            .update({
              status: "failed",
              error_message: err instanceof Error ? err.message : "未知错误",
            })
            .eq("id", taskId)
        }
      } catch { /* ignore */ }
    }

    return NextResponse.json({ error: "AI 执行失败" }, { status: 500 })
  }
}
