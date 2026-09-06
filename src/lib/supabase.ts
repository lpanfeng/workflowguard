import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// 服务端用 — 拥有所有权限，带超时
export const supabaseAdmin = createClient(
  supabaseUrl,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    db: {
      // 5秒超时，避免DNS问题导致请求永久挂起
      queryTimeout: 5000,
    },
    realtime: {
      params: {
        eventsPerSecond: 10,
      },
    },
  }
)

// 便捷函数：检测Supabase连接状态
export async function checkSupabaseStatus(): Promise<'connected' | 'error'> {
  try {
    await Promise.race([
      supabaseAdmin.from('waitlists').select('id', { count: 'exact', head: true }),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Timeout')), 5000)
      ),
    ]);
    return 'connected';
  } catch {
    return 'error';
  }
}
