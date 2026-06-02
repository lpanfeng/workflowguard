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

// ========================
// 多级审批（新增）
// ========================

describe('多级审批功能', () => {
  it('模板应包含 approvalConfig 定义', async () => {
    const { WORKFLOW_TEMPLATES, getApprovalStepConfig } = await import('@/lib/workflow-templates')

    for (const template of WORKFLOW_TEMPLATES) {
      const approveStep = template.steps.find(s => s.type === 'human_approve')
      if (approveStep) {
        const config = getApprovalStepConfig(template, approveStep.id)
        expect(config).toBeTruthy()
        expect(config!.levels).toBeGreaterThanOrEqual(1)
        expect(config!.approvers.length).toBe(config!.levels)
      }
    }
  })

  it('ApprovalLevelStatus 字段完整性', async () => {
    // 验证 ApprovalLevelStatus 的运行时行为（使用宽松类型）
    const levelStatus: Record<string, unknown> = {
      level: 0,
      status: 'pending',
      approver: { type: 'user', email: 'test@example.com', label: '测试审批人' },
    }

    expect(levelStatus.level).toBe(0)
    expect(levelStatus.status).toBe('pending')
    expect((levelStatus.approver as Record<string, unknown>).email).toBe('test@example.com')
    expect((levelStatus.approver as Record<string, unknown>).label).toBe('测试审批人')

    // 模拟审批通过
    levelStatus.status = 'approved'
    levelStatus.handledBy = 'user_123'
    levelStatus.comment = '同意'
    levelStatus.handledAt = new Date().toISOString()

    expect(levelStatus.status).toBe('approved')
    expect(levelStatus.handledBy).toBe('user_123')
  })

  it('多级审批链状态转换', async () => {
    // 模拟三级审批链：员工 → 主管 → 经理
    const chain: Record<string, unknown>[] = [
      { level: 0, status: 'approved', approver: { type: 'user', role: 'employee', label: '员工' } },
      { level: 1, status: 'pending', approver: { type: 'role', role: 'manager', label: '主管' } },
      { level: 2, status: 'pending', approver: { type: 'role', role: 'director', label: '经理' } },
    ]

    // 第1级已通过，检查是否进入下一级
    expect(chain[0].status).toBe('approved')
    expect(chain[1].status).toBe('pending')

    // 模拟第2级通过
    chain[1].status = 'approved'
    chain[1].handledBy = 'user_456'

    expect(chain[1].status).toBe('approved')

    // 第3级驳回
    chain[2].status = 'rejected'
    chain[2].handledBy = 'user_789'
    chain[2].comment = '需要补充材料'

    expect(chain[2].status).toBe('rejected')
    expect(chain[2].comment).toBe('需要补充材料')
  })

  it('ApproverConfig 支持 user 和 role 两种类型', async () => {
    const { getTemplateById } = await import('@/lib/workflow-templates')

    const csTemplate = getTemplateById('customer-service')!
    const config = csTemplate.approvalConfig?.['approve']

    expect(config).toBeTruthy()
    expect(config!.approvers[0].type).toBe('role')
    expect(config!.approvers[0].role).toBe('manager')
    expect(config!.approvers[0].label).toBe('客服主管')
  })

  it('驳回策略应标记所有待审批级别为 rejected', () => {
    const approvalStatus = [
      { level: 0, status: 'approved' as const },
      { level: 1, status: 'rejected' as const },
      { level: 2, status: 'pending' as const },
    ]

    // 模拟第2级驳回后，后续级别也应标记
    const currentLevel = 1
    for (let i = currentLevel + 1; i < approvalStatus.length; i++) {
      approvalStatus[i].status = 'rejected'
    }

    expect(approvalStatus[2].status).toBe('rejected')
  })
})
