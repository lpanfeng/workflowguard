-- WorkflowGuard — 迁移 005: Onboarding 支持
-- 添加 has_onboarded 标记到 profiles 表

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS has_onboarded BOOLEAN NOT NULL DEFAULT false;

-- 更新注册自动创建 profile 的函数，默认 has_onboarded = false
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name, has_onboarded)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    false
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
