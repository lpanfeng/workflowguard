import { describe, it, expect, vi, beforeEach } from 'vitest'

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

describe('WorkflowTriggerDetector', () => {
  it('should be defined as a class with checkTriggers', async () => {
    const { WorkflowTriggerDetector } = await import('@/lib/workflow-executor')
    expect(WorkflowTriggerDetector).toBeDefined()
    expect(typeof WorkflowTriggerDetector.checkTriggers).toBe('function')
  })
})
