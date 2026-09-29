import { describe, it, expect } from "vitest"
import { toAuditReport, toAuditCsv } from "@/lib/audit-export"
import type { WorkflowExecution } from "@/lib/workflow-executor"

function makeExec(overrides: Partial<WorkflowExecution> = {}): WorkflowExecution {
  return {
    id: "exec_1",
    workflowId: "wf_cs_ticket",
    userId: "user_1",
    trigger: { type: "manual" },
    status: "completed",
    currentStepIndex: 2,
    startedAt: "2026-09-29T01:00:00.000Z",
    completedAt: "2026-09-29T01:00:10.000Z",
    inputData: { ticket: "T-100" },
    outputData: { reply: "done" },
    steps: [
      {
        stepId: "s1",
        stepName: "AI 分类",
        stepType: "ai",
        status: "completed",
        startedAt: "2026-09-29T01:00:00.000Z",
        completedAt: "2026-09-29T01:00:02.000Z",
      },
      {
        stepId: "s2",
        stepName: "人工审批",
        stepType: "approval",
        status: "approved",
        startedAt: "2026-09-29T01:00:02.000Z",
        completedAt: "2026-09-29T01:00:08.000Z",
        approvalStatus: [
          { level: 1, status: "approved", approver: { type: "role", role: "manager" }, handledBy: "u9", comment: "ok", handledAt: "2026-09-29T01:00:08.000Z" },
        ],
      },
      {
        stepId: "s3",
        stepName: "发送回复",
        stepType: "action",
        status: "completed",
        startedAt: "2026-09-29T01:00:08.000Z",
        completedAt: "2026-09-29T01:00:10.000Z",
        retryCount: 1,
      },
    ],
    ...overrides,
  }
}

describe("toAuditReport", () => {
  it("summarizes steps, human interventions and retries", () => {
    const r = toAuditReport(makeExec())
    expect(r.schemaVersion).toBe("1.0")
    expect(r.summary.totalSteps).toBe(3)
    expect(r.summary.completed).toBe(3)
    expect(r.summary.failed).toBe(0)
    expect(r.summary.humanInterventions).toBe(1)
    expect(r.summary.retries).toBe(1)
    expect(r.totalDurationMs).toBe(10000)
  })

  it("computes per-step duration and preserves order", () => {
    const r = toAuditReport(makeExec())
    expect(r.entries.map((e) => e.seq)).toEqual([1, 2, 3])
    expect(r.entries[0].durationMs).toBe(2000)
    expect(r.entries[1].humanInvolved).toBe(true)
    expect(r.entries[0].humanInvolved).toBe(false)
  })

  it("flattens approval chains with approver label fallbacks", () => {
    const r = toAuditReport(makeExec())
    expect(r.entries[1].approvals).toHaveLength(1)
    expect(r.entries[1].approvals[0]).toMatchObject({
      level: 1,
      status: "approved",
      approver: "manager",
      handledBy: "u9",
      comment: "ok",
    })
  })

  it("marks waiting approval and failed steps", () => {
    const r = toAuditReport(
      makeExec({
        status: "failed",
        completedAt: null,
        error: "boom",
        steps: [
          { stepId: "s1", stepName: "x", stepType: "ai", status: "waiting_approval", startedAt: "2026-09-29T01:00:00.000Z", completedAt: null },
          { stepId: "s2", stepName: "y", stepType: "ai", status: "failed", startedAt: "2026-09-29T01:00:00.000Z", completedAt: "2026-09-29T01:00:01.000Z", error: "boom" },
        ],
      }),
    )
    expect(r.summary.awaitingApproval).toBe(1)
    expect(r.summary.failed).toBe(1)
    expect(r.error).toBe("boom")
    expect(r.totalDurationMs).toBeNull()
  })

  it("is a pure function (same input -> deep-equal output)", () => {
    const exec = makeExec()
    expect(toAuditReport(exec)).toEqual(toAuditReport(exec))
  })
})

describe("toAuditCsv", () => {
  it("emits a header and one row per step when no approvals", () => {
    const r = toAuditReport(
      makeExec({
        steps: [{ stepId: "s1", stepName: "AI", stepType: "ai", status: "completed", startedAt: "2026-09-29T01:00:00.000Z", completedAt: "2026-09-29T01:00:01.000Z" }],
      }),
    )
    const csv = toAuditCsv(r)
    const lines = csv.split("\n")
    expect(lines[0]).toContain("seq,stepId,stepName")
    expect(lines).toHaveLength(2)
  })

  it("expands each approval level into its own row", () => {
    const r = toAuditReport(makeExec())
    const csv = toAuditCsv(r)
    const lines = csv.split("\n")
    // header + s1 + s2(1 approval) + s3
    expect(lines).toHaveLength(4)
    const approvalRow = lines[2]
    expect(approvalRow).toContain("manager")
    expect(approvalRow).toContain("approved")
  })

  it("escapes cells containing commas and quotes", () => {
    const r = toAuditReport(
      makeExec({
        steps: [
          {
            stepId: "s1",
            stepName: 'Weird, "name"',
            stepType: "ai",
            status: "completed",
            startedAt: "2026-09-29T01:00:00.000Z",
            completedAt: "2026-09-29T01:00:01.000Z",
          },
        ],
      }),
    )
    const csv = toAuditCsv(r)
    expect(csv).toContain('"Weird, ""name"""')
  })
})
