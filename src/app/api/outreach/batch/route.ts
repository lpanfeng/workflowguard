import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

/**
 * POST /api/outreach/batch
 * 批量发送outreach邮件（按优先级分段）
 * Body: { priorities: ['high', 'medium', 'low'], note?: string }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { priorities = ['high'], note } = body;

    const validPriorities = ['high', 'medium', 'low'];
    const selectedPriorities = priorities.filter((p: string) => validPriorities.includes(p));

    if (selectedPriorities.length === 0) {
      return NextResponse.json({ error: '至少需要一个优先级' }, { status: 400 });
    }

    const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const { sendEmail } = await import('@/lib/email');

    const { data: entries, error } = await supabaseAdmin
      .from('waitlists')
      .select('id, email, name, company, role, workflow_purpose, priority, source, created_at')
      .in('priority', selectedPriorities)
      .eq('status', 'pending')
      .limit(200);

    if (error) {
      return NextResponse.json({ error: '查询失败' }, { status: 500 });
    }

    if (!entries || entries.length === 0) {
      return NextResponse.json({ sent: 0, message: '没有符合条件的用户' });
    }

    const results = { sent: 0, skipped: 0, failed: 0, details: [] as any[] };

    for (const entry of entries) {
      const name = entry.name || '朋友';
      const companyInfo = entry.company ? `来自 ${entry.company}` : '';
      const purposeInfo = entry.workflow_purpose
        ? getPurposeLabel(entry.workflow_purpose)
        : '';

      const subject = `WorkflowGuard 邀请：${name}，您的专属体验通道已开启`;

      const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 24px; max-width: 600px; margin: 0 auto;">
  <h1 style="font-size: 20px; color: #1a1a2e; margin: 0 0 16px;">👋 你好，${name}!</h1>
  <p style="font-size: 15px; color: #333; line-height: 1.7; margin: 0 0 16px;">
    你是WorkflowGuard的<strong>种子用户</strong>。我们帮助企业实现<strong>人机协作工作流</strong>——AI执行+人工审批+完整审计追踪。
  </p>
  ${purposeInfo ? `<p style="background:#f0f9ff;padding:12px;border-radius:8px;border-left:3px solid #0ea5e9;font-size:14px;margin:0 0 16px;"><strong>针对你的场景：</strong>${purposeInfo}</p>` : ''}
  <div style="background:#fafafa;border-radius:8px;padding:20px;margin-bottom:20px;">
    <h2 style="font-size:16px;color:#1a1a2e;margin:0 0 12px;">🔒 核心能力</h2>
    <ul style="margin:0;padding-left:20px;color:#444;font-size:14px;line-height:1.8;">
      <li><strong>AI自动执行</strong> — 基于大模型的智能工作流引擎</li>
      <li><strong>人工审批关卡</strong> — 关键节点必须人类确认</li>
      <li><strong>完整审计追踪</strong> — 每次AI调用可追溯</li>
      <li><strong>飞书深度集成</strong> — 审批通知、协作无缝对接</li>
      <li><strong>多模型路由</strong> — 按场景智能选择最优模型</li>
    </ul>
  </div>
  <div style="text-align:center;margin:24px 0;">
    <a href="${APP_URL}/waitlist" style="display:inline-block;background:#2563eb;color:white;text-decoration:none;padding:14px 32px;border-radius:8px;font-size:16px;font-weight:500;">立即体验 →</a>
  </div>
  <p style="color:#888;font-size:12px;line-height:1.6;margin-top:24px;">
    WorkflowGuard 团队 · 人机协作工作流平台
  </p>
</body>
</html>`;

      const result = await sendEmail({ to: entry.email, subject, html });

      if (result.success) {
        await supabaseAdmin
          .from('waitlists')
          .update({
            status: 'outreach_sent',
            outreach_sent_at: new Date().toISOString(),
          })
          .eq('id', entry.id);
        results.sent++;
        results.details.push({ email: entry.email, name: entry.name, status: 'sent' });
      } else {
        results.failed++;
        results.details.push({ email: entry.email, name: entry.name, status: 'failed', error: result.error });
      }

      await new Promise(r => setTimeout(r, 1000));
    }

    return NextResponse.json(results);
  } catch (error) {
    console.error('[Outreach Batch] Error:', error);
    return NextResponse.json({ error: '服务器内部错误' }, { status: 500 });
  }
}

function getPurposeLabel(purpose: string): string {
  const map: Record<string, string> = {
    customer_service: '客服工单审批 — AI自动分类+人工审批',
    content_publish: '内容发布流程 — AI生成+人工审核发布',
    data_entry: '数据录入校验 — AI自动校验+异常处理',
    expense_approval: '费用报销审批 — AI初筛+多级审批',
    code_review: '代码审查辅助 — AI预审+人工确认',
    other: '自定义工作流场景',
  };
  return map[purpose] || purpose;
}
