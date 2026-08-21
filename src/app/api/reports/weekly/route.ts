import { NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const range = searchParams.get("range") || "this-week"
    const workflowId = searchParams.get("workflow_id")

    // Calculate date range based on selection
    const now = new Date()
    let startDate: Date
    
    switch (range) {
      case "this-week":
        startDate = new Date(now)
        startDate.setDate(now.getDate() - now.getDay())
        break
      case "last-week":
        startDate = new Date(now)
        startDate.setDate(now.getDate() - now.getDay() - 7)
        break
      case "two-weeks":
        startDate = new Date(now)
        startDate.setDate(now.getDate() - 14)
        break
      case "this-month":
        startDate = new Date(now.getFullYear(), now.getMonth(), 1)
        break
      default:
        startDate = new Date(now)
        startDate.setDate(now.getDate() - 7)
    }

    const startDateStr = startDate.toISOString()
    const endDateStr = now.toISOString()

    // Build query
    let query = supabase
      .from("workflow_executions")
      .select("*", { count: "exact" })
      .gte("created_at", startDateStr)
      .lte("created_at", endDateStr)

    if (workflowId && workflowId !== "all") {
      query = query.eq("workflow_id", workflowId)
    }

    const { data: executions, error } = await query

    if (error) {
      console.error("Error fetching executions:", error)
      return NextResponse.json({ error: "Failed to fetch executions" }, { status: 500 })
    }

    if (!executions || executions.length === 0) {
      return NextResponse.json({
        week: range,
        totalExecutions: 0,
        successCount: 0,
        failedCount: 0,
        approvalCount: 0,
        rejectionCount: 0,
        avgApprovalTime: null,
        successRate: 0,
        approvalRate: 0,
        retryCount: 0,
        retryRate: 0,
        workflows: [],
        modelDistribution: {},
        dailyTrend: [],
      })
    }

    // Aggregate stats
    const totalExecutions = executions.length
    const successCount = executions.filter(e => e.status === "completed").length
    const failedCount = executions.filter(e => e.status === "failed").length
    const successRate = totalExecutions > 0 ? (successCount / totalExecutions) * 100 : 0

    const retryCount = executions.reduce((sum, e) => sum + (e.retry_count || 0), 0)
    const retryRate = totalExecutions > 0 ? (retryCount / totalExecutions) * 100 : 0

    // Get approval stats from tasks
    const { data: tasks } = await supabase
      .from("tasks")
      .select("status, approved_at, created_at")
      .gte("created_at", startDateStr)
      .lte("created_at", endDateStr)
      .in("workflow_id", executions.map(e => e.workflow_id))

    const approvalCount = tasks?.filter(t => t.status === "approved").length || 0
    const rejectionCount = tasks?.filter(t => t.status === "rejected").length || 0
    const approvalRate = (approvalCount + rejectionCount) > 0 
      ? (approvalCount / (approvalCount + rejectionCount)) * 100 
      : 0

    // Calculate average approval time
    const approvedTasks = tasks?.filter(t => t.approved_at) || []
    let avgApprovalTime: number | null = null
    if (approvedTasks.length > 0) {
      const totalTime = approvedTasks.reduce((sum, t) => {
        if (t.created_at && t.approved_at) {
          return sum + (new Date(t.approved_at).getTime() - new Date(t.created_at).getTime()) / 60000
        }
        return sum
      }, 0)
      avgApprovalTime = totalTime / approvedTasks.length
    }

    // Per-workflow breakdown
    const workflowMap = new Map<string, { name: string; executions: number; successCount: number; failedCount: number }>()
    
    for (const exec of executions) {
      if (!workflowMap.has(exec.workflow_id)) {
        workflowMap.set(exec.workflow_id, {
          name: exec.workflow_id,
          executions: 0,
          successCount: 0,
          failedCount: 0,
        })
      }
      const wf = workflowMap.get(exec.workflow_id)!
      wf.executions++
      if (exec.status === "completed") wf.successCount++
      if (exec.status === "failed") wf.failedCount++
    }

    const workflows = Array.from(workflowMap.values()).map(wf => ({
      id: wf.name,
      name: wf.name,
      executions: wf.executions,
      successRate: wf.executions > 0 ? ((wf.successCount / wf.executions) * 100) : 0,
    }))

    // AI model distribution from audit_logs
    const { data: auditLogs } = await supabase
      .from("audit_logs")
      .select("action, details")
      .gte("created_at", startDateStr)
      .lte("created_at", endDateStr)
      .in("action", ["ai_executed", "ai_failed"])

    const modelDistribution: Record<string, number> = {}
    auditLogs?.forEach((log: any) => {
      const model = log.details?.model ?? "unknown"
      modelDistribution[model] = (modelDistribution[model] ?? 0) + 1
    })

    // Daily trend (last 7 days)
    const dailyTrend: Array<{ date: string; label: string; executions: number; success: number; failed: number }> = []
    for (let i = 6; i >= 0; i--) {
      const day = new Date()
      day.setDate(day.getDate() - i)
      const dayStart = new Date(day.getFullYear(), day.getMonth(), day.getDate())
      const dayEnd = new Date(dayStart)
      dayEnd.setDate(dayEnd.getDate() + 1)

      const { data: dayExecs, count: dayCount } = await supabase
        .from("workflow_executions")
        .select("id, status", { count: "exact" })
        .gte("created_at", dayStart.toISOString())
        .lt("created_at", dayEnd.toISOString())

      const successDay = dayExecs?.filter((e: any) => e.status === "completed").length ?? 0
      const failedDay = dayExecs?.filter((e: any) => e.status === "failed").length ?? 0

      dailyTrend.push({
        date: dayStart.toISOString().slice(0, 10),
        label: `${day.getMonth() + 1}/${day.getDate()}`,
        executions: dayCount ?? 0,
        success: successDay,
        failed: failedDay,
      })
    }

    return NextResponse.json({
      week: range,
      totalExecutions,
      successCount,
      failedCount,
      approvalCount,
      rejectionCount,
      avgApprovalTime: Math.round(avgApprovalTime || 0),
      successRate,
      approvalRate,
      retryCount,
      retryRate,
      workflows,
      modelDistribution,
      dailyTrend,
    })
  } catch (err) {
    console.error("Weekly report error:", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
