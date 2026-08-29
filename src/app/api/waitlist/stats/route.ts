import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET() {
  try {
    // Get total count
    const { data: all, error } = await supabaseAdmin
      .from('waitlists')
      .select('id, created_at, source, status', { count: 'exact', head: true });

    if (error) {
      console.error('[Waitlist Stats] Error:', error);
      return NextResponse.json({ error: '获取统计数据失败' }, { status: 500 });
    }

    const total = all?.[0]?.count || 0;

    // Get today's count
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const { data: todayData } = await supabaseAdmin
      .from('waitlists')
      .select('id', { count: 'exact' })
      .gte('created_at', todayStart.toISOString())
      .lte('created_at', todayEnd.toISOString());
    const todayCount = todayData?.length || 0;

    // Get this week's count
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - 7);
    const { data: weekData } = await supabaseAdmin
      .from('waitlists')
      .select('id', { count: 'exact' })
      .gte('created_at', weekStart.toISOString());
    const weekCount = weekData?.length || 0;

    // Get status breakdown
    const { data: statusData } = await supabaseAdmin
      .from('waitlists')
      .select('status')
      .limit(1000);
    const statusCounts: Record<string, number> = {};
    statusData?.forEach(e => {
      statusCounts[e.status] = (statusCounts[e.status] || 0) + 1;
    });

    // Get source breakdown
    const { data: sourceData } = await supabaseAdmin
      .from('waitlists')
      .select('source')
      .limit(1000);
    const sourceCounts: Record<string, number> = {};
    sourceData?.forEach(e => {
      sourceCounts[e.source] = (sourceCounts[e.source] || 0) + 1;
    });

    // Get last 7 days daily trend
    const dailyTrend: Array<{ date: string; count: number }> = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dayStart = new Date(date);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(date);
      dayEnd.setHours(23, 59, 59, 999);

      const { data: dayData } = await supabaseAdmin
        .from('waitlists')
        .select('id', { count: 'exact' })
        .gte('created_at', dayStart.toISOString())
        .lte('created_at', dayEnd.toISOString());

      dailyTrend.push({
        date: dayStart.toISOString().slice(0, 10),
        count: dayData?.length || 0,
      });
    }

    // Get priority breakdown
    const { data: priorityData } = await supabaseAdmin
      .from('waitlists')
      .select('priority')
      .limit(1000);
    const priorityCounts: Record<string, number> = {};
    priorityData?.forEach(e => {
      const p = e.priority || 'unspecified';
      priorityCounts[p] = (priorityCounts[p] || 0) + 1;
    });

    // Get recent entries for company/role insights
    const { data: recentEntries } = await supabaseAdmin
      .from('waitlists')
      .select('company, role')
      .eq('status', 'pending')
      .limit(100);

    const companies = recentEntries?.map(e => e.company).filter(Boolean) || [];
    const roles = recentEntries?.map(e => e.role).filter(Boolean) || [];
    const topCompanies = [...new Set(companies)].slice(0, 5);
    const topRoles = [...new Set(roles)].slice(0, 5);

    return NextResponse.json({
      total,
      todayCount,
      weekCount,
      statusCounts,
      sourceCounts,
      priorityCounts,
      dailyTrend,
      topCompanies,
      topRoles,
    });
  } catch (error) {
    console.error('[Waitlist Stats] Error:', error);
    return NextResponse.json({ error: '服务器内部错误' }, { status: 500 });
  }
}
