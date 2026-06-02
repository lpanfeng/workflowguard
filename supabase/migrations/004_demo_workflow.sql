-- WorkflowGuard — 新用户注册时自动创建演示工作流
-- 在 handle_new_user 触发器中额外插入一个客服工单审批流 Demo

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- 创建用户 profile
  INSERT INTO public.profiles (id, email, name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email)
  );

  -- 创建演示工作流（客服工单审批流）
  INSERT INTO public.workflows (
    user_id,
    template_id,
    name,
    description,
    config,
    is_active
  ) VALUES (
    NEW.id,
    'customer-service',
    '📋 客服工单审批流 · 演示',
    '自动创建的演示工作流 — AI 生成回复草稿 → 人工审核 → 发送。点击查看详情并尝试运行。',
    '{
      "trigger": "manual",
      "steps": [
        {"id": "input", "name": "接收咨询", "type": "action"},
        {"id": "ai_draft", "name": "AI 生成回复", "type": "ai_execute"},
        {"id": "approve", "name": "人工审核", "type": "human_approve"},
        {"id": "send", "name": "发送回复", "type": "action"}
      ],
      "approvalConfig": {
        "approve": {
          "levels": 1,
          "approvers": [{"type": "role", "role": "manager", "label": "客服主管"}],
          "mode": "sequential",
          "rejectStrategy": "reject_all"
        }
      }
    }'::jsonb,
    true
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
