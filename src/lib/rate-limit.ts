/**
 * 简单的内存级 Rate Limiting 框架
 * 
 * 生产环境应替换为 Redis 或 Supabase-based 实现
 * 当前实现适用于开发/小规模场景
 */

interface RateLimitEntry {
  count: number
  resetAt: number
}

const rateLimits = new Map<string, RateLimitEntry>()

const DEFAULT_WINDOW_MS = 60 * 1000 // 1分钟
const DEFAULT_MAX_REQUESTS = 60 // 每分钟最多60次

export interface RateLimitConfig {
  windowMs?: number
  maxRequests?: number
}

export function checkRateLimit(key: string, config: RateLimitConfig = {}): { allowed: boolean; remaining: number; resetAt: number } {
  const windowMs = config.windowMs ?? DEFAULT_WINDOW_MS
  const maxRequests = config.maxRequests ?? DEFAULT_MAX_REQUESTS
  
  const now = Date.now()
  let entry = rateLimits.get(key)

  if (!entry || now > entry.resetAt) {
    entry = { count: 0, resetAt: now + windowMs }
    rateLimits.set(key, entry)
  }

  entry.count++

  const remaining = Math.max(0, maxRequests - entry.count)
  const allowed = entry.count <= maxRequests

  return { allowed, remaining, resetAt: entry.resetAt }
}

/**
 * 清除过期的 rate limit 条目（定期调用）
 */
export function cleanupExpiredEntries() {
  const now = Date.now()
  for (const [key, entry] of rateLimits.entries()) {
    if (now > entry.resetAt) {
      rateLimits.delete(key)
    }
  }
}

// 每5分钟清理一次过期条目
setInterval(cleanupExpiredEntries, 5 * 60 * 1000)

/**
 * 创建带 rate limiting 的响应
 */
export function rateLimitedResponse(
  key: string,
  res: Response,
  config: RateLimitConfig = {}
): Response {
  const limit = checkRateLimit(key, config)
  
  if (!limit.allowed) {
    return new Response(
      JSON.stringify({ error: "请求过于频繁，请稍后再试" }),
      {
        status: 429,
        headers: {
          "Retry-After": String(Math.ceil((limit.resetAt - Date.now()) / 1000)),
          "X-RateLimit-Limit": String(config.maxRequests ?? DEFAULT_MAX_REQUESTS),
          "X-RateLimit-Remaining": "0",
          "X-RateLimit-Reset": String(limit.resetAt),
        },
      }
    )
  }

  // 在响应头中添加 rate limit 信息
  res.headers.set("X-RateLimit-Limit", String(config.maxRequests ?? DEFAULT_MAX_REQUESTS))
  res.headers.set("X-RateLimit-Remaining", String(limit.remaining))
  res.headers.set("X-RateLimit-Reset", String(limit.resetAt))

  return res
}
