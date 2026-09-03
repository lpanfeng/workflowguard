import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

/**
 * GET /api/outreach/stats
 * 获取outreach发送统计数据
 */
export async function GET(request: NextRequest) {
  try {
    const total = await supabaseAdmin
      .from('waitlists')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'pending');

    const outreachSent = await supabaseAdmin
      .from('waitlists')
      .select('id', { count: 'exact', head: true })
      .neq('outreach_sent_at', null);

    const byPriority = await supabaseAdmin
      .from('waitlists')
      .select('priority, id')
      .eq('status', 'pending');

    const priorityCounts: Record<string, number> = { high: 0, medium: 0, low: 0 };
    byPriority.data?.forEach(e => {
      const p = e.priority || 'medium';
      priorityCounts[p] = (priorityCounts[p] || 0) + 1;
    });

    return NextResponse.json({
      pendingTotal: total.count || 0,
      outreachSentTotal: outreachSent.count || 0,
      byPriority: priorityCounts,
    });
  } catch (error) {
    console.error('[Outreach Stats] Error:', error);
    return NextResponse.json({ error: '服务器内部错误' }, { status: 500 });
  }
}
