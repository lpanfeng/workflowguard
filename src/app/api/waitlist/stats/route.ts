import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

// In-memory cache for fallback when Supabase is down
let memoryCache: {
  data: any;
  timestamp: number;
} | null = null;

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

async function querySupabase() {
  const { data: all, error, count } = await supabaseAdmin
    .from('waitlists')
    .select('id, created_at, source, status, priority', { count: 'exact' });

  if (error) throw error;
  return { data: all, count: count || 0 };
}

export async function GET() {
  let allData: any[] = [];
  let total: number = 0;

  try {
    const result = await querySupabase();
    allData = result.data || [];
    total = result.count;
  } catch (error) {
    console.warn('[Waitlist Stats] Supabase unavailable, using empty state:', error);
    // Return empty state instead of 500 error
    allData = [];
    total = 0;
  }

  // Get today's count
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  const todayCount = allData.filter(d => {
    const dt = new Date(d.created_at);
    return dt >= todayStart && dt <= todayEnd;
  }).length;

  // Get this week's count
  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - 7);
  const weekCount = allData.filter(d => new Date(d.created_at) >= weekStart).length;

  // Get status breakdown
  const statusCounts: Record<string, number> = {};
  allData.forEach(e => {
    const s = e.status || 'unknown';
    statusCounts[s] = (statusCounts[s] || 0) + 1;
  });

  // Get source breakdown
  const sourceCounts: Record<string, number> = {};
  allData.forEach(e => {
    const s = e.source || 'web';
    sourceCounts[s] = (sourceCounts[s] || 0) + 1;
  });

  // Get priority breakdown
  const priorityCounts: Record<string, number> = {};
  allData.forEach(e => {
    const p = e.priority || 'unspecified';
    priorityCounts[p] = (priorityCounts[p] || 0) + 1;
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

    const count = allData.filter(d => {
      const dt = new Date(d.created_at);
      return dt >= dayStart && dt <= dayEnd;
    }).length;

    dailyTrend.push({
      date: dayStart.toISOString().slice(0, 10),
      count,
    });
  }

  // Get recent entries for company/role insights
  const recentEntries = allData
    .filter(e => e.status === 'pending')
    .slice(0, 100);

  const companies = recentEntries.map(e => e.company).filter(Boolean) as string[];
  const roles = recentEntries.map(e => e.role).filter(Boolean) as string[];
  const topCompanies = [...new Set(companies)].slice(0, 5);
  const topRoles = [...new Set(roles)].slice(0, 5);

  // Check Supabase connectivity status
  let dbStatus = 'connected' as 'connected' | 'error';
  try {
    await supabaseAdmin.from('waitlists').select('id', { count: 'exact', head: true });
  } catch {
    dbStatus = 'error';
  }

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
    dbStatus,
    dbUrl: process.env.NEXT_PUBLIC_SUPABASE_URL?.replace('https://', '').split('.')[0],
  });
}
