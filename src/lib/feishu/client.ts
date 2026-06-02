// WorkflowGuard — 飞书开放平台 API 客户端
// 负责：获取 token、通用 HTTP 请求、令牌缓存

export interface FeishuConfig {
  appId: string
  appSecret: string
}

// 内存级 token 缓存（减少重复获取 token 的请求）
let cachedToken: { token: string; expiresAt: number } | null = null

/**
 * 获取飞书 tenant_access_token（带缓存）
 * 默认有效期 2 小时，提前 10 分钟刷新
 */
export async function getTenantAccessToken(
  config?: FeishuConfig
): Promise<string> {
  // 有缓存且未过期（提前 10 分钟刷新）
  if (cachedToken && Date.now() < cachedToken.expiresAt - 10 * 60 * 1000) {
    return cachedToken.token
  }

  const appId = config?.appId ?? process.env.FEISHU_APP_ID
  const appSecret = config?.appSecret ?? process.env.FEISHU_APP_SECRET

  if (!appId || !appSecret) {
    throw new Error("[Feishu Client] 未配置 FEISHU_APP_ID / FEISHU_APP_SECRET")
  }

  const res = await fetch("https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal", {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify({ app_id: appId, app_secret: appSecret }),
  })

  const data = await res.json()

  if (!data.tenant_access_token) {
    throw new Error(`[Feishu Client] 获取 token 失败: ${JSON.stringify(data)}`)
  }

  // 缓存 token（expires_in 单位秒）
  cachedToken = {
    token: data.tenant_access_token,
    expiresAt: Date.now() + data.expire * 1000,
  }

  return data.tenant_access_token
}

/**
 * 清除 token 缓存（用于 token 过期 / 配置更新时）
 */
export function clearTokenCache() {
  cachedToken = null
}

/**
 * 飞书 API 通用请求封装
 */
export async function feishuApi<T = any>(
  path: string,
  options: {
    method?: string
    query?: Record<string, string>
    body?: unknown
    config?: FeishuConfig
  } = {}
): Promise<T> {
  const { method = "GET", query, body, config } = options
  const token = await getTenantAccessToken(config)

  // 构建 URL
  let url = `https://open.feishu.cn${path.startsWith("/") ? "" : "/"}${path}`
  if (query) {
    const params = new URLSearchParams(query)
    url += `?${params.toString()}`
  }

  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
  }

  if (body && !(body instanceof FormData)) {
    headers["Content-Type"] = "application/json; charset=utf-8"
  }

  const res = await fetch(url, {
    method,
    headers,
    body: body ? (body instanceof FormData ? body : JSON.stringify(body)) : undefined,
  })

  const data = await res.json()

  // token 过期则清除缓存重试一次
  if (data.code === 99991663 || data.code === 99991664) {
    clearTokenCache()
    return feishuApi(path, options)
  }

  return data as T
}

/**
 * 飞书 API 响应包装类型
 */
export interface FeishuApiResponse<T = any> {
  code: number
  msg: string
  data?: T
}

/**
 * 获取用户信息（通过 user_id / open_id / email）
 */
export async function getUserInfo(
  id: string,
  idType: "open_id" | "user_id" | "email" = "open_id"
) {
  return feishuApi<FeishuApiResponse>("/open-apis/contact/v3/users/batch_get_id", {
    query: { [idType]: id },
  })
}

/**
 * 批量获取用户邮箱
 */
export async function batchGetUserByEmail(emails: string[]) {
  return feishuApi<FeishuApiResponse>("/open-apis/contact/v3/users/batch", {
    method: "POST",
    body: { emails },
  })
}

// (no need to re-export self)
