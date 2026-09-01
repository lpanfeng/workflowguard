import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { randomBytes } from 'crypto';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, email } = body;

    if (!id && !email) {
      return NextResponse.json(
        { error: '需要提供ID或邮箱' },
        { status: 400 }
      );
    }

    // Generate a confirmation token
    const token = randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Update the waitlist record with token and expiry
    const updateQuery = id
      ? supabaseAdmin.from('waitlists').update({
          confirm_token: token,
          token_expires_at: expiresAt.toISOString(),
        }).eq('id', id)
      : supabaseAdmin.from('waitlists').update({
          confirm_token: token,
          token_expires_at: expiresAt.toISOString(),
        }).eq('email', email);

    const { error } = await updateQuery;

    if (error) {
      console.error('[Waitlist] Confirm token error:', error);
      return NextResponse.json(
        { error: '更新确认令牌失败' },
        { status: 500 }
      );
    }

    // Simulated email sending (in production, use Resend/SendGrid)
    console.log(`[Waitlist] 📧 确认邮件已发送至 ${email}`);
    console.log(`[Waitlist] 🔗 确认链接: ${request.headers.get('origin')}/waitlist/verify?token=${token}`);

    return NextResponse.json({
      success: true,
      message: '确认邮件已发送（模拟）',
      simulated: true,
    });
  } catch (error) {
    console.error('[Waitlist] Confirm Error:', error);
    return NextResponse.json(
      { error: '服务器内部错误' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.json(
        { error: '缺少确认令牌' },
        { status: 400 }
      );
    }

    // Find the waitlist record by token
    const { data, error } = await supabaseAdmin
      .from('waitlists')
      .select('id, email, status')
      .eq('confirm_token', token)
      .single();

    if (error || !data) {
      return NextResponse.json(
        { error: '无效的确认令牌' },
        { status: 400 }
      );
    }

    // Check if token expired
    if (data.token_expires_at && new Date(data.token_expires_at) < new Date()) {
      return NextResponse.json(
        { error: '确认令牌已过期' },
        { status: 400 }
      );
    }

    // Update status to active and clear token
    const { error: updateError } = await supabaseAdmin
      .from('waitlists')
      .update({
        status: 'active',
        email_verified: true,
        confirm_token: null,
        token_expires_at: null,
        verified_at: new Date().toISOString(),
      })
      .eq('id', data.id);

    if (updateError) {
      console.error('[Waitlist] Verify error:', updateError);
      return NextResponse.json(
        { error: '确认失败，请稍后重试' },
        { status: 500 }
      );
    }

    console.log(`[Waitlist] ✅ 邮箱已确认: ${data.email}`);

    return NextResponse.json({
      success: true,
      message: '邮箱确认成功！',
      email: data.email,
    });
  } catch (error) {
    console.error('[Waitlist] GET Confirm Error:', error);
    return NextResponse.json(
      { error: '服务器内部错误' },
      { status: 500 }
    );
  }
}
