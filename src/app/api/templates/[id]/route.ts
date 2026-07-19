import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

// GET /api/templates/[id] - Get single template
export const GET = auth(async (req, context) => {
  if (!req.auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const params = await context.params;
  const { data: template, error } = await supabase
    .from("templates")
    .select("*")
    .eq("id", params.id)
    .single();

  if (error || !template) {
    return NextResponse.json({ error: "Template not found" }, { status: 404 });
  }

  return NextResponse.json(template);
});

// PATCH /api/templates/[id] - Update template
export const PATCH = auth(async (req, context) => {
  if (!req.auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const params = await context.params;
  const body = await req.json();
  const { name, description, category, steps } = body;

  if (!name) {
    return NextResponse.json({ error: "Template name is required" }, { status: 400 });
  }

  const updateData: Record<string, any> = {
    name,
    description: description || "",
    category: category || "general",
    steps: steps || [],
    updated_at: new Date().toISOString(),
  };

  const { data: template, error } = await supabase
    .from("templates")
    .update(updateData)
    .eq("id", params.id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(template);
});

// DELETE /api/templates/[id] - Delete template
export const DELETE = auth(async (req, context) => {
  if (!req.auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const params = await context.params;
  const { error } = await supabase
    .from("templates")
    .delete()
    .eq("id", params.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
});
