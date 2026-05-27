-- WorkflowGuard — 飞书 Bot 绑定支持

-- 为 profiles 表添加 feishu_open_id 字段
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS feishu_open_id TEXT UNIQUE;

-- 为 feishu_open_id 创建索引（方便飞书 open_id 查用户）
CREATE INDEX IF NOT EXISTS idx_profiles_feishu_open_id 
ON public.profiles(feishu_open_id) 
WHERE feishu_open_id IS NOT NULL;

-- 通过 feishu_open_id 查找用户的函数
CREATE OR REPLACE FUNCTION public.get_user_by_feishu_open_id(feishu_id TEXT)
RETURNS TABLE(id UUID, name TEXT, email TEXT, role TEXT) AS $$
BEGIN
  RETURN QUERY
  SELECT p.id, p.name, p.email, p.role::TEXT
  FROM public.profiles p
  WHERE p.feishu_open_id = feishu_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
