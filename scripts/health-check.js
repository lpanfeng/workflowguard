import { getNextCronExecution } from "./src/lib/cron-scheduler-enhanced.js";
import { createClient } from "@supabase/supabase-js";
import fs from "fs";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

async function checkHealth() {
  console.log("=== WorkflowGuard Cron Scheduler Health Check ===\n");

  const { data: workflows, error: wfError } = await supabaseAdmin
    .from("workflows")
    .select("*")
    .order("created_at", { ascending: false });

  if (wfError) {
    console.error("❌ Error getting workflows:", wfError);
    return;
  }

  console.log(`📊 Total Workflows: ${workflows?.length || 0}`);

  const activeWorkflows = workflows?.filter(w => w.is_active) || [];
  console.log(`✅ Active Workflows: ${activeWorkflows.length}`);

  const cronWorkflows = activeWorkflows.filter(w => {
    const cfg = w.config || {};
    return cfg.trigger?.type === "cron";
  });
  console.log(`⏰ Cron-enabled Workflows: ${cronWorkflows.length}`);

  const schedulerPath = "src/lib/cron-scheduler-enhanced.ts";
  const exists = fs.existsSync(schedulerPath);
  console.log(`📁 Scheduler file exists: ${exists ? "✅" : "❌"}`);

  console.log("\n🧪 Testing cron expression parsing:");
  const testCrons = [
    "* * * * *",
    "0 * * * *",
    "0 0 * * *",
    "0 9 * * 1-5",
  ];
  for (const expr of testCrons) {
    const next = getNextCronExecution(expr);
    console.log(`  ${expr}: ${next ? next.toISOString() : "Invalid"}`);
  }

  const { data: recentExecs, error: execError } = await supabaseAdmin
    .from("workflow_executions")
    .select("id, status, started_at, workflow_id")
    .order("started_at", { ascending: false })
    .limit(10);

  if (!execError) {
    console.log("\n🔍 Recent Executions (last 10):");
    recentExecs?.forEach(exec => {
      console.log(`  [${exec.status}] ${exec.workflow_id} @ ${new Date(exec.started_at).toLocaleTimeString()}`);
    });
  }

  const { data: auditLogs, error: auditError } = await supabaseAdmin
    .from("audit_logs")
    .select("count")
    .eq("action", "workflow_execution_started");

  const logCount = auditError ? "unknown" : auditLogs?.[0]?.count || 0;
  console.log(`\nℹ️  Audit Log Count (workflow_execution_started): ${logCount}`);

  console.log("\n🔐 Environment Variables:");
  const required = ["NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "AUTH_SECRET"];
  for (const key of required) {
    console.log(`  ${key}: ${process.env[key] ? "✅ Configured" : "❌ MISSING"}`);
  }

  console.log("\n=== Health Check Complete ===");
}

checkHealth().catch(err => {
  console.error("Health check failed:", err);
  process.exit(1);
});
