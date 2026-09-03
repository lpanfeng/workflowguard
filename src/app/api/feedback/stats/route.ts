import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET() {
  try {
    const { data: feedbacks, error } = await supabaseAdmin
      .from('feedbacks')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(500);

    if (error) {
      console.error('[Feedback Stats] Error:', error);
      return NextResponse.json({ error: '获取反馈数据失败' }, { status: 500 });
    }

    if (!feedbacks || feedbacks.length === 0) {
      return NextResponse.json({
        total: 0,
        categoryCounts: {},
        ratingDistribution: {},
        sourceCounts: {},
        recentFeedbacks: [],
        productSuggestions: [],
        iterationPriorities: [],
      });
    }

    const categoryCounts: Record<string, number> = {};
    feedbacks.forEach(f => {
      const cat = f.category || 'general';
      categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
    });

    const ratingDistribution: Record<string, number> = {};
    feedbacks.filter(f => f.rating).forEach(f => {
      const r = String(f.rating);
      ratingDistribution[r] = (ratingDistribution[r] || 0) + 1;
    });

    const sourceCounts: Record<string, number> = {};
    feedbacks.forEach(f => {
      const src = f.source || 'web';
      sourceCounts[src] = (sourceCounts[src] || 0) + 1;
    });

    const keywords = ['审批', '审计', '合规', '成本', '模型', '模板', '飞书', '集成', '仪表', '报告', '权限', '团队', '价格', '定价', '简单', '易用', '快速', '稳定', '安全', '隐私', '数据', 'export', 'import', 'api', 'webhook', 'notification', 'email', 'feishu'];
    const productSuggestions: Record<string, number> = {};
    feedbacks.forEach(f => {
      const msg = (f.message || '').toLowerCase();
      keywords.forEach(kw => {
        if (msg.includes(kw.toLowerCase())) {
          productSuggestions[kw] = (productSuggestions[kw] || 0) + 1;
        }
      });
    });

    const sortedSuggestions = Object.entries(productSuggestions)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([name, count]) => ({ name, count }));

    const iterationPriorities = [
      { priority: 'P0', item: '反馈分析面板', reason: '数据驱动产品决策', votes: sortedSuggestions[0]?.count || 0 },
      { priority: 'P0', item: '多模型路由优化', reason: '成本追踪需求持续', votes: sortedSuggestions.find(s => s.name.includes('成本'))?.count || 0 },
      { priority: 'P1', item: '飞书深度集成', reason: '企业用户首选通知渠道', votes: sortedSuggestions.find(s => s.name.includes('飞书'))?.count || 0 },
      { priority: 'P1', item: '仪表盘增强', reason: '数据可视化需求', votes: sortedSuggestions.find(s => s.name.includes('仪表'))?.count || 0 },
      { priority: 'P2', item: '模板市场', reason: '开箱即用需求', votes: sortedSuggestions.find(s => s.name.includes('模板'))?.count || 0 },
    ].filter(p => p.votes > 0);

    const recentFeedbacks = feedbacks.slice(0, 10).map(f => ({
      id: f.id,
      name: f.name,
      email: f.email,
      category: f.category,
      rating: f.rating,
      message: f.message?.substring(0, 100),
      created_at: f.created_at,
    }));

    return NextResponse.json({
      total: feedbacks.length,
      categoryCounts,
      ratingDistribution,
      sourceCounts,
      recentFeedbacks,
      productSuggestions: sortedSuggestions,
      iterationPriorities,
    });
  } catch (error) {
    console.error('[Feedback Stats] Error:', error);
    return NextResponse.json({ error: '服务器内部错误' }, { status: 500 });
  }
}
