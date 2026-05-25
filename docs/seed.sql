-- WorkflowGuard 种子数据
-- 用于开发和演示环境的测试数据

-- 清理已有数据（按依赖顺序）
DELETE FROM public.audit_logs;
DELETE FROM public.tasks;
DELETE FROM public.workflows;
DELETE FROM public.profiles WHERE email LIKE 'demo%@example.com';

-- 1. 创建演示用户
INSERT INTO public.profiles (id, email, name, role, plan, workflow_quota, approval_quota, approval_used)
VALUES 
  ('00000000-0000-0000-0000-000000000001', 'demo@example.com', '演示用户', 'user', 'pro', 20, 200, 5),
  ('00000000-0000-0000-0000-000000000002', 'admin@example.com', '管理员', 'admin', 'team', 100, 1000, 0);

-- 2. 创建测试工作流
INSERT INTO public.workflows (id, user_id, template_id, name, description, config, is_active)
VALUES 
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'customer-service', '客户咨询处理', '处理客户通过表单提交的咨询', '{"auto_reply_threshold": "high", "notify_email": true}', true),
  ('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'content-publish', '博客文章发布', 'AI 辅助撰写技术博客', '{"target_platform": "blog", "style": "technical"}', true),
  ('10000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', 'data-entry', '发票数据录入', '从上传的发票图片提取数据', '{"extract_fields": ["invoice_no", "amount", "date", "vendor"]}', false);

-- 3. 创建测试任务
INSERT INTO public.tasks (id, workflow_id, user_id, type, status, title, input_data, agent_result, agent_confidence, approved_result, approval_comment, started_at, completed_at)
VALUES 
  ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'customer_service', 'waiting_approval', '客户咨询 #20240522-001', '{"query": "你好，我想问一下你们的API调用限制是多少？每天可以请求多少次？", "customer_email": "customer@example.com"}', '{"reply": "您好！感谢您的咨询。我们的API调用限制取决于您的套餐：免费版每天100次，Pro版每天5000次，团队版无限制。请问您目前使用的是哪种套餐？", "key_info": "用户咨询API调用限制", "confidence": "high"}', 'high', NULL, NULL, '2026-05-22T09:00:00Z', NULL),

  ('20000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'content_publish', 'ai_processing', 'AI Agent 工作流入门指南', '{"topic": "AI Agent 工作流入门", "requirements": "面向技术管理者，2000字左右，包含实际案例"}', NULL, NULL, NULL, NULL, NULL, NULL),

  ('20000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', 'data_entry', 'completed', '发票 #INV-2024-8892', '{"file_url": "https://example.com/invoices/2024-8892.pdf", "file_type": "pdf"}', '{"invoice_no": "INV-2024-8892", "amount": 12800.00, "date": "2024-12-15", "vendor": "腾讯云计算有限公司"}', 'high', '{"invoice_no": "INV-2024-8892", "amount": 12800.00, "date": "2024-12-15", "vendor": "腾讯云计算有限公司"}', '数据无误，确认', '2026-05-22T08:00:00Z', '2026-05-22T08:05:00Z');

-- 4. 创建审计日志
INSERT INTO public.audit_logs (user_id, task_id, workflow_id, action, details)
VALUES 
  ('00000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'task_created', '{"title": "客户咨询 #20240522-001"}'),
  ('00000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'ai_executed', '{"confidence": "high"}'),
  ('00000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000003', 'task_approved', '{"comment": "数据无误，确认"}');
