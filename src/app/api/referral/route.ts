import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import crypto from 'crypto';

function generateReferralCode(): string {
  return crypto.randomBytes(6).toString('hex').toUpperCase();
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const email = searchParams.get('email');

  try {
    if (code) {
      const { data, error } = await supabaseAdmin
        .from('waitlists')
        .select('id, email, name, referral_code, referred_count')
        .eq('referral_code', code)
        .eq('status', 'active')
        .single();

      if (error || !data) {
        return NextResponse.json({ valid: false, error: '无效的邀请码' }, { status: 404 });
      }

      return NextResponse.json({
        valid: true,
        referrer: {
          id: data.id,
          email: data.email,
          name: data.name,
          referredCount: data.referred_count || 0,
        }
      });
    }

    if (email) {
      const { data, error } = await supabaseAdmin
        .from('waitlists')
        .select('id, email, name, referral_code, referred_count')
        .eq('email', email)
        .eq('status', 'active')
        .single();

      if (error || !data) {
        return NextResponse.json({ found: false, message: '该邮箱未注册或暂无邀请码' });
      }

      return NextResponse.json({
        found: true,
        referralCode: data.referral_code,
        referredCount: data.referred_count || 0,
        referrer: { email: data.email, name: data.name },
      });
    }

    return NextResponse.json({ error: '需要提供 code 或 email 参数' }, { status: 400 });
  } catch (error) {
    console.error('[Referral] GET Error:', error);
    return NextResponse.json({ error: '服务器内部错误' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { email, action, referrer_code, new_email, new_name } = body;

  try {
    if (action === 'generate') {
      const { data: user, error: userError } = await supabaseAdmin
        .from('waitlists')
        .select('id, referral_code')
        .eq('email', email)
        .eq('status', 'active')
        .single();

      if (userError || !user) {
        return NextResponse.json({ error: '用户不存在或状态异常' }, { status: 404 });
      }

      if (user.referral_code) {
        return NextResponse.json({ success: true, referralCode: user.referral_code, message: '您的邀请码已存在' });
      }

      const code = generateReferralCode();
      const { data, error } = await supabaseAdmin
        .from('waitlists')
        .update({ referral_code: code })
        .eq('id', user.id)
        .select('referral_code')
        .single();

      if (error) {
        console.error('[Referral] Generate error:', error);
        return NextResponse.json({ error: '生成邀请码失败' }, { status: 500 });
      }

      console.log(`[Referral] Generated code ${code} for ${email}`);
      return NextResponse.json({ success: true, referralCode: data?.referral_code, message: '邀请码生成成功！' });
    }

    if (action === 'track') {
      if (!referrer_code || !new_email) {
        return NextResponse.json({ error: '需要 referral_code 和 email' }, { status: 400 });
      }

      const { data: referrer, error: referrerError } = await supabaseAdmin
        .from('waitlists')
        .select('id, referred_count')
        .eq('referral_code', referrer_code)
        .eq('status', 'active')
        .single();

      if (referrerError || !referrer) {
        return NextResponse.json({ success: false, error: '无效的邀请码' }, { status: 404 });
      }

      const { error: updateError } = await supabaseAdmin
        .from('waitlists')
        .update({ referred_count: (referrer.referred_count || 0) + 1 })
        .eq('id', referrer.id);

      if (updateError) {
        console.error('[Referral] Track error:', updateError);
        return NextResponse.json({ error: '记录失败' }, { status: 500 });
      }

      console.log(`[Referral] Tracked: ${new_email} referred by ${referrer_code}`);
      return NextResponse.json({ success: true, message: '邀请成功！' });
    }

    return NextResponse.json({ error: '未知的 action' }, { status: 400 });
  } catch (error) {
    console.error('[Referral] POST Error:', error);
    return NextResponse.json({ error: '服务器内部错误' }, { status: 500 });
  }
}
