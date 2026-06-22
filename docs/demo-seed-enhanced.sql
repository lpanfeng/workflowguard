-- WorkflowGuard Enhanced Demo Seed Data
-- Day 33 — 2026-06-22
-- 为演示环境注入更丰富的数据，覆盖所有核心功能点

-- ============================
-- 1. 清理已有演示数据
-- ============================
DELETE FROM public.audit_logs WHERE user_id IN ('demo01', 'demo02', 'demo03');
DELETE FROM public.workflow_executions WHERE workflow_id LIKE 'demo-%';
DELETE FROM public.tasks WHERE workflow_id LIKE 'demo-%';
DELETE FROM public.workflows WHERE id LIKE 'demo-%';
DELETE FROM public.templates WHERE id LIKE 'demo-%';

-- ============================
-- 2. 演示用户（3个角色）
-- ============================
INSERT INTO public.profiles (id, email, name, role, plan) VALUES
  ('demo01', 'demo.ceo@example.com', '张总', 'admin', 'team'),
  ('demo02', 'demo.manager@example.com', '李经理', 'approver', 'pro'),
  ('demo03', 'demo.user@example.com', '小王', 'user', 'free');

-- ============================
-- 3. 5个工作流模板
-- ============================
INSERT INTO public.templates (id, slug, name, description, category, steps_json, is_public) VALUES
  ('demo-tpl-001', 'customer-service', '客服工单审批流', 'AI自动回复客户咨询，高风险内容转人工审批', 'customer_service', '[{"step":1,"type":"ai_reply","config":{"model":"deepseek","temperature":0.3}},{"step":2,"type":"risk_check","config":{"threshold":"medium"}},{"step":3,"type":"human_approve","config":{"approvers":["demo02"]}}]', true),
  ('demo-tpl-002', 'content-publish', '内容发布审批流', 'AI生成内容草稿，编辑审核后发布', 'content_management', '[{"step":1,"type":"ai_generate","config":{"model":"deepseek","template":"blog_post"}},{"step":2,"type":"human_review","config":{"approvers":["demo02"]}},{"step":3,"type":"publish","config":{"platform":"wechat"}}]', true),
  ('demo-tpl-003', 'data-entry', '发票数据录入审批', 'OCR识别发票，AI提取关键字段，人工复核', 'data_processing', '[{"step":1,"type":"ocr_extract","config":{"fields":["invoice_no","amount","date","vendor"]}},{"step":2,"type":"ai_validate","config":{"rules":["amount>0","date_in_future=false"]}},{"step":3,"type":"human_approve","config":{"approvers":["demo01"]}}]', true),
  ('demo-tpl-004', 'expense-approval', '费用报销审批', '员工提交报销申请，AI初审金额合理性，分级审批', 'finance', '[{"step":1,"type":"form_submit","config":{"fields":["amount","category","receipt"]}}},{"step":2,"type":"ai_check","config":{"rules":["amount<5000:auto_approve","amount>=5000:manager_approve","amount>=20000:ceo_approve"]}}},{"step":3,"type":"human_approve","config":{"approvers":["demo01"]}}]', true),
  ('demo-tpl-005', 'hr-onboarding', '新员工入职流程', 'HR发起入职流程，AI生成欢迎邮件和权限清单', 'hr_management', '[{"step":1,"type":"form_submit","config":{"fields":["name","department","position","start_date"]}}},{"step":2,"type":"ai_generate","config":{"outputs":["welcome_email","permission_list","training_plan"]}}},{"step":3,"type":"human_approve","config":{"approvers":["demo02"]}}]', true);

-- ============================
-- 4. 3个工作流实例
-- ============================
INSERT INTO public.workflows (id, user_id, template_id, name, description, config, is_active) VALUES
  ('demo-wf-001', 'demo01', 'demo-tpl-001', '客服工单自动审批', 'AI处理客户咨询，高风险转人工', '{"auto_reply_threshold":"medium","escalation_email":"support@example.com"}', true),
  ('demo-wf-002', 'demo01', 'demo-tpl-002', '技术博客发布流程', 'AI生成技术文章，编辑审核后发布', '{"target_platform":"wechat","style":"technical","word_count_min":1500}', true),
  ('demo-wf-003', 'demo02', 'demo-tpl-003', '月度发票录入', 'AI OCR识别发票并提取数据', '{"extract_fields":["invoice_no","amount","date","vendor"],"auto_reject_low_quality":true}', true);

-- ============================
-- 5. 10条模拟任务
-- ============================
INSERT INTO public.tasks (id, workflow_id, user_id, type, status, title, input_data, agent_result, agent_confidence, approved_result, approval_comment, started_at, completed_at) VALUES
  ('demo-task-001', 'demo-wf-001', 'demo03', 'customer_service', 'approved', '客户咨询 #001 — API调用限制', '{"query":"你们API每天能调用多少次？","customer_email":"visitor@example.com"}', '{"reply":"您好！我们的API调用限制：免费版100次/天，Pro版5000次/天，团队版无限制。","key_info":"用户咨询API调用限制","confidence":"high"}', 'high', '{"status":"approved","reply":"感谢咨询，请根据您的需求选择合适的套餐。"}', '回复准确，已批准', '2026-06-20T09:00:00Z', '2026-06-20T09:05:00Z'),
  ('demo-task-002', 'demo-wf-001', 'demo03', 'customer_service', 'rejected', '客户投诉 #002 — 服务中断', '{"query":"你们的服务昨天中断了3小时，怎么赔偿？","customer_email":"angry@company.com"}', '{"reply":"非常抱歉给您带来不便。关于赔偿事宜，需要转交专门团队处理。","key_info":"客户投诉服务中断","confidence":"low"}', 'low', '{"status":"rejected","reply":"请转交客户服务总监处理。"}', 'AI回复不够专业，转人工', '2026-06-20T10:00:00Z', '2026-06-20T10:15:00Z'),
  ('demo-task-003', 'demo-wf-002', 'demo01', 'content_publish', 'completed', 'AI Agent治理框架文章', '{"topic":"AI Agent治理框架","requirements":"面向技术管理者，2000字，包含实际案例"}', '{"article":"# AI Agent治理框架\n\n随着AI Agent在企业中的广泛应用，治理成为关键问题...\n\n## 1. 审批层设计\n\n...","word_count":2150,"tags":["AI","治理","Agent"]}', 'high', '{"status":"published","platform":"wechat","post_id":"wx_20260620_001"}', '发布成功，阅读量2340', '2026-06-20T14:00:00Z', '2026-06-20T14:30:00Z'),
  ('demo-task-004', 'demo-wf-002', 'demo01', 'content_publish', 'pending_approval', 'Q3技术趋势预测文章', '{"topic":"2026下半年AI技术趋势","requirements":"1500字，面向产品团队"}', '{"article":"# 2026下半年AI技术趋势预测\n\n1. Agent框架标准化...\n\n2. 多模态Agent普及...\n\n3. 边缘AI推理...\n\n4. AI治理合规化...","word_count":1680,"tags":["趋势","AI","2026"]}', 'medium', NULL, NULL, '2026-06-21T09:00:00Z', NULL),
  ('demo-task-005', 'demo-wf-003', 'demo02', 'data_entry', 'approved', '发票 #INV-2026-0501', '{"file_url":"https://example.com/invoices/0501.pdf","file_type":"pdf"}', '{"invoice_no":"INV-2026-0501","amount":3580.00,"date":"2026-05-15","vendor":"阿里云","category":"云计算"}', 'high', '{"invoice_no":"INV-2026-0501","amount":3580.00,"date":"2026-05-15","vendor":"阿里云","verified":true}', '数据核对无误', '2026-06-19T11:00:00Z', '2026-06-19T11:02:00Z'),
  ('demo-task-006', 'demo-wf-003', 'demo02', 'data_entry', 'approved', '发票 #INV-2026-0502', '{"file_url":"https://example.com/invoices/0502.pdf","file_type":"pdf"}', '{"invoice_no":"INV-2026-0502","amount":12800.00,"date":"2026-05-18","vendor":"腾讯云","category":"云计算"}', 'high', '{"invoice_no":"INV-2026-0502","amount":12800.00,"date":"2026-05-18","vendor":"腾讯云","verified":true}', '大额发票已核实', '2026-06-19T14:00:00Z', '2026-06-19T14:03:00Z'),
  ('demo-task-007', 'demo-wf-003', 'demo02', 'data_entry', 'rejected', '发票 #INV-2026-0503', '{"file_url":"https://example.com/invoices/0503.pdf","file_type":"pdf"}', '{"invoice_no":"INV-2026-0503","amount":50000.00,"date":"2026-05-20","vendor":"某某科技公司","category":"软件开发"}', 'low', NULL, NULL, '2026-06-20T09:00:00Z', NULL),
  ('demo-task-008', 'demo-wf-001', 'demo03', 'customer_service', 'processing', '客户询价 #003 — 团队版报价', '{"query":"你们团队版多少钱？我们有50个员工","customer_email":"procurement@bigcorp.com"}', '{"reply":"团队版价格根据人数阶梯定价...","key_info":"潜在客户询价","confidence":"medium"}', 'medium', NULL, NULL, '2026-06-21T16:00:00Z', NULL),
  ('demo-task-009', 'demo-wf-002', 'demo01', 'content_publish', 'completed', 'WorkflowGuard产品更新日志', '{"topic":"WorkflowGuard v1.2更新","requirements":"500字，面向现有用户"}', '{"article":"# WorkflowGuard v1.2 更新日志\n\n## 新功能\n- 执行历史追踪\n- 审批恢复执行\n- 审计日志增强\n\n## 修复\n- 超时重试优化\n- 移动端适配","word_count":520,"tags":["更新","产品"]}', 'high', '{"status":"published","platform":"wechat","post_id":"wx_20260621_002"}', '更新日志发布成功', '2026-06-21T10:00:00Z', '2026-06-21T10:10:00Z'),
  ('demo-task-010', 'demo-wf-003', 'demo02', 'data_entry', 'pending_approval', '发票 #INV-2026-0601', '{"file_url":"https://example.com/invoices/0601.pdf","file_type":"pdf"}', '{"invoice_no":"INV-2026-0601","amount":890.00,"date":"2026-06-10","vendor":"飞书","category":"办公协作"}', 'high', NULL, NULL, '2026-06-22T08:00:00Z', NULL);

-- ============================
-- 6. 25条审计日志
-- ============================
INSERT INTO public.audit_logs (id, user_id, task_id, workflow_id, action, details, created_at) VALUES
  ('audit-001', 'demo03', 'demo-task-001', 'demo-wf-001', 'task_created', '{"title":"客户咨询 #001","type":"customer_service"}', '2026-06-20T09:00:00Z'),
  ('audit-002', 'system', 'demo-task-001', 'demo-wf-001', 'ai_executed', '{"model":"deepseek-v3","confidence":"high","duration_ms":1200}', '2026-06-20T09:00:30Z'),
  ('audit-003', 'demo02', 'demo-task-001', 'demo-wf-001', 'task_approved', '{"comment":"回复准确，已批准","duration_from_creation_minutes":5}', '2026-06-20T09:05:00Z'),
  ('audit-004', 'demo03', 'demo-task-002', 'demo-wf-001', 'task_created', '{"title":"客户投诉 #002","type":"customer_service"}', '2026-06-20T10:00:00Z'),
  ('audit-005', 'system', 'demo-task-002', 'demo-wf-001', 'ai_executed', '{"model":"deepseek-v3","confidence":"low","flags":["complaint","escalation_needed"]}', '2026-06-20T10:00:15Z'),
  ('audit-006', 'demo02', 'demo-task-002', 'demo-wf-001', 'task_rejected', '{"comment":"AI回复不够专业，转人工","escalated_to":"demo01"}', '2026-06-20T10:15:00Z'),
  ('audit-007', 'demo01', NULL, 'demo-wf-002', 'workflow_started', '{"template":"content_publish","auto_run":false}', '2026-06-20T14:00:00Z'),
  ('audit-008', 'system', 'demo-task-003', 'demo-wf-002', 'ai_executed', '{"model":"deepseek-v3","output_type":"article","word_count":2150}', '2026-06-20T14:02:00Z'),
  ('audit-009', 'demo02', 'demo-task-003', 'demo-wf-002', 'task_approved', '{"comment":"发布成功，阅读量2340"}', '2026-06-20T14:30:00Z'),
  ('audit-010', 'demo02', 'demo-task-005', 'demo-wf-003', 'task_created', '{"title":"发票 #INV-2026-0501","amount":3580}', '2026-06-19T11:00:00Z'),
  ('audit-011', 'system', 'demo-task-005', 'demo-wf-003', 'ai_executed', '{"model":"deepseek-v3","ocr_confidence":"high","extracted_fields":["invoice_no","amount","date","vendor"]}', '2026-06-19T11:00:10Z'),
  ('audit-012', 'demo02', 'demo-task-005', 'demo-wf-003', 'task_approved', '{"comment":"数据核对无误"}', '2026-06-19T11:02:00Z'),
  ('audit-013', 'demo02', 'demo-task-006', 'demo-wf-003', 'task_created', '{"title":"发票 #INV-2026-0502","amount":12800}', '2026-06-19T14:00:00Z'),
  ('audit-014', 'system', 'demo-task-006', 'demo-wf-003', 'ai_executed', '{"model":"deepseek-v3","flag":"large_amount","requires_extra_verification":true}', '2026-06-19T14:00:20Z'),
  ('audit-015', 'demo02', 'demo-task-006', 'demo-wf-003', 'task_approved', '{"comment":"大额发票已核实","extra_step":"phone_verification"}', '2026-06-19T14:03:00Z'),
  ('audit-016', 'demo02', 'demo-task-007', 'demo-wf-003', 'task_created', '{"title":"发票 #INV-2026-0503","amount":50000}', '2026-06-20T09:00:00Z'),
  ('audit-017', 'system', 'demo-task-007', 'demo-wf-003', 'ai_executed', '{"model":"deepseek-v3","flag":"amount_exceeds_threshold","suggested_action":"manual_review"}', '2026-06-20T09:00:30Z'),
  ('audit-018', 'demo01', 'demo-task-007', 'demo-wf-003', 'task_rejected', '{"comment":"5万元发票需CEO亲自审批","escalated_to":"demo01"}', '2026-06-20T09:30:00Z'),
  ('audit-019', 'demo01', NULL, 'demo-wf-003', 'workflow_paused', '{"reason":"发票验证异常，暂停自动处理"}', '2026-06-20T10:00:00Z'),
  ('audit-020', 'demo01', NULL, 'demo-wf-003', 'workflow_resumed', '{"reason":"异常已处理，恢复自动审批"}', '2026-06-20T14:00:00Z'),
  ('audit-021', 'demo02', 'demo-task-009', 'demo-wf-002', 'task_created', '{"title":"WorkflowGuard v1.2更新日志"}', '2026-06-21T10:00:00Z'),
  ('audit-022', 'system', 'demo-task-009', 'demo-wf-002', 'ai_executed', '{"model":"deepseek-v3","output_type":"changelog","word_count":520}', '2026-06-21T10:01:00Z'),
  ('audit-023', 'demo02', 'demo-task-009', 'demo-wf-002', 'task_approved', '{"comment":"更新日志发布成功"}', '2026-06-21T10:10:00Z'),
  ('audit-024', 'demo01', NULL, 'demo-wf-001', 'workflow_config_updated', '{"changes":["auto_reply_threshold:high→medium","escalation_email:added"]}', '2026-06-21T15:00:00Z'),
  ('audit-025', 'demo02', 'demo-task-010', 'demo-wf-003', 'task_created', '{"title":"发票 #INV-2026-0601","amount":890}', '2026-06-22T08:00:00Z');

-- ============================
-- 7. 执行历史记录
-- ============================
INSERT INTO public.workflow_executions (id, workflow_id, task_id, status, duration_ms, retry_count, error_message, created_at) VALUES
  ('exec-001', 'demo-wf-001', 'demo-task-001', 'success', 1200, 0, NULL, '2026-06-20T09:00:30Z'),
  ('exec-002', 'demo-wf-001', 'demo-task-002', 'success', 1500, 0, NULL, '2026-06-20T10:00:15Z'),
  ('exec-003', 'demo-wf-002', 'demo-task-003', 'success', 3000, 0, NULL, '2026-06-20T14:02:00Z'),
  ('exec-004', 'demo-wf-003', 'demo-task-005', 'success', 800, 0, NULL, '2026-06-19T11:00:10Z'),
  ('exec-005', 'demo-wf-003', 'demo-task-006', 'success', 1000, 0, NULL, '2026-06-19T14:00:20Z'),
  ('exec-006', 'demo-wf-003', 'demo-task-007', 'success', 900, 0, NULL, '2026-06-20T09:00:30Z'),
  ('exec-007', 'demo-wf-002', 'demo-task-009', 'success', 2500, 0, NULL, '2026-06-21T10:01:00Z'),
  ('exec-008', 'demo-wf-003', 'demo-task-010', 'pending', NULL, 0, NULL, '2026-06-22T08:00:00Z');

-- ============================
-- 完成！
-- 数据统计：3用户 × 3工作流 × 10任务 × 25审计日志 × 8执行记录
-- ============================
