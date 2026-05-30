import { describe, it, expect } from 'vitest'
import { WORKFLOW_TEMPLATES, getTemplateById } from '@/lib/workflow-templates'

describe('WorkflowTemplates', () => {
  it('应该包含 3 个预设模板', () => {
    expect(WORKFLOW_TEMPLATES).toHaveLength(3)
  })

  it('每个模板必须有完整的字段', () => {
    for (const template of WORKFLOW_TEMPLATES) {
      expect(template.id).toBeTruthy()
      expect(template.name).toBeTruthy()
      expect(template.description).toBeTruthy()
      expect(template.icon).toBeTruthy()
      expect(template.category).toBeTruthy()
      expect(template.steps).toBeInstanceOf(Array)
      expect(template.promptTemplate).toBeTruthy()
    }
  })

  it('每个模板必须至少有一个步骤', () => {
    for (const template of WORKFLOW_TEMPLATES) {
      expect(template.steps.length).toBeGreaterThanOrEqual(1)
    }
  })

  it('每个模板的步骤必须包含有效的步骤类型', () => {
    const validTypes = ['action', 'ai_execute', 'human_approve', 'notify']
    for (const template of WORKFLOW_TEMPLATES) {
      for (const step of template.steps) {
        expect(validTypes).toContain(step.type)
        expect(step.id).toBeTruthy()
        expect(step.name).toBeTruthy()
        expect(step.description).toBeTruthy()
      }
    }
  })

  it('客服工单审批流必须有 4 个步骤且包含人工审批', () => {
    const csTemplate = WORKFLOW_TEMPLATES.find(t => t.id === 'customer-service')
    expect(csTemplate).toBeTruthy()
    expect(csTemplate!.steps).toHaveLength(4)
    expect(csTemplate!.steps.map(s => s.type)).toContain('human_approve')
    expect(csTemplate!.steps[0].type).toBe('action') // 第一步是接收输入
    expect(csTemplate!.steps[1].type).toBe('ai_execute') // AI 生成
    expect(csTemplate!.steps[2].type).toBe('human_approve') // 审批
    expect(csTemplate!.steps[3].type).toBe('action') // 发送
  })

  it('内容发布审批流必须有 4 个步骤', () => {
    const cpTemplate = WORKFLOW_TEMPLATES.find(t => t.id === 'content-publish')
    expect(cpTemplate).toBeTruthy()
    expect(cpTemplate!.steps).toHaveLength(4)
    const types = cpTemplate!.steps.map(s => s.type)
    expect(types).toEqual(['action', 'ai_execute', 'human_approve', 'action'])
  })

  it('数据录入审批流必须有 4 个步骤', () => {
    const deTemplate = WORKFLOW_TEMPLATES.find(t => t.id === 'data-entry')
    expect(deTemplate).toBeTruthy()
    expect(deTemplate!.steps).toHaveLength(4)
    const types = deTemplate!.steps.map(s => s.type)
    expect(types).toEqual(['action', 'ai_execute', 'human_approve', 'action'])
  })

  it('模板 ID 必须唯一', () => {
    const ids = WORKFLOW_TEMPLATES.map(t => t.id)
    const uniqueIds = new Set(ids)
    expect(uniqueIds.size).toBe(ids.length)
  })

  it('getTemplateById 应返回正确的模板', () => {
    const template = getTemplateById('customer-service')
    expect(template).toBeTruthy()
    expect(template!.name).toBe('客服工单审批流')
  })

  it('getTemplateById 对不存在的 ID 应返回 undefined', () => {
    const template = getTemplateById('non-existent')
    expect(template).toBeUndefined()
  })

  it('每个模板的 promptTemplate 必须包含占位符变量', () => {
    for (const template of WORKFLOW_TEMPLATES) {
      expect(template.promptTemplate).toMatch(/\{.*?\}/)
    }
  })
})
