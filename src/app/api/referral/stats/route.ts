import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET() {
  try {
    const { count: totalCount } = await supabaseAdmin
      .from('waitlists')
      .select('*', { count: 'exact', head: true });

    const { count: activeCount } = await supabaseAdmin
      .from('waitlists')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active')
      .not('referral_code', 'is', null);

    const { data: referralData } = await supabaseAdmin
      .from('waitlists')
      .select('referred_count')
      .eq('status', 'active')
      .not('referred_count', 'is', null);

    const totalReferrals = referralData?.reduce((sum, r) => sum + (r.referred_count || 0), 0) || 0;

    const { data: topReferrers } = await supabaseAdmin
      .from('waitlists')
      .select('email, name, referred_count')
      .eq('status', 'active')
      .not('referred_count', 'eq', 0)
      .order('referred_count', { ascending: false })
      .limit(5);

    return NextResponse.json({
      totalWaitlist: totalCount || 0,
      activeWithReferral: activeCount || 0,
      totalReferrals,
      topReferrers: topReferrers?.map(r => ({
        email: r.email,
        name: r.name,
        referredCount: r.referred_count,
      })) || [],
    });
  } catch (error) {
    console.error('[Referral Stats] Error:', error);
    return NextResponse.json({ totalWaitlist: 0, activeWithReferral: 0, totalReferrals: 0, topReferrers: [] });
  }
}
