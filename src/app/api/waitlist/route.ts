import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, name, company, role, workflow_purpose, priority, source } = body;

    if (!email) {
      return NextResponse.json({ error: '邮箱地址是必填项' }, { status: 400 });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: '邮箱格式不正确' }, { status: 400 });
    }

    try {
      const { data: existing } = await supabaseAdmin
        .from('waitlists')
        .select('id')
        .eq('email', email)
        .in('status', ['pending', 'active'])
        .single();

      if (existing) {
        return NextResponse.json({ error: '该邮箱已在等待名单中', alreadyRegistered: true }, { status: 409 });
      }

      const { data, error } = await supabaseAdmin
        .from('waitlists')
        .insert({
          email,
          name: name || null,
          company: company || null,
          role: role || null,
          workflow_purpose: workflow_purpose || null,
          priority: priority || null,
          source: source || 'web',
          status: 'pending',
        })
        .select()
        .single();

      if (error) {
        console.error('[Waitlist] DB Error:', error);
        return NextResponse.json({ error: '提交失败，请稍后重试' }, { status: 500 });
      }

      console.log('[Waitlist] New signup:', data?.id, email, 'from', source);
      return NextResponse.json({ success: true, id: data?.id, message: '感谢您的关注！我们会在产品上线时第一时间通知您。' }, { status: 201 });
    } catch (dbError) {
      console.error('[Waitlist] Supabase unavailable:', dbError);
      return NextResponse.json({ error: '服务暂时不可用，请稍后重试' }, { status: 503 });
    }
  } catch (error) {
    console.error('[Waitlist] Error:', error);
    return NextResponse.json({ error: '服务器内部错误' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 200);
    const offset = parseInt(searchParams.get('offset') || '0');

    try {
      let query = supabaseAdmin
        .from('waitlists')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (status) {
        query = query.eq('status', status);
      }

      const { data, error, count } = await query;

      if (error) {
        console.error('[Waitlist] DB Error:', error);
        return NextResponse.json({ error: '数据库查询失败' }, { status: 500 });
      }

      return NextResponse.json({
        waitlists: data || [],
        total: count || 0,
        limit,
        offset,
        dbStatus: 'connected',
      });
    } catch (dbError) {
      console.error('[Waitlist] Supabase unavailable, returning empty:', dbError);
      return NextResponse.json({
        waitlists: [],
        total: 0,
        limit,
        offset,
        dbStatus: 'error',
        message: '数据库暂时不可用',
      });
    }
  } catch (error) {
    console.error('[Waitlist] Error:', error);
    return NextResponse.json({ error: '服务器内部错误' }, { status: 500 });
  }
}
