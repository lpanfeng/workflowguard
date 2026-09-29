// WorkflowGuard — 执行审计导出（Audit Export）
//
// 背景：HN 671pts 集群（"Coding Is Not Solved" + "问题不在 AI 代码，而是没人再懂系统意图"）
// 印证了一个共识痛点：AI 跑了什么、为什么这么跑、谁批准了——没人能说清。
//
// 本模块把一次 WorkflowExecution 转成**可移植、可读、可对账**的审计报告，
// 让"人机协作"的每一步都有据可查（intent → action → decision → approval → outcome）。
// 纯函数、无副作用，便于单测与外部集成（导出给审计/合规/客户）。

import type { WorkflowExecution, StepExecution } from "./workflow-executor"

export interface AuditEntry {
  /** 顺序序号（1-indexed） */
  seq: number
  stepId: string
  stepName: string
  stepType: StepExecution["stepType"]
  /** 该步骤的最终状态 */
  status: StepExecution["status"]
  /** 是否涉及人工介入（审批/拒绝） */
  humanInvolved: boolean
  startedAt: string | null
  completedAt: string | null
  durationMs: number | null
  retryCount: number
  error: string | null
  /** 触达过的审批级别（多级审批） */
  approvals: AuditApproval[]
}

export interface AuditApproval {
  level: number
  status: "pending" | "approved" | "rejected"
  approver: string
  handledBy?: string
  comment?: string
  handledAt?: string
}

export interface AuditReport {
  /** 报告 schema 版本，便于下游解析 */
  schemaVersion: "1.0"
  executionId: string
  workflowId: string
  userId: string
  status: WorkflowExecution["status"]
  triggerType: string
  startedAt: string
  completedAt: string | null
  /** 端到端耗时（毫秒），未完成则为 null */
  totalDurationMs: number | null
  /** 摘要统计 */
  summary: {
    totalSteps: number
    completed: number
    failed: number
    awaitingApproval: number
    humanInterventions: number
    retries: number
  }
  /** 按时间顺序的审计条目 */
  entries: AuditEntry[]
  /** 输入 / 输出数据快照 */
  inputData: Record<string, unknown>
  outputData: Record<string, unknown>
  error: string | null
}

function toMs(t: string | null | undefined): number | null {
  if (!t) return null
  const v = new Date(t).getTime()
  return Number.isNaN(v) ? null : v
}

function durationMs(start: string | null, end: string | null): number | null {
  const a = toMs(start)
  const b = toMs(end)
  if (a === null || b === null) return null
  return Math.max(0, b - a)
}

function isHumanStep(s: StepExecution): boolean {
  return (
    s.status === "waiting_approval" ||
    s.status === "approved" ||
    s.status === "rejected" ||
    (Array.isArray(s.approvalStatus) && s.approvalStatus.length > 0)
  )
}

/**
 * 构建可移植审计报告。
 * 纯函数：同样的输入永远产出同样的输出（不读时钟、不读环境变量）。
 */
export function toAuditReport(exec: WorkflowExecution): AuditReport {
  const entries: AuditEntry[] = exec.steps.map((s, i) => ({
    seq: i + 1,
    stepId: s.stepId,
    stepName: s.stepName,
    stepType: s.stepType,
    status: s.status,
    humanInvolved: isHumanStep(s),
    startedAt: s.startedAt ?? null,
    completedAt: s.completedAt ?? null,
    durationMs: durationMs(s.startedAt ?? null, s.completedAt ?? null),
    retryCount: s.retryCount ?? 0,
    error: s.error ?? null,
    approvals: (s.approvalStatus ?? []).map((a) => ({
      level: a.level,
      status: a.status,
      approver:
        a.approver?.label ??
        a.approver?.role ??
        a.approver?.email ??
        a.approver?.type ??
        "unknown",
      handledBy: a.handledBy,
      comment: a.comment,
      handledAt: a.handledAt,
    })),
  }))

  const summary = {
    totalSteps: entries.length,
    completed: entries.filter((e) => e.status === "completed" || e.status === "approved").length,
    failed: entries.filter((e) => e.status === "failed" || e.status === "timed_out").length,
    awaitingApproval: entries.filter((e) => e.status === "waiting_approval").length,
    humanInterventions: entries.filter((e) => e.humanInvolved).length,
    retries: entries.reduce((n, e) => n + e.retryCount, 0),
  }

  return {
    schemaVersion: "1.0",
    executionId: exec.id,
    workflowId: exec.workflowId,
    userId: exec.userId,
    status: exec.status,
    triggerType: exec.trigger?.type ?? "manual",
    startedAt: exec.startedAt,
    completedAt: exec.completedAt ?? null,
    totalDurationMs: durationMs(exec.startedAt, exec.completedAt ?? null),
    summary,
    entries,
    inputData: exec.inputData ?? {},
    outputData: exec.outputData ?? {},
    error: exec.error ?? null,
  }
}

function csvCell(v: unknown): string {
  const s = v === null || v === undefined ? "" : String(v)
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

/**
 * 将审计报告渲染为 CSV（便于合规归档 / Excel 对账）。
 * 每个审批级别展开为一行；无审批的步骤也占一行（审批列留空）。
 */
export function toAuditCsv(report: AuditReport): string {
  const header = [
    "seq",
    "stepId",
    "stepName",
    "stepType",
    "status",
    "humanInvolved",
    "startedAt",
    "completedAt",
    "durationMs",
    "retryCount",
    "approvalLevel",
    "approvalStatus",
    "approver",
    "handledBy",
    "comment",
    "handledAt",
    "error",
  ]
  const rows: string[][] = []
  for (const e of report.entries) {
    const base = [
      e.seq,
      e.stepId,
      e.stepName,
      e.stepType,
      e.status,
      e.humanInvolved,
      e.startedAt,
      e.completedAt,
      e.durationMs,
      e.retryCount,
    ]
    if (e.approvals.length === 0) {
      rows.push([...base, "", "", "", "", "", "", e.error].map(csvCell))
    } else {
      for (const a of e.approvals) {
        rows.push(
          [
            ...base,
            a.level,
            a.status,
            a.approver,
            a.handledBy ?? "",
            a.comment ?? "",
            a.handledAt ?? "",
            e.error,
          ].map(csvCell),
        )
      }
    }
  }
  return [header.join(","), ...rows.map((r) => r.join(","))].join("\n")
}
