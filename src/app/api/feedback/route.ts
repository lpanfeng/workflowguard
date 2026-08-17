import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, email, category, message, source, rating } = body;

    // Validate required fields
    if (!name || !email || !message) {
      return NextResponse.json(
        { error: '缺少必填字段：name, email, message' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: '邮箱格式不正确' },
        { status: 400 }
      );
    }

    // 验证category
    const validCategories = ['general', 'bug', 'feature', 'pricing', 'onboarding'];
    if (category && !validCategories.includes(category)) {
      return NextResponse.json(
        { error: '无效的反馈类别' },
        { status: 400 }
      );
    }

    // 验证rating
    if (rating !== undefined && (rating < 1 || rating > 5)) {
      return NextResponse.json(
        { error: '评分必须在1-5之间' },
        { status: 400 }
      );
    }

    // 写入Supabase
    const { data, error } = await supabaseAdmin
      .from('feedbacks')
      .insert({
        name,
        email,
        category: category || 'general',
        message,
        source: source || 'web',
        rating: rating || null,
      })
      .select()
      .single();

    if (error) {
      console.error('[Feedback] DB Error:', error);
      return NextResponse.json(
        { error: '保存反馈失败，请稍后重试' },
        { status: 500 }
      );
    }

    console.log('[Feedback] Saved:', data?.id, 'from', email);

    return NextResponse.json({
      success: true,
      id: data?.id,
      message: '反馈已提交，感谢您的意见！',
    }, { status: 201 });
  } catch (error) {
    console.error('[Feedback] Error:', error);
    return NextResponse.json(
      { error: '服务器内部错误' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const status = searchParams.get('status');
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);
    const offset = parseInt(searchParams.get('offset') || '0');

    let query = supabaseAdmin
      .from('feedbacks')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (category) {
      query = query.eq('category', category);
    }
    if (status) {
      query = query.eq('status', status);
    }

    const { data, error, count } = await query;

    if (error) {
      console.error('[Feedback] List Error:', error);
      return NextResponse.json(
        { error: '获取反馈列表失败' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      feedbacks: data || [],
      total: count || 0,
      limit,
      offset,
    });
  } catch (error) {
    console.error('[Feedback] GET Error:', error);
    return NextResponse.json(
      { error: '服务器内部错误' },
      { status: 500 }
    );
  }
}
