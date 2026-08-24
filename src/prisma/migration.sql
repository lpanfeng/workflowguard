-- WorkflowGuard — 最终版迁移脚本 v1.0
-- 包含完整的审计、RLS、自动触发器和辅助函数

-- =====================
-- 0. 启用扩展
-- =====================
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =====================
-- 1. 用户表 (profiles)
-- =====================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  avatar_url TEXT,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  plan TEXT NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'basic', 'pro', 'team')),
  workflow_quota INTEGER NOT NULL DEFAULT 2,
  approval_quota INTEGER NOT NULL DEFAULT 20,
  approval_used INTEGER NOT NULL DEFAULT 0,
  reset_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 用户注册时自动创建 profile
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =====================
-- 2. 工作流表 (workflows)
-- =====================
CREATE TABLE public.workflows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  template_id TEXT NOT NULL, -- 'customer-service' | 'content-publish' | 'data-entry'
  name TEXT NOT NULL,
  description TEXT,
  config JSONB DEFAULT '{}'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_workflows_user_id ON public.workflows(user_id);
CREATE INDEX idx_workflows_active ON public.workflows(is_active) WHERE is_active = true;

-- =====================
-- 3. 任务表 (tasks)
-- =====================
DO $$ BEGIN
  CREATE TYPE task_status AS ENUM (
    'pending',
    'ai_processing',
    'waiting_approval',
    'approved',
    'rejected',
    'completed',
    'failed'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE task_type AS ENUM (
    'customer_service',
    'content_publish',
    'data_entry'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS public.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID NOT NULL REFERENCES public.workflows(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type task_type NOT NULL,
  status task_status NOT NULL DEFAULT 'pending',
  title TEXT NOT NULL,
  input_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  agent_result JSONB DEFAULT NULL,
  agent_confidence TEXT CHECK (agent_confidence IN ('high', 'medium', 'low')),
  approved_result JSONB DEFAULT NULL,
  approval_comment TEXT,
  approved_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON public.tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_workflow_id ON public.tasks(workflow_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON public.tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_created_at ON public.tasks(created_at DESC);

-- =====================
-- 4. 审计日志表 (audit_logs)
-- =====================
DO $$ BEGIN
  CREATE TYPE audit_action AS ENUM (
    'task_created',
    'ai_executed',
    'ai_failed',
    'task_approved',
    'task_rejected',
    'task_modified',
    'task_completed',
    'workflow_created',
    'workflow_updated',
    'workflow_deactivated',
    'user_login',
    'user_plan_changed'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  task_id UUID REFERENCES public.tasks(id) ON DELETE SET NULL,
  workflow_id UUID REFERENCES public.workflows(id) ON DELETE SET NULL,
  action audit_action NOT NULL,
  details JSONB DEFAULT '{}'::jsonb,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON public.audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_task_id ON public.audit_logs(task_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at DESC);

-- =====================
-- 5. 配额余量表 (plan_limits)
-- 供 API 查询当前用户的配额使用情况
-- =====================
CREATE TABLE IF NOT EXISTS public.plan_limits (
  plan TEXT PRIMARY KEY CHECK (plan IN ('free', 'basic', 'pro', 'team')),
  price_monthly INTEGER NOT NULL, -- 月费（分）
  max_workflows INTEGER NOT NULL, -- 最大工作流数
  max_approvals INTEGER NOT NULL, -- 月审批次数
  max_ai_calls INTEGER NOT NULL,  -- 月 AI 调用次数
  features TEXT[] NOT NULL DEFAULT '{}', -- 功能列表
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 默认套餐配置
INSERT INTO public.plan_limits (plan, price_monthly, max_workflows, max_approvals, max_ai_calls, features)
VALUES
  ('free',  0,     2,   20,   100,  ARRAY['3个预设工作流模板', '基础审计日志', '邮件通知']),
  ('basic', 2900,  5,   100,  500,  ARRAY['所有模板', 'GitHub OAuth', '自定义工作流名称', '邮件+Webhook通知']),
  ('pro',   6900,  20,  500,  3000, ARRAY['自定义工作流模板', '多模型选择(OpenAI/Claude)', '批量任务处理', 'API 访问', '7天审计历史']),
  ('team',  19900, 100, 5000, 50000,ARRAY['团队协作', '自定义审批链', '企业 SSO', '高级审计-30天', '专有模型部署', '优先支持'])
ON CONFLICT (plan) DO NOTHING;

-- =====================
-- RLS (Row Level Security)
-- =====================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plan_limits ENABLE ROW LEVEL SECURITY;

-- Profiles
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Plan limits: everyone can read (used for displaying plan info)
CREATE POLICY "Anyone can view plan limits"
  ON public.plan_limits FOR SELECT
  TO authenticated
  USING (true);

-- Workflows
CREATE POLICY "Users can view own workflows"
  ON public.workflows FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create workflows"
  ON public.workflows FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own workflows"
  ON public.workflows FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own workflows"
  ON public.workflows FOR DELETE
  USING (auth.uid() = user_id);

-- Tasks
CREATE POLICY "Users can view own tasks"
  ON public.tasks FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create tasks"
  ON public.tasks FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own tasks"
  ON public.tasks FOR UPDATE
  USING (auth.uid() = user_id);

-- Audit Logs
CREATE POLICY "Users can view own audit logs"
  ON public.audit_logs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Insert audit logs"
  ON public.audit_logs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- =====================
-- 实用函数与触发器
-- =====================

-- 自动更新 updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 为各表添加 updated_at 触发器
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'profiles_updated_at') THEN
    CREATE TRIGGER profiles_updated_at
      BEFORE UPDATE ON public.profiles
      FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'workflows_updated_at') THEN
    CREATE TRIGGER workflows_updated_at
      BEFORE UPDATE ON public.workflows
      FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'tasks_updated_at') THEN
    CREATE TRIGGER tasks_updated_at
      BEFORE UPDATE ON public.tasks
      FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
  END IF;
END $$;

-- 创建审计日志辅助函数
CREATE OR REPLACE FUNCTION public.create_audit_log(
  p_user_id UUID,
  p_action audit_action,
  p_task_id UUID DEFAULT NULL,
  p_workflow_id UUID DEFAULT NULL,
  p_details JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID AS $$
DECLARE
  log_id UUID;
BEGIN
  INSERT INTO public.audit_logs (user_id, action, task_id, workflow_id, details)
  VALUES (p_user_id, p_action, p_task_id, p_workflow_id, p_details)
  RETURNING id INTO log_id;
  RETURN log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 检查用户配额
CREATE OR REPLACE FUNCTION public.check_user_quota(
  p_user_id UUID,
  p_resource TEXT -- 'workflow' | 'approval'
)
RETURNS JSONB AS $$
DECLARE
  profile_rec RECORD;
  limit_rec RECORD;
  result JSONB;
BEGIN
  SELECT * INTO profile_rec FROM public.profiles WHERE id = p_user_id;
  SELECT * INTO limit_rec FROM public.plan_limits WHERE plan = profile_rec.plan;
  
  IF p_resource = 'workflow' THEN
    result := jsonb_build_object(
      'allowed', profile_rec.workflow_quota > 0,
      'remaining', profile_rec.workflow_quota,
      'plan', profile_rec.plan,
      'max', limit_rec.max_workflows
    );
  ELSIF p_resource = 'approval' THEN
    result := jsonb_build_object(
      'allowed', (profile_rec.approval_quota - profile_rec.approval_used) > 0,
      'remaining', profile_rec.approval_quota - profile_rec.approval_used,
      'used', profile_rec.approval_used,
      'plan', profile_rec.plan,
      'max', limit_rec.max_approvals
    );
  END IF;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================
-- 4. 工作流执行表 (workflow_executions)
-- =====================
DO $$ BEGIN
  CREATE TYPE execution_status AS ENUM (
    'idle', 'triggered', 'running', 'step_in_progress',
    'step_completed', 'waiting_approval', 'approved',
    'retrying', 'completed', 'failed', 'cancelled',
    'timed_out', 'paused'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS public.workflow_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID NOT NULL REFERENCES public.workflows(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  trigger_type TEXT NOT NULL DEFAULT 'manual',
  trigger_config JSONB DEFAULT '{}'::jsonb,
  status execution_status NOT NULL DEFAULT 'triggered',
  current_step_index INTEGER NOT NULL DEFAULT 0,
  steps JSONB NOT NULL DEFAULT '[]'::jsonb,
  input_data JSONB DEFAULT '{}'::jsonb,
  output_data JSONB DEFAULT '{}'::jsonb,
  error TEXT,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_workflow_executions_workflow_id ON public.workflow_executions(workflow_id);
CREATE INDEX idx_workflow_executions_user_id ON public.workflow_executions(user_id);
CREATE INDEX idx_workflow_executions_status ON public.workflow_executions(status) WHERE status NOT IN ('completed', 'failed', 'cancelled');

-- 执行记录 updated_at 触发器
CREATE TRIGGER workflow_executions_updated_at
  BEFORE UPDATE ON public.workflow_executions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- 执行完成时自动设置 completed_at
CREATE OR REPLACE FUNCTION public.set_execution_completed_at()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status IN ('completed', 'failed', 'cancelled', 'timed_out')
     AND OLD.status NOT IN ('completed', 'failed', 'cancelled', 'timed_out') THEN
    NEW.completed_at = NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER execution_completed_at_trigger
  BEFORE UPDATE ON public.workflow_executions
  FOR EACH ROW EXECUTE FUNCTION public.set_execution_completed_at();
