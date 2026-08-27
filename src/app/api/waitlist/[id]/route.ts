import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { status } = body;

    if (!status) {
      return NextResponse.json({ error: '状态是必填项' }, { status: 400 });
    }

    const validStatuses = ['pending', 'active', 'rejected', 'archived'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json({ error: '无效的状态值' }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from('waitlists')
      .update({ status })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('[Waitlist] Update Error:', error);
      return NextResponse.json({ error: '更新失败' }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('[Waitlist] PATCH Error:', error);
    return NextResponse.json({ error: '服务器内部错误' }, { status: 500 });
  }
}
