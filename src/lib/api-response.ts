// WorkflowGuard — 统一 API 响应工具
// 所有 API 路由都应使用此工具返回统一格式的响应

import { NextResponse } from "next/server"

export interface ApiSuccessResult<T = unknown> {
  success: true
  data: T
}

export interface ApiErrorResult {
  success: false
  error: string
  code?: string
  details?: unknown
}

export type ApiResponse<T = unknown> = ApiSuccessResult<T> | ApiErrorResult

/**
 * 成功响应
 */
export function apiSuccess<T>(data: T, status = 200) {
  return NextResponse.json({ success: true, data }, { status })
}

/**
 * 错误响应
 */
export function apiError(error: string, status = 400, code?: string, details?: unknown) {
  console.error(`[API Error] ${status} ${code ?? ""}: ${error}`, details ?? "")
  return NextResponse.json(
    { success: false, error, code, details },
    { status }
  )
}

/**
 * 未授权响应
 */
export function apiUnauthorized(msg = "未登录或会话已过期") {
  return apiError(msg, 401, "UNAUTHORIZED")
}

/**
 * 资源不存在响应
 */
export function apiNotFound(resource = "资源") {
  return apiError(`${resource}不存在`, 404, "NOT_FOUND")
}

/**
 * 服务器内部错误
 */
export function apiInternalError(err: unknown, msg = "服务器内部错误") {
  const detail = err instanceof Error ? err.message : String(err)
  console.error("[API Internal Error]", detail)
  return apiError(msg, 500, "INTERNAL_ERROR", process.env.NODE_ENV === "development" ? detail : undefined)
}
