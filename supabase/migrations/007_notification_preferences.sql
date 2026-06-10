-- WorkflowGuard — 迁移 007: 通知偏好 + 邮件通知日志
-- 支持邮件通知设置和通知发送记录

-- =====================
-- 1. 通知偏好表
-- =====================
CREATE TABLE IF NOT EXISTS public.notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  email_notifications BOOLEAN NOT NULL DEFAULT true,
  email_on_approval_needed BOOLEAN NOT NULL DEFAULT true,
  email_on_approved BOOLEAN NOT NULL DEFAULT true,
  email_on_rejected BOOLEAN NOT NULL DEFAULT true,
  email_on_completed BOOLEAN NOT NULL DEFAULT false,
  digest_enabled BOOLEAN NOT NULL DEFAULT false,
  digest_frequency TEXT NOT NULL DEFAULT 'daily' CHECK (digest_frequency IN ('daily', 'weekly', 'never')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id)
);

CREATE INDEX idx_notification_prefs_user_id ON public.notification_preferences(user_id);

ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notification prefs"
  ON public.notification_preferences FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own notification prefs"
  ON public.notification_preferences FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own notification prefs"
  ON public.notification_preferences FOR UPDATE
  USING (auth.uid() = user_id);

-- =====================
-- 2. 通知发送记录表
-- =====================
CREATE TABLE IF NOT EXISTS public.notification_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  task_id UUID REFERENCES public.tasks(id) ON DELETE SET NULL,
  type TEXT NOT NULL CHECK (type IN ('email', 'webhook', 'feishu')),
  event TEXT NOT NULL CHECK (event IN ('approval_needed', 'approved', 'rejected', 'completed', 'task_created')),
  recipient TEXT NOT NULL,
  subject TEXT,
  status TEXT NOT NULL DEFAULT 'sent' CHECK (status IN ('sent', 'failed', 'pending')),
  error_message TEXT,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notification_logs_user_id ON public.notification_logs(user_id);
CREATE INDEX idx_notification_logs_task_id ON public.notification_logs(task_id);
CREATE INDEX idx_notification_logs_sent_at ON public.notification_logs(sent_at DESC);

ALTER TABLE public.notification_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notification logs"
  ON public.notification_logs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "System can insert notification logs"
  ON public.notification_logs FOR INSERT
  WITH CHECK (true);

-- =====================
-- 3. 自动创建通知偏好（用户注册时）
-- =====================
CREATE OR REPLACE FUNCTION public.handle_new_user_notification_prefs()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.notification_preferences (user_id)
  VALUES (NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 只在触发器不存在时添加
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'on_auth_user_created_notification_prefs') THEN
    CREATE TRIGGER on_auth_user_created_notification_prefs
      AFTER INSERT ON public.profiles
      FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_notification_prefs();
  END IF;
END $$;

-- =====================
-- 4. 额外: profiles 添加 email_verified 字段
-- =====================
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email_verified BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS notification_email TEXT;
