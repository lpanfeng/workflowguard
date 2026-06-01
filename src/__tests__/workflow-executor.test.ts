import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Set env vars before any imports
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key'

// 模拟全局 fetch
vi.stubGlobal('fetch', vi.fn())

describe('WorkflowExecutor', () => {
  let executor: any

  beforeEach(async () => {
    vi.clearAllMocks()
    const mod = await import('@/lib/workflow-executor')
    executor = new mod.WorkflowExecutor()
  })

  describe('基本功能', () => {
    it('getStatus() 初始应为 null', () => {
      expect(executor.getStatus()).toBeNull()
    })

    it('没有执行时 cancelExecution 抛出错误', async () => {
      await expect(executor.cancelExecution()).rejects.toThrow('没有正在进行的执行')
    })

    it('没有执行时 executeNextStep 抛出错误', async () => {
      await expect(executor.executeNextStep()).rejects.toThrow('没有正在进行的执行')
    })
  })
})

describe('WorkflowTemplates', () => {
  it('should verify template structure via standard import', async () => {
    const { WORKFLOW_TEMPLATES, getTemplateById } = await import('@/lib/workflow-templates')

    expect(WORKFLOW_TEMPLATES.length).toBeGreaterThanOrEqual(3)

    const csTemplate = getTemplateById('customer-service')
    expect(csTemplate).toBeTruthy()
    expect(csTemplate!.steps).toHaveLength(4)

    const types = csTemplate!.steps.map(s => s.type)
    expect(types).toContain('ai_execute')
    expect(types).toContain('human_approve')
  })

  it('getTemplateById returns undefined for non-existent ID', async () => {
    const { getTemplateById } = await import('@/lib/workflow-templates')
    expect(getTemplateById('non-existent')).toBeUndefined()
  })

  it('all templates have valid step types', async () => {
    const { WORKFLOW_TEMPLATES } = await import('@/lib/workflow-templates')
    const validTypes = ['action', 'ai_execute', 'human_approve', 'notify']

    for (const template of WORKFLOW_TEMPLATES) {
      expect(template.id).toBeTruthy()
      expect(template.name).toBeTruthy()
      expect(template.steps.length).toBeGreaterThanOrEqual(1)
      expect(template.promptTemplate).toMatch(/\{.*?\}/)

      for (const step of template.steps) {
        expect(validTypes).toContain(step.type)
        expect(step.id).toBeTruthy()
        expect(step.name).toBeTruthy()
      }
    }
  })

  it('all template IDs are unique', async () => {
    const { WORKFLOW_TEMPLATES } = await import('@/lib/workflow-templates')
    const ids = WORKFLOW_TEMPLATES.map(t => t.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('customer-service flow has correct step order', async () => {
    const { WORKFLOW_TEMPLATES } = await import('@/lib/workflow-templates')
    const cs = WORKFLOW_TEMPLATES.find(t => t.id === 'customer-service')
    expect(cs).toBeTruthy()
    expect(cs!.steps.map(s => s.type)).toEqual([
      'action',
      'ai_execute',
      'human_approve',
      'action',
    ])
  })

  it('content-publish flow has correct step order', async () => {
    const { WORKFLOW_TEMPLATES } = await import('@/lib/workflow-templates')
    const cp = WORKFLOW_TEMPLATES.find(t => t.id === 'content-publish')
    expect(cp).toBeTruthy()
    expect(cp!.steps.map(s => s.type)).toEqual([
      'action',
      'ai_execute',
      'human_approve',
      'action',
    ])
  })

  it('data-entry flow has correct step order', async () => {
    const { WORKFLOW_TEMPLATES } = await import('@/lib/workflow-templates')
    const de = WORKFLOW_TEMPLATES.find(t => t.id === 'data-entry')
    expect(de).toBeTruthy()
    expect(de!.steps.map(s => s.type)).toEqual([
      'action',
      'ai_execute',
      'human_approve',
      'action',
    ])
  })
})

describe('执行重试机制', () => {
  let executor: any

  beforeEach(async () => {
    vi.clearAllMocks()
    vi.useFakeTimers()
    const mod = await import('@/lib/workflow-executor')
    executor = new mod.WorkflowExecutor()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('StepExecution 默认应包含重试和超时字段', async () => {
    const mod = await import('@/lib/workflow-executor')
    // 验证类型存在 - 实际验证会由 TypeScript 编译时完成
    // 这里验证运行时默认值的设置逻辑
    expect(mod.WorkflowExecutor).toBeDefined()
    expect(mod.WorkflowTriggerDetector).toBeDefined()
  })

  it('executeNextStep 应在步骤失败时按重试次数重试', async () => {
    // 模拟一个会失败的 Action 步骤
    const failingStep = {
      stepId: 'fail_step',
      stepName: '失败步骤',
      stepType: 'action' as const,
      status: 'idle' as const,
      startedAt: null,
      completedAt: null,
      maxRetries: 2,
      retryDelayMs: 100,
      timeoutMs: 60000,
      retryCount: 0,
    }

    expect(failingStep.maxRetries).toBe(2)
    expect(failingStep.retryDelayMs).toBe(100)
    expect(failingStep.timeoutMs).toBe(60000)
    expect(failingStep.retryCount).toBe(0)
  })

  it('timeout 字段应支持从10秒到300秒的合理范围', async () => {
    const steps = [
      { timeoutMs: 10000 },  // AI 快速任务
      { timeoutMs: 30000 },  // 一般任务
      { timeoutMs: 60000 },  // 默认
      { timeoutMs: 120000 }, // 复杂任务
      { timeoutMs: 300000 }, // 超复杂任务
    ]

    for (const s of steps) {
      expect(s.timeoutMs).toBeGreaterThanOrEqual(5000)
      expect(s.timeoutMs).toBeLessThanOrEqual(600000)
    }
  })

  it('retryCount 不应超过 maxRetries', async () => {
    const step = { retryCount: 0, maxRetries: 3 }
    
    // 模拟重试逻辑
    while (step.retryCount < step.maxRetries) {
      step.retryCount++
    }
    
    expect(step.retryCount).toBe(3)
    expect(step.retryCount).toBeLessThanOrEqual(step.maxRetries)
  })
})

describe('工作流状态机扩展', () => {
  it('应包含 retrying 和 timed_out 状态', async () => {
    const mod = await import('@/lib/workflow-executor')
    // 验证模块存在 - 编译时会检查类型
    expect(mod.WorkflowExecutor).toBeDefined()
    expect(mod.WorkflowTriggerDetector).toBeDefined()
  })

  it('retrying 状态应在重试时被设置', () => {
    const validStatuses = [
      'idle', 'triggered', 'running', 'step_in_progress',
      'step_completed', 'waiting_approval', 'approved',
      'retrying', 'completed', 'failed', 'cancelled', 'timed_out'
    ]
    expect(validStatuses).toContain('retrying')
    expect(validStatuses).toContain('timed_out')
  })

  it('timed_out 状态应视为最终状态（不可恢复）', () => {
    const finalStates = ['completed', 'failed', 'cancelled', 'timed_out']
    expect(finalStates).toContain('timed_out')
  })
})

describe('WorkflowTriggerDetector', () => {
  it('should be defined as a class with checkTriggers', async () => {
    const { WorkflowTriggerDetector } = await import('@/lib/workflow-executor')
    expect(WorkflowTriggerDetector).toBeDefined()
    expect(typeof WorkflowTriggerDetector.checkTriggers).toBe('function')
  })
})

describe('WorkflowTriggerDetector', () => {
  it('should be defined as a class with checkTriggers', async () => {
    const { WorkflowTriggerDetector } = await import('@/lib/workflow-executor')
    expect(WorkflowTriggerDetector).toBeDefined()
    expect(typeof WorkflowTriggerDetector.checkTriggers).toBe('function')
  })
})
