import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

export const GET = auth(async (req) => {
  if (!req.auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "20");
  const offset = (page - 1) * limit;

  const { data: templates, error } = await supabase
    .from("templates")
    .select("*")
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const { count } = await supabase
    .from("templates")
    .select("*", { count: "exact", head: true });

  return NextResponse.json({
    templates: templates || [],
    total: count || 0,
    page,
    limit,
  });
});

export const POST = auth(async (req) => {
  if (!req.auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = req.auth;
  const body = await req.json();

  const { name, description, category, steps, config } = body;

  if (!name) {
    return NextResponse.json({ error: "Template name is required" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("templates")
    .insert({
      name,
      description: description || "",
      category: category || "general",
      steps: steps || [],
      config: config || {},
      user_id: user.user?.id,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
});
