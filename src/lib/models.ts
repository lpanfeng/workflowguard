// WorkflowGuard — AI 模型路由配置
// 定义支持的AI模型及其参数，供工作流创建时选择

export interface AIModel {
  id: string
  name: string
  provider: 'deepseek' | 'openai' | 'claude' | 'mock'
  displayName: string
  description: string
  /** 模型名称（API参数） */
  modelParam: string
  /** 价格（每1M tokens，input） */
  inputPricePer1M: number
  /** 价格（每1M tokens，output） */
  outputPricePer1M: number
  /** 最大上下文长度 */
  maxContextLength: number
  /** 是否支持工具调用 */
  supportsTools: boolean
  /** 是否支持多模态 */
  supportsVision: boolean
  /** 速度等级（1-5，5最快） */
  speedRating: number
  /** 质量等级（1-5，5最高） */
  qualityRating: number
  /** 推荐场景 */
  recommendedFor: string[]
  /** 标签 */
  tags: string[]
}

export const AI_MODELS: AIModel[] = [
  {
    id: 'deepseek-chat',
    name: 'DeepSeek Chat',
    provider: 'deepseek',
    displayName: 'DeepSeek Chat',
    description: 'DeepSeek 通用对话模型，性价比之王，支持长上下文',
    modelParam: 'deepseek-chat',
    inputPricePer1M: 0.27,
    outputPricePer1M: 1.10,
    maxContextLength: 64000,
    supportsTools: true,
    supportsVision: false,
    speedRating: 4,
    qualityRating: 4,
    recommendedFor: ['通用对话', '内容生成', '代码辅助'],
    tags: ['性价比', '中文友好'],
  },
  {
    id: 'deepseek-reasoner',
    name: 'DeepSeek R1',
    provider: 'deepseek',
    displayName: 'DeepSeek R1 (Reasoning)',
    description: 'DeepSeek 推理模型，擅长复杂逻辑和数学推理',
    modelParam: 'deepseek-reasoner',
    inputPricePer1M: 0.55,
    outputPricePer1M: 2.19,
    maxContextLength: 64000,
    supportsTools: true,
    supportsVision: false,
    speedRating: 2,
    qualityRating: 5,
    recommendedFor: ['复杂推理', '数据分析', '代码审查'],
    tags: ['推理', '高质量'],
  },
  {
    id: 'deepseek-v3',
    name: 'DeepSeek V3',
    provider: 'deepseek',
    displayName: 'DeepSeek V3',
    description: 'DeepSeek 第三代通用模型，平衡性能与成本',
    modelParam: 'deepseek-v3',
    inputPricePer1M: 0.27,
    outputPricePer1M: 1.10,
    maxContextLength: 32000,
    supportsTools: true,
    supportsVision: false,
    speedRating: 4,
    qualityRating: 4,
    recommendedFor: ['通用任务', '快速响应'],
    tags: ['快速', '稳定'],
  },
  {
    id: 'gpt-4o',
    name: 'GPT-4o',
    provider: 'openai',
    displayName: 'GPT-4o',
    description: 'OpenAI 旗舰多模态模型，性能均衡',
    modelParam: 'gpt-4o',
    inputPricePer1M: 2.50,
    outputPricePer1M: 10.00,
    maxContextLength: 128000,
    supportsTools: true,
    supportsVision: true,
    speedRating: 3,
    qualityRating: 5,
    recommendedFor: ['复杂任务', '多模态', '高质量输出'],
    tags: ['旗舰', '多模态'],
  },
  {
    id: 'gpt-4o-mini',
    name: 'GPT-4o Mini',
    provider: 'openai',
    displayName: 'GPT-4o Mini',
    description: 'OpenAI 轻量级模型，速度快成本低',
    modelParam: 'gpt-4o-mini',
    inputPricePer1M: 0.15,
    outputPricePer1M: 0.60,
    maxContextLength: 128000,
    supportsTools: true,
    supportsVision: true,
    speedRating: 5,
    qualityRating: 3,
    recommendedFor: ['快速响应', '简单任务', '批量处理'],
    tags: ['轻量', '快速'],
  },
  {
    id: 'claude-sonnet-4-20250514',
    name: 'Claude Sonnet 4',
    provider: 'claude',
    displayName: 'Claude Sonnet 4',
    description: 'Anthropic 主力模型，写作和理解能力强',
    modelParam: 'claude-sonnet-4-20250514',
    inputPricePer1M: 3.00,
    outputPricePer1M: 15.00,
    maxContextLength: 200000,
    supportsTools: true,
    supportsVision: true,
    speedRating: 3,
    qualityRating: 5,
    recommendedFor: ['内容创作', '长文档分析', '复杂指令'],
    tags: ['写作', '长上下文'],
  },
  {
    id: 'claude-haiku-3-5-20241022',
    name: 'Claude Haiku 3.5',
    provider: 'claude',
    displayName: 'Claude Haiku 3.5',
    description: 'Anthropic 快速响应模型，适合简单任务',
    modelParam: 'claude-haiku-3-5-20241022',
    inputPricePer1M: 0.80,
    outputPricePer1M: 4.00,
    maxContextLength: 200000,
    supportsTools: true,
    supportsVision: true,
    speedRating: 5,
    qualityRating: 3,
    recommendedFor: ['快速响应', '简单分类', '批量处理'],
    tags: ['快速', '低成本'],
  },
  {
    id: 'mock',
    name: 'Mock (Simulation)',
    provider: 'mock',
    displayName: '模拟模式 (Mock)',
    description: '无需API Key的模拟模式，用于开发和演示',
    modelParam: 'mock',
    inputPricePer1M: 0,
    outputPricePer1M: 0,
    maxContextLength: 4000,
    supportsTools: false,
    supportsVision: false,
    speedRating: 5,
    qualityRating: 2,
    recommendedFor: ['开发测试', '演示', '原型验证'],
    tags: ['免费', '演示'],
  },
]

/** 获取模型列表（按推荐排序） */
export function getOrderedModels(): AIModel[] {
  return [...AI_MODELS].sort((a, b) => {
    // Mock 放最后
    if (a.provider === 'mock') return 1
    if (b.provider === 'mock') return -1
    // 按性价比排序（质量/价格比）
    const aRatio = a.qualityRating / ((a.inputPricePer1M + a.outputPricePer1M) / 2)
    const bRatio = b.qualityRating / ((b.inputPricePer1M + b.outputPricePer1M) / 2)
    return bRatio - aRatio
  })
}

/** 根据ID获取模型 */
export function getModelById(id: string): AIModel | undefined {
  return AI_MODELS.find((m) => m.id === id)
}

/** 根据provider获取模型列表 */
export function getModelsByProvider(provider: AIModel['provider']): AIModel[] {
  return AI_MODELS.filter((m) => m.provider === provider)
}

/** 获取推荐模型（按场景） */
export function getRecommendedModels(scenario: string): AIModel[] {
  return AI_MODELS.filter((m) => m.recommendedFor.some((r) => r.includes(scenario))).slice(0, 3)
}

/** 计算预估成本（基于输入输出token数） */
export function estimateCost(model: AIModel, inputTokens: number, outputTokens: number): number {
  if (model.provider === 'mock') return 0
  const inputCost = (inputTokens / 1_000_000) * model.inputPricePer1M
  const outputCost = (outputTokens / 1_000_000) * model.outputPricePer1M
  return parseFloat((inputCost + outputCost).toFixed(4))
}

/** 快捷场景推荐 */
export const SCENARIO_RECOMMENDATIONS: Record<string, string[]> = {
  '客服工单': ['deepseek-chat', 'gpt-4o-mini', 'claude-haiku-3-5-20241022'],
  '内容发布': ['deepseek-chat', 'claude-sonnet-4-20250514', 'gpt-4o'],
  '数据录入': ['deepseek-chat', 'gpt-4o-mini', 'mock'],
  '代码审查': ['deepseek-reasoner', 'gpt-4o', 'claude-sonnet-4-20250514'],
}
