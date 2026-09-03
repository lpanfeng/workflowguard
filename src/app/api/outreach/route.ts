import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { sendEmail } from '@/lib/email';

/**
 * POST /api/outreach
 * 发送种子用户outreach邮件
 * Body: { priority: 'high'|'medium'|'low', note?: string }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { priority, note } = body;

    if (!priority || !['high', 'medium', 'low'].includes(priority)) {
      return NextResponse.json(
        { error: 'priority 参数必填，值为 high/medium/low' },
        { status: 400 }
      );
    }

    // Fetch waitlist entries by priority
    const query = supabaseAdmin
      .from('waitlists')
      .select('id, email, name, company, role, workflow_purpose, priority, source, created_at')
      .eq('status', 'pending')
      .eq('priority', priority)
      .limit(100);

    const { data: entries, error } = await query;

    if (error) {
      console.error('[Outreach] DB Error:', error);
      return NextResponse.json({ error: '查询用户失败' }, { status: 500 });
    }

    if (!entries || entries.length === 0) {
      return NextResponse.json({ sent: 0, skipped: 0, error: '没有待发送的用户' });
    }

    const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const results = { sent: 0, skipped: 0, failed: 0, details: [] as any[] };

    for (const entry of entries) {
      const name = entry.name || '朋友';
      const companyInfo = entry.company ? `来自 ${entry.company}` : '';
      const roleInfo = entry.role ? `作为 ${entry.role}` : '';
      const purposeInfo = entry.workflow_purpose
        ? getPurposeGreeting(entry.workflow_purpose)
        : '';

      const subject = `WorkflowGuard 邀请：${name}${companyInfo ? ' · ' + companyInfo : ''}，专属体验通道已开启`;

      const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 24px; max-width: 600px; margin: 0 auto;">
  <div style="margin-bottom: 24px;">
    <h1 style="font-size: 20px; color: #1a1a2e; margin: 0;">👋 你好，${name}!</h1>
  </div>

  <p style="font-size: 15px; color: #333; line-height: 1.7; margin: 0 0 16px;">
    你是WorkflowGuard的<strong>种子用户</strong>。我们专注于帮助企业实现<strong>人机协作工作流</strong>——AI执行+人工审批+完整审计追踪。
  </p>

  ${purposeInfo ? `
  <div style="background: #f0f9ff; border-radius: 8px; padding: 16px; margin-bottom: 16px; border-left: 3px solid #0ea5e9;">
    <p style="margin: 0; font-size: 14px; color: #0c4a6e;">
      <strong>根据你的需求：</strong>${purposeInfo}
    </p>
  </div>
  ` : ''}

  <div style="background: #fafafa; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
    <h2 style="font-size: 16px; color: #1a1a2e; margin: 0 0 12px;">🔒 WorkflowGuard 核心能力</h2>
    <ul style="margin: 0; padding-left: 20px; color: #444; font-size: 14px; line-height: 1.8;">
      <li><strong>AI自动执行</strong> — 基于大模型的智能工作流引擎</li>
      <li><strong>人工审批关卡</strong> — 关键节点必须人类确认</li>
      <li><strong>完整审计追踪</strong> — 每次AI调用可追溯</li>
      <li><strong>飞书深度集成</strong> — 审批通知、协作无缝对接</li>
      <li><strong>多模型路由</strong> — 按场景智能选择最优模型</li>
    </ul>
  </div>

  ${note ? `
  <div style="background: #fefce8; border-radius: 8px; padding: 16px; margin-bottom: 20px; border-left: 3px solid #f59e0b;">
    <p style="margin: 0; font-size: 14px; color: #92400e;">
      <strong>💡 个性化备注：</strong>${note}
    </p>
  </div>
  ` : ''}

  <div style="text-align: center; margin: 24px 0;">
    <a href="${APP_URL}/waitlist/verify" style="display: inline-block; background: #2563eb; color: white; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-size: 16px; font-weight: 500;">
      立即体验 WorkflowGuard →
    </a>
  </div>

  <p style="color: #888; font-size: 12px; line-height: 1.6; margin-top: 24px;">
    如果你有特别想实现的工作流场景，直接回复这封邮件告诉我们。<br>
    WorkflowGuard 团队 · 人机协作工作流平台
  </p>
</body>
</html>`;

      const result = await sendEmail({ to: entry.email, subject, html });

      if (result.success) {
        // Update status to 'outreach_sent'
        await supabaseAdmin
          .from('waitlists')
          .update({ status: 'outreach_sent', outreach_sent_at: new Date().toISOString() })
          .eq('id', entry.id);

        results.sent++;
        results.details.push({ email: entry.email, name: entry.name, status: 'sent' });
      } else {
        results.failed++;
        results.details.push({ email: entry.email, name: entry.name, status: 'failed', error: result.error });
      }

      // Rate limit: 1 email per second
      await new Promise(r => setTimeout(r, 1000));
    }

    return NextResponse.json(results);
  } catch (error) {
    console.error('[Outreach] Error:', error);
    return NextResponse.json({ error: '服务器内部错误' }, { status: 500 });
  }
}

/**
 * GET /api/outreach
 * 获取outreach发送记录
 */
export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from('waitlists')
      .select('id, email, name, company, role, priority, status, outreach_sent_at, created_at')
      .not('outreach_sent_at', 'is', null)
      .order('outreach_sent_at', { ascending: false })
      .limit(50);

    if (error) {
      return NextResponse.json({ error: '查询失败' }, { status: 500 });
    }

    return NextResponse.json({ records: data || [] });
  } catch (error) {
    return NextResponse.json({ error: '服务器内部错误' }, { status: 500 });
  }
}

function getPurposeGreeting(purpose: string): string {
  const map: Record<string, string> = {
    customer_service: '客服工单审批',
    content_publish: '内容发布流程',
    data_entry: '数据录入校验',
    expense_approval: '费用报销审批',
    code_review: '代码审查辅助',
    other: '自定义工作流',
  };
  return map[purpose] || purpose;
}

// Helper: Supabase .is() with a non-null value
function notEqNull() {
  return null;
}
