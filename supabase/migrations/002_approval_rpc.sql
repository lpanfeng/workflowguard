-- WorkflowGuard — 配额与辅助函数

-- 增加审批使用量
CREATE OR REPLACE FUNCTION public.increment_approval_used(user_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE public.profiles
  SET approval_used = approval_used + 1
  WHERE id = user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 检查额度是否足够（含自动月重置逻辑）
CREATE OR REPLACE FUNCTION public.check_approval_quota(user_id UUID)
RETURNS TABLE(allowed BOOLEAN, remaining INTEGER) AS $$
DECLARE
  p public.profiles%ROWTYPE;
BEGIN
  SELECT * INTO p FROM public.profiles WHERE id = user_id;

  -- 如果重置日期已过，重置用量
  IF p.reset_date < CURRENT_DATE THEN
    UPDATE public.profiles
    SET approval_used = 0,
        reset_date = 
          CASE 
            WHEN EXTRACT(DAY FROM p.reset_date) = EXTRACT(DAY FROM CURRENT_DATE) 
            THEN p.reset_date + INTERVAL '1 month'
            ELSE DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month'
          END
    WHERE id = user_id;
    p.approval_used := 0;
  END IF;

  RETURN QUERY
  SELECT 
    p.approval_used < p.approval_quota AS allowed,
    p.approval_quota - p.approval_used AS remaining;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
