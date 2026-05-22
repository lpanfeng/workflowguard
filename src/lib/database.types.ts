// WorkflowGuard — 数据库类型定义（TypeScript）
// 与 migration.sql 保持同步

export type Plan = 'free' | 'basic' | 'pro' | 'team'
export type Role = 'user' | 'admin'
export type TaskStatus =
  | 'pending'
  | 'ai_processing'
  | 'waiting_approval'
  | 'approved'
  | 'rejected'
  | 'completed'
  | 'failed'
export type TaskType = 'customer_service' | 'content_publish' | 'data_entry'
export type AuditAction =
  | 'task_created'
  | 'ai_executed'
  | 'ai_failed'
  | 'task_approved'
  | 'task_rejected'
  | 'task_modified'
  | 'task_completed'
  | 'workflow_created'
  | 'workflow_updated'
  | 'workflow_deactivated'
  | 'user_login'
  | 'user_plan_changed'

export interface Profile {
  id: string
  email: string
  name: string | null
  avatar_url: string | null
  role: Role
  plan: Plan
  workflow_quota: number
  approval_quota: number
  approval_used: number
  reset_date: string
  created_at: string
  updated_at: string
}

export interface Workflow {
  id: string
  user_id: string
  template_id: string
  name: string
  description: string | null
  config: Record<string, unknown>
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Task {
  id: string
  workflow_id: string
  user_id: string
  type: TaskType
  status: TaskStatus
  title: string
  input_data: Record<string, unknown>
  agent_result: Record<string, unknown> | null
  agent_confidence: string | null
  approved_result: Record<string, unknown> | null
  approval_comment: string | null
  approved_at: string | null
  started_at: string | null
  completed_at: string | null
  error_message: string | null
  created_at: string
  updated_at: string
}

export interface AuditLog {
  id: string
  user_id: string
  task_id: string | null
  workflow_id: string | null
  action: AuditAction
  details: Record<string, unknown>
  ip_address: string | null
  user_agent: string | null
  created_at: string
}
