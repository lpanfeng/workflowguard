import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

/**
 * GET /api/templates/stats
 * Returns usage statistics for all templates
 */
export const GET = auth(async (req) => {
  if (!req.auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Count workflows per template
    let templateUsage: Record<string, number> = {};

    const { data: workflows } = await supabase
      .from("workflows")
      .select("template_id")
      .neq("template_id", null);

    if (workflows) {
      for (const w of workflows) {
        const tid = w.template_id;
        if (tid) {
          templateUsage[tid] = (templateUsage[tid] || 0) + 1;
        }
      }
    }

    return NextResponse.json({
      template_usage: templateUsage,
      total_workflows: workflows?.length || 0,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
});
