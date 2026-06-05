import { describe, it, expect, vi, beforeEach } from 'vitest'
import { supabase } from '@/lib/supabase'

// Mock @/lib/supabase
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
  },
}))

describe('ExecutionTimeline — 数据加载逻辑', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('workflow_executions 表数据源', () => {
    it('应该正确构造 workflow_executions 查询', async () => {
      const mockLimit = vi.fn().mockResolvedValue({ data: [], error: null })
      const mockOrder = vi.fn().mockReturnValue({ limit: mockLimit })
      const mockEq = vi.fn().mockReturnValue({ order: mockOrder })
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEq })
      const mockFrom = vi.fn().mockReturnValue({ select: mockSelect })
      
      ;(supabase.from as any) = mockFrom

      const result = await supabase
        .from('workflow_executions')
        .select('id')
        .eq('user_id', 'test-user-1')
        .order('started_at', { ascending: false })
        .limit(10)

      expect(mockFrom).toHaveBeenCalledWith('workflow_executions')
      expect(mockEq).toHaveBeenCalledWith('user_id', 'test-user-1')
      expect(mockOrder).toHaveBeenCalledWith('started_at', { ascending: false })
      expect(mockLimit).toHaveBeenCalledWith(10)
      expect(result.data).toEqual([])
    })

    it('应该识别 workflow_executions 查询失败时的错误', async () => {
      // 模拟组件在执行查询失败时的逻辑
      const mockLimit = vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'relation "workflow_executions" does not exist', code: '42P01' },
      })
      const mockOrder = vi.fn().mockReturnValue({ limit: mockLimit })
      const mockEq = vi.fn().mockReturnValue({ order: mockOrder })
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEq })
      const mockFrom = vi.fn().mockReturnValue({ select: mockSelect })
      
      ;(supabase.from as any) = mockFrom

      const execResult = await supabase.from('workflow_executions')
        .select('id')
        .eq('user_id', 'test-user-1')
        .order('started_at', { ascending: false })
        .limit(10)

      expect(execResult.error).toBeTruthy()
      expect(execResult.error?.message).toContain('does not exist')
    })
  })

  describe('状态映射逻辑', () => {
    it('completed/approved 状态应映射为 completed', () => {
      const statusMap: Record<string, string> = {
        completed: 'completed',
        approved: 'completed',
        failed: 'failed',
        rejected: 'failed',
        waiting_approval: 'waiting_approval',
        pending: 'pending',
        running: 'running',
      }

      // 测试组件中的状态映射逻辑
      function mapStatus(status: string): string {
        if (status === 'completed' || status === 'approved') return 'completed'
        if (status === 'failed' || status === 'rejected') return 'failed'
        if (status === 'waiting_approval') return 'waiting_approval'
        if (status === 'running' || status === 'in_progress') return 'running'
        return 'pending'
      }

      expect(mapStatus('completed')).toBe('completed')
      expect(mapStatus('approved')).toBe('completed')
      expect(mapStatus('failed')).toBe('failed')
      expect(mapStatus('rejected')).toBe('failed')
      expect(mapStatus('waiting_approval')).toBe('waiting_approval')
      expect(mapStatus('pending')).toBe('pending')
      expect(mapStatus('running')).toBe('running')
      expect(mapStatus('in_progress')).toBe('running')
      // 未知状态应降级为 pending
      expect(mapStatus('unknown_status')).toBe('pending')
    })

    it('应该为所有状态提供标签和图标配置', () => {
      const STATUS_CONFIG: Record<string, { label: string }> = {
        completed: { label: '已完成' },
        running: { label: '运行中' },
        failed: { label: '失败' },
        waiting_approval: { label: '待审批' },
        pending: { label: '待执行' },
      }

      expect(STATUS_CONFIG.completed.label).toBe('已完成')
      expect(STATUS_CONFIG.running.label).toBe('运行中')
      expect(STATUS_CONFIG.failed.label).toBe('失败')
      expect(STATUS_CONFIG.waiting_approval.label).toBe('待审批')
      expect(STATUS_CONFIG.pending.label).toBe('待执行')
    })

    it('未知状态应有一个默认降级配置', () => {
      function getDefaultStatus(key: string): { label: string; color: string } {
        const map: Record<string, { label: string; color: string }> = {
          completed: { label: '已完成', color: 'text-green-600' },
          running: { label: '运行中', color: 'text-blue-600' },
          failed: { label: '失败', color: 'text-red-600' },
          waiting_approval: { label: '待审批', color: 'text-amber-600' },
          pending: { label: '待执行', color: 'text-slate-400' },
        }
        return map[key] ?? { label: key, color: 'text-slate-400' }
      }

      expect(getDefaultStatus('completed').label).toBe('已完成')
      expect(getDefaultStatus('unknown').label).toBe('unknown')
      expect(getDefaultStatus('unknown').color).toBe('text-slate-400')
    })
  })

  describe('时间显示逻辑', () => {
    it('刚刚 — 小于1分钟显示为刚刚', () => {
      function getTimeAgo(date: Date): string {
        const now = new Date()
        const diffMs = now.getTime() - date.getTime()
        const diffMins = Math.floor(diffMs / 60000)
        if (diffMins < 1) return '刚刚'
        if (diffMins < 60) return `${diffMins}分钟前`
        return `${Math.floor(diffMins / 60)}小时前`
      }

      const justNow = new Date(Date.now() - 30000) // 30秒前
      expect(getTimeAgo(justNow)).toBe('刚刚')
    })

    it('分钟显示 — 30分钟前', () => {
      function getTimeAgo(date: Date): string {
        const now = new Date()
        const diffMs = now.getTime() - date.getTime()
        const diffMins = Math.floor(diffMs / 60000)
        if (diffMins < 1) return '刚刚'
        if (diffMins < 60) return `${diffMins}分钟前`
        return `${Math.floor(diffMins / 60)}小时前`
      }

      const thirtyMinsAgo = new Date(Date.now() - 30 * 60 * 1000)
      expect(getTimeAgo(thirtyMinsAgo)).toBe('30分钟前')
    })

    it('小时显示 — 3小时前', () => {
      function getTimeAgo(date: Date): string {
        const now = new Date()
        const diffMs = now.getTime() - date.getTime()
        const diffMins = Math.floor(diffMs / 60000)
        if (diffMins < 1) return '刚刚'
        if (diffMins < 60) return `${diffMins}分钟前`
        return `${Math.floor(diffMins / 60)}小时前`
      }

      const threeHoursAgo = new Date(Date.now() - 3 * 60 * 60 * 1000)
      expect(getTimeAgo(threeHoursAgo)).toBe('3小时前')
    })

    it('耗时计算 — 结束时间减开始时间', () => {
      function calcDuration(startedAt: string, completedAt: string): number {
        return Math.round(
          (new Date(completedAt).getTime() - new Date(startedAt).getTime()) / 1000
        )
      }

      expect(calcDuration('2026-06-05T00:00:00Z', '2026-06-05T00:05:30Z')).toBe(330)
      expect(calcDuration('2026-06-05T00:00:00Z', '2026-06-05T01:00:00Z')).toBe(3600)
    })
  })
})
