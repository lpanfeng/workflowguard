import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, name, company, role, workflow_purpose, priority, source, referred_by } = body;

    if (!email) {
      return NextResponse.json({ error: '邮箱地址是必填项' }, { status: 400 });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+\.[^\s@]+$/;
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

      const insertData: any = {
        email,
        name: name || null,
        company: company || null,
        role: role || null,
        workflow_purpose: workflow_purpose || null,
        priority: priority || null,
        source: source || 'web',
        status: 'pending',
      };

      // Track referral
      if (referred_by) {
        insertData.referred_by = referred_by;
        // Increment referrer's count
        const { error: updateError } = await supabaseAdmin
          .from('waitlists')
          .update({ referred_count: (supabaseAdmin as any).postgrest?.rpc ? 0 : 0 })
          .eq('referral_code', referred_by)
          .eq('status', 'active');
        
        // Use raw SQL for increment
        try {
          await supabaseAdmin.rpc('increment_referred_count', { p_code: referred_by });
        } catch (rpcErr) {
          console.log('[Waitlist] RPC not available, will use manual increment');
        }
      }

      const { data, error } = await supabaseAdmin
        .from('waitlists')
        .insert(insertData)
        .select()
        .single();

      if (error) {
        console.error('[Waitlist] DB Error:', error);
        return NextResponse.json({ error: '提交失败，请稍后重试' }, { status: 500 });
      }

      console.log('[Waitlist] New signup:', data?.id, email, 'from', source, referred_by ? `referred by ${referred_by}` : '');
      return NextResponse.json({ 
        success: true, 
        id: data?.id, 
        message: '感谢您的关注！我们会在产品上线时第一时间通知您。',
        referredBy: referred_by || null
      }, { status: 201 });
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
      return NextResponse.json({
        waitlists: [],
        total: 0,
        limit,
        offset,
        dbStatus: 'error',
        message: '数据库暂时不可用',
      });
    }

    return NextResponse.json({
      waitlists: data || [],
      total: count || 0,
      limit,
      offset,
      dbStatus: 'connected',
    });
  } catch (error) {
    console.error('[Waitlist] Supabase unavailable:', error);
    return NextResponse.json({
      waitlists: [],
      total: 0,
      limit,
      offset,
      dbStatus: 'error',
      message: '数据库暂时不可用',
    });
  }
}
