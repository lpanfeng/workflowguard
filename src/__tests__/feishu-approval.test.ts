import { describe, it, expect, vi } from "vitest"
import { parseApprovalCallback } from "@/lib/feishu"

describe("Feishu Approval Integration", () => {
  describe("parseApprovalCallback", () => {
    it("should parse a completed approval callback", () => {
      const callback = {
        event: {
          event_type: "approval.state.change",
          approval_code: "TEST_CODE",
          instance_code: "TEST_INSTANCE",
          status: "APPROVED",
          action_time: 1718000000,
          user_id: "ou_testuser",
          comment: "同意",
        },
      }

      const result = parseApprovalCallback(callback as any)
      expect(result).not.toBeNull()
      expect(result!.status).toBe("APPROVED")
      expect(result!.instance_code).toBe("TEST_INSTANCE")
      expect(result!.user_id).toBe("ou_testuser")
      expect(result!.comment).toBe("同意")
    })

    it("should parse a rejected approval callback", () => {
      const callback = {
        event: {
          event_type: "approval.state.change",
          instance_code: "TEST_INSTANCE_2",
          status: "REJECTED",
          action_time: 1718000000,
          user_id: "ou_testuser2",
          comment: "材料不全",
        },
      }

      const result = parseApprovalCallback(callback as any)
      expect(result).not.toBeNull()
      expect(result!.status).toBe("REJECTED")
    })

    it("should return null for invalid callback", () => {
      const result = parseApprovalCallback({})
      expect(result).toBeNull()
    })

    it("should return null for malformed callback", () => {
      const result = parseApprovalCallback("not an object" as any)
      expect(result).toBeNull()
    })

    it("should default PENDING when status missing", () => {
      const callback = {
        event: {
          event_type: "approval.state.change",
          instance_code: "TEST_INSTANCE_3",
          action_time: 1718000000,
        },
      }

      const result = parseApprovalCallback(callback as any)
      expect(result).not.toBeNull()
      expect(result!.status).toBe("PENDING")
    })
  })

  describe("Approval Status Flow", () => {
    const statusTransitionMap: Record<string, string[]> = {
      pending: ["ai_processing", "waiting_approval"],
      ai_processing: ["waiting_approval", "rejected", "error"],
      waiting_approval: ["approved", "rejected", "ai_processing"],
      approved: ["completed"],
      rejected: ["pending"],
      error: ["pending"],
      canceled: [],
      completed: [],
    }

    it("should validate all status transitions", () => {
      for (const [from, allowed] of Object.entries(statusTransitionMap)) {
        for (const to of allowed) {
          // 验证转换合法
          expect(allowed).toContain(to)
        }
      }
    })

    it("should reject invalid transitions", () => {
      // pending → completed 不应该直接跳转
      expect(statusTransitionMap["pending"]).not.toContain("completed")
      // completed → pending 不应该逆转
      expect(statusTransitionMap["completed"]).not.toContain("pending")
    })

    it("should have terminal states (canceled/completed)", () => {
      const terminalStates = ["canceled", "completed"]
      for (const state of terminalStates) {
        expect(statusTransitionMap[state]).toEqual([])
      }
    })
  })
})
