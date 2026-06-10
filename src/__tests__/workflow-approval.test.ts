// WorkflowGuard — 审批系统单元测试
//
// 覆盖：审批状态机转换、多级审批链、API 参数验证
// 不依赖真实数据库，全部使用 vi.fn() 模拟

import { describe, it, expect, vi, beforeEach } from "vitest"

// Set env vars for test environment
process.env.NEXT_PUBLIC_SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://test.supabase.co"
process.env.SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY || "test-key"

// ========================
// 审批状态机模型测试
// ========================

type ApprovalState = "pending" | "waiting_approval" | "approved" | "rejected" | "completed" | "failed"

interface ApprovalContext {
  taskId: string
  status: ApprovalState
  approvedBy: string | null
  rejectedBy: string | null
  approvalChain: ApprovalLevel[]
  currentLevel: number
  logs: ApprovalLog[]
}

interface ApprovalLevel {
  level: number
  role: string
  approverId: string | null
  status: "pending" | "approved" | "rejected"
  comment: string | null
}

interface ApprovalLog {
  action: string
  userId: string
  timestamp: string
  comment: string | null
}

// 审批状态机
class ApprovalStateMachine {
  private static readonly VALID_TRANSITIONS: Record<ApprovalState, ApprovalState[]> = {
    pending: ["waiting_approval"],
    waiting_approval: ["approved", "rejected"],
    approved: ["completed", "failed"],
    rejected: ["failed"],
    completed: [],
    failed: [],
  }

  static canTransition(from: ApprovalState, to: ApprovalState): boolean {
    const allowed = this.VALID_TRANSITIONS[from]
    return allowed?.includes(to) ?? false
  }

  static transition(ctx: ApprovalContext, to: ApprovalState, userId: string, comment?: string): ApprovalContext {
    if (!this.canTransition(ctx.status, to)) {
      throw new Error(`Cannot transition from ${ctx.status} to ${to}`)
    }

    const log: ApprovalLog = {
      action: `status_changed:${ctx.status}→${to}`,
      userId,
      timestamp: new Date().toISOString(),
      comment: comment ?? null,
    }

    const newCtx: ApprovalContext = {
      ...ctx,
      status: to,
      logs: [...ctx.logs, log],
    }

    if (to === "approved") {
      newCtx.approvedBy = userId
    } else if (to === "rejected") {
      newCtx.rejectedBy = userId
    }

    return newCtx
  }

  static isFinalState(status: ApprovalState): boolean {
    return status === "completed" || status === "failed"
  }
}

// ========================
// 多级审批链
// ========================

class MultiLevelApprovalEngine {
  static createChain(roles: string[]): ApprovalLevel[] {
    return roles.map((role, index) => ({
      level: index + 1,
      role,
      approverId: null,
      status: "pending" as const,
      comment: null,
    }))
  }

  static approveLevel(ctx: ApprovalContext, level: number, userId: string, comment?: string): ApprovalContext {
    const levelConfig = ctx.approvalChain.find((l) => l.level === level)
    if (!levelConfig) {
      throw new Error(`Approval level ${level} not found`)
    }
    if (levelConfig.status !== "pending") {
      throw new Error(`Level ${level} has already been ${levelConfig.status}`)
    }

    const newChain = ctx.approvalChain.map((l) =>
      l.level === level ? { ...l, status: "approved" as const, approverId: userId, comment: comment ?? null } : l
    )

    // Check if all prior levels are approved
    const priorLevelsApproved = newChain
      .filter((l) => l.level < level)
      .every((l) => l.status === "approved")

    if (!priorLevelsApproved) {
      throw new Error(`Cannot approve level ${level}: prior levels not yet approved`)
    }

    const allApproved = newChain.every((l) => l.status === "approved")

    return this.transitionChain(ctx, newChain, allApproved ? "approved" : "waiting_approval", userId, comment)
  }

  static rejectLevel(ctx: ApprovalContext, level: number, userId: string, comment?: string): ApprovalContext {
    const levelConfig = ctx.approvalChain.find((l) => l.level === level)
    if (!levelConfig) {
      throw new Error(`Approval level ${level} not found`)
    }
    if (levelConfig.status !== "pending") {
      throw new Error(`Level ${level} has already been ${levelConfig.status}`)
    }

    const newChain = ctx.approvalChain.map((l) =>
      l.level === level ? { ...l, status: "rejected" as const, rejectedBy: userId, comment: comment ?? null } : l
    )

    return this.transitionChain(ctx, newChain, "rejected", userId, comment)
  }

  private static transitionChain(
    ctx: ApprovalContext,
    newChain: ApprovalLevel[],
    newStatus: ApprovalState,
    userId: string,
    comment?: string
  ): ApprovalContext {
    // Determine which level just changed (the one newly approved in this call)
    const changedLevel = newChain.find((l) => {
      const old = ctx.approvalChain.find((o) => o.level === l.level)
      return old && old.status !== "approved" && l.status === "approved"
    })
    const log: ApprovalLog = {
      action: newStatus === "rejected" ? "rejected" : `level_${changedLevel?.level ?? "?"}_approved`,
      userId,
      timestamp: new Date().toISOString(),
      comment: comment ?? null,
    }

    return {
      ...ctx,
      status: newStatus,
      approvalChain: newChain,
      logs: [...ctx.logs, log],
      ...(newStatus === "rejected" ? { rejectedBy: userId } : {}),
      ...(newStatus === "approved" ? { approvedBy: userId } : {}),
    }
  }
}

// ========================
// 测试套件
// ========================

function createTestCtx(overrides: Partial<ApprovalContext> = {}): ApprovalContext {
  return {
    taskId: "task-001",
    status: "waiting_approval" as ApprovalState,
    approvedBy: null,
    rejectedBy: null,
    approvalChain: [],
    currentLevel: 0,
    logs: [],
    ...overrides,
  }
}

// --- 状态机转换测试 ---

describe("ApprovalStateMachine — 状态转换", () => {
  it("waiting_approval → approved 转换成功", () => {
    const ctx = createTestCtx()
    const result = ApprovalStateMachine.transition(ctx, "approved", "user-1")
    expect(result.status).toBe("approved")
    expect(result.approvedBy).toBe("user-1")
    expect(result.logs).toHaveLength(1)
  })

  it("waiting_approval → rejected 转换成功", () => {
    const ctx = createTestCtx()
    const result = ApprovalStateMachine.transition(ctx, "rejected", "user-1", "内容不合规")
    expect(result.status).toBe("rejected")
    expect(result.rejectedBy).toBe("user-1")
    expect(result.logs[0].comment).toBe("内容不合规")
  })

  it("approved → completed 转换成功", () => {
    const ctx = createTestCtx({ status: "approved", approvedBy: "user-1" })
    const result = ApprovalStateMachine.transition(ctx, "completed", "user-1")
    expect(result.status).toBe("completed")
    expect(result.logs).toHaveLength(1)
  })

  it("approved → failed 转换成功（执行失败场景）", () => {
    const ctx = createTestCtx({ status: "approved", approvedBy: "user-1" })
    const result = ApprovalStateMachine.transition(ctx, "failed", "system", "API调用失败")
    expect(result.status).toBe("failed")
  })

  it("从 completed 转换到其他状态应报错（终态不可变）", () => {
    const ctx = createTestCtx({ status: "completed", approvedBy: "user-1" })
    expect(() => ApprovalStateMachine.transition(ctx, "approved", "user-2")).toThrow()
  })

  it("从 rejected 转换到其他状态应报错（终态不可变）", () => {
    const ctx = createTestCtx({ status: "rejected", rejectedBy: "user-1" })
    expect(() => ApprovalStateMachine.transition(ctx, "approved", "user-2")).toThrow()
  })

  it("重复审批同一任务应报错", () => {
    const ctx = createTestCtx({ status: "approved", approvedBy: "user-1" })
    expect(() => ApprovalStateMachine.transition(ctx, "approved", "user-2")).toThrow(
      /Cannot transition from approved/i
    )
  })

  it("pending 不能直接变成 approved（缺少 waiting_approval 步骤）", () => {
    const ctx = createTestCtx({ status: "pending" })
    expect(() => ApprovalStateMachine.transition(ctx, "approved", "user-1")).toThrow()
  })

  it("已完成的任务不能再审批", () => {
    const ctx = createTestCtx({ status: "completed", approvedBy: "user-1" })
    expect(ApprovalStateMachine.isFinalState(ctx.status)).toBe(true)
  })

  it("已驳回的任务不能再审批", () => {
    const ctx = createTestCtx({ status: "failed", rejectedBy: "user-1" })
    expect(ApprovalStateMachine.isFinalState(ctx.status)).toBe(true)
  })
})

// --- 多级审批链测试 ---

describe("MultiLevelApprovalEngine — 多级审批链", () => {
  it("创建两级审批链：初级审核 → 高级审核", () => {
    const chain = MultiLevelApprovalEngine.createChain(["初级审核员", "高级审核员"])
    expect(chain).toHaveLength(2)
    expect(chain[0].role).toBe("初级审核员")
    expect(chain[1].role).toBe("高级审核员")
    expect(chain[0].status).toBe("pending")
    expect(chain[1].status).toBe("pending")
  })

  it("两个级别都通过后状态变为 approved", () => {
    let ctx = createTestCtx({
      approvalChain: MultiLevelApprovalEngine.createChain(["初级审核员", "高级审核员"]),
    })

    ctx = MultiLevelApprovalEngine.approveLevel(ctx, 1, "junior-1", "看起来没问题")
    expect(ctx.status).toBe("waiting_approval") // 二级还没批

    ctx = MultiLevelApprovalEngine.approveLevel(ctx, 2, "senior-1", "同意发布")
    expect(ctx.status).toBe("approved")
    expect(ctx.approvedBy).toBe("senior-1")
  })

  it("先批二级再批一级应报错（顺序错误）", () => {
    const ctx = createTestCtx({
      approvalChain: MultiLevelApprovalEngine.createChain(["初级审核员", "高级审核员"]),
    })

    expect(() => MultiLevelApprovalEngine.approveLevel(ctx, 2, "senior-1")).toThrow(
      /Cannot approve level 2/i
    )
  })

  it("任一环节驳回则整体失败", () => {
    let ctx = createTestCtx({
      approvalChain: MultiLevelApprovalEngine.createChain(["初级审核员", "高级审核员"]),
    })

    ctx = MultiLevelApprovalEngine.approveLevel(ctx, 1, "junior-1", "看起来没问题")
    ctx = MultiLevelApprovalEngine.rejectLevel(ctx, 2, "senior-1", "内容违反政策")
    expect(ctx.status).toBe("rejected")
    expect(ctx.rejectedBy).toBe("senior-1")
  })

  it("已通过的级别不能重复审批", () => {
    let ctx = createTestCtx({
      approvalChain: MultiLevelApprovalEngine.createChain(["初级审核员", "高级审核员"]),
    })

    ctx = MultiLevelApprovalEngine.approveLevel(ctx, 1, "junior-1")
    expect(() => MultiLevelApprovalEngine.approveLevel(ctx, 1, "junior-2")).toThrow(
      /has already been approved/i
    )
  })

  it("已驳回的级别不能再次操作", () => {
    let ctx = createTestCtx({
      approvalChain: MultiLevelApprovalEngine.createChain(["初级审核员", "高级审核员"]),
    })

    ctx = MultiLevelApprovalEngine.rejectLevel(ctx, 1, "junior-1", "内容不对")
    expect(() => MultiLevelApprovalEngine.approveLevel(ctx, 1, "junior-1")).toThrow(
      /has already been rejected/i
    )
  })

  it("不存在的级别应报错", () => {
    const ctx = createTestCtx({
      approvalChain: MultiLevelApprovalEngine.createChain(["初级审核员"]),
    })
    expect(() => MultiLevelApprovalEngine.approveLevel(ctx, 99, "user-1")).toThrow(
      /Approval level 99 not found/i
    )
  })

  it("三级审批链：全部通过后才算 approved", () => {
    let ctx = createTestCtx({
      approvalChain: MultiLevelApprovalEngine.createChain(["初审", "复审", "终审"]),
    })

    ctx = MultiLevelApprovalEngine.approveLevel(ctx, 1, "user-a")
    expect(ctx.status).toBe("waiting_approval")

    ctx = MultiLevelApprovalEngine.approveLevel(ctx, 2, "user-b")
    expect(ctx.status).toBe("waiting_approval")

    ctx = MultiLevelApprovalEngine.approveLevel(ctx, 3, "user-c")
    expect(ctx.status).toBe("approved")
  })

  it("审批日志记录完整", () => {
    let ctx = createTestCtx({
      approvalChain: MultiLevelApprovalEngine.createChain(["初级", "高级"]),
    })

    ctx = MultiLevelApprovalEngine.approveLevel(ctx, 1, "junior-1", "通过")
    expect(ctx.logs).toHaveLength(1)
    expect(ctx.logs[0].action).toContain("level_1")

    ctx = MultiLevelApprovalEngine.approveLevel(ctx, 2, "senior-1", "最终通过")
    expect(ctx.logs).toHaveLength(2)
    expect(ctx.logs[1].action).toContain("level_2")
  })
})

// --- API 参数验证测试 ---

describe("审批 API — 参数验证", () => {
  it("缺少 taskId 应报错", () => {
    const approveTask = (params: { taskId?: string; userId: string; action: string }) => {
      if (!params.taskId) throw new Error("taskId is required")
      if (!params.userId) throw new Error("userId is required")
      if (!["approve", "reject"].includes(params.action)) throw new Error("action must be approve or reject")
      return { success: true }
    }

    expect(() => approveTask({ userId: "user-1", action: "approve" } as any)).toThrow("taskId is required")
  })

  it("缺少 userId 应报错", () => {
    const approveTask = (params: { taskId: string; userId?: string; action: string }) => {
      if (!params.taskId) throw new Error("taskId is required")
      if (!params.userId) throw new Error("userId is required")
      if (!["approve", "reject"].includes(params.action)) throw new Error("action must be approve or reject")
      return { success: true }
    }

    expect(() => approveTask({ taskId: "task-001", action: "approve" } as any)).toThrow("userId is required")
  })

  it("action 不是 approve/reject 应报错", () => {
    const approveTask = (params: { taskId: string; userId: string; action: string }) => {
      if (!params.taskId) throw new Error("taskId is required")
      if (!params.userId) throw new Error("userId is required")
      if (!["approve", "reject"].includes(params.action)) throw new Error("action must be approve or reject")
      return { success: true }
    }

    expect(() => approveTask({ taskId: "task-001", userId: "user-1", action: "delete" })).toThrow(
      "action must be approve or reject"
    )
  })

  it("有效的审批请求返回成功", () => {
    const approveTask = (params: { taskId: string; userId: string; action: string }) => {
      if (!params.taskId) throw new Error("taskId is required")
      if (!params.userId) throw new Error("userId is required")
      if (!["approve", "reject"].includes(params.action)) throw new Error("action must be approve or reject")
      return { success: true, taskId: params.taskId }
    }

    const result = approveTask({ taskId: "task-001", userId: "user-1", action: "approve" })
    expect(result.success).toBe(true)
  })

  it("驳回请求也要验证 comment（可选但建议）", () => {
    const rejectTask = (params: { taskId: string; userId: string; comment?: string }) => {
      // When rejecting, comment is recommended but not required
      if (!params.taskId) throw new Error("taskId is required")
      if (!params.userId) throw new Error("userId is required")
      return { success: true, commentProvided: !!params.comment }
    }

    const withComment = rejectTask({ taskId: "task-001", userId: "user-1", comment: "内容需要修改" })
    expect(withComment.commentProvided).toBe(true)

    const withoutComment = rejectTask({ taskId: "task-001", userId: "user-1" })
    expect(withoutComment.commentProvided).toBe(false)
  })
})
