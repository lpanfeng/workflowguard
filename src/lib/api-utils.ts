/**
 * WorkflowGuard — API utility functions
 * 提供：重试机制、缓存层、错误降级
 */

/**
 * 重试 fetch / async call
 * @param fn - 要执行的异步函数
 * @param maxRetries - 最大重试次数（默认 3）
 * @param baseDelayMs - 基础延迟（毫秒，默认 1000）
 * @param maxDelayMs - 最大延迟（毫秒，默认 10000）
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelayMs: number = 1000,
  maxDelayMs: number = 10000,
): Promise<T> {
  let lastError: unknown
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn()
    } catch (err) {
      lastError = err
      if (attempt === maxRetries) break
      const delay = Math.min(baseDelayMs * Math.pow(2, attempt), maxDelayMs)
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }
  throw lastError
}

/**
 * 简单内存缓存
 */
export class SimpleCache<T> {
  private cache = new Map<string, { data: T; expiry: number }>()

  constructor(private ttlMs: number = 30000) {} // 默认 30s TTL

  get(key: string): T | null {
    const entry = this.cache.get(key)
    if (!entry) return null
    if (Date.now() > entry.expiry) {
      this.cache.delete(key)
      return null
    }
    return entry.data
  }

  set(key: string, data: T): void {
    this.cache.set(key, {
      data,
      expiry: Date.now() + this.ttlMs,
    })
  }

  clear(): void {
    this.cache.clear()
  }

  invalidate(key: string): void {
    this.cache.delete(key)
  }
}

/**
 * 带缓存的 Supabase 查询
 */
export async function cachedSupabaseQuery<T>(
  query: Promise<{ data: T | null; error: Error | null }>,
  cache: SimpleCache<T[] | T | null>,
  cacheKey: string,
  maxRetries: number = 2,
): Promise<{ data: T | null; error: Error | null }> {
  // 尝试从缓存读取
  const cached = cache.get(cacheKey)
  if (cached != null) {
    return { data: cached as T, error: null }
  }

  try {
    const result = await withRetry(async () => {
      return await query
    }, maxRetries)

    if (result.data !== null && result.data !== undefined) {
      cache.set(cacheKey, result.data as T)
    }

    return result
  } catch (err) {
    return { data: null, error: err instanceof Error ? err : new Error(String(err)) }
  }
}

/**
 * Supabase 查询的错误包装器
 */
export function wrapSupabaseQuery(query: Promise<{ data: any; error: any }>) {
  return query.then((result) => {
    if (result.error) {
      return { data: null, error: result.error }
    }
    return { data: result.data, error: null }
  })
}
