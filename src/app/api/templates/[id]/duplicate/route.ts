import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { supabase } from "@/lib/supabase"

// POST /api/templates/[id]/duplicate — Duplicate a template
export const POST = auth(async (req, { params }) => {
  if (!req.auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { id: sourceId } = await params
    const body = await req.json()
    const customName = body?.name || null

    // Get source template
    const { data: source, error: fetchError } = await supabase
      .from("templates")
      .select("*")
      .eq("id", sourceId)
      .single()

    if (fetchError || !source) {
      return NextResponse.json({ error: "Template not found" }, { status: 404 })
    }

    // Create duplicate name
    const baseName = customName || `${source.name} - 副本`

    // Insert cloned template
    const { data: newTemplate, error: insertError } = await supabase
      .from("templates")
      .insert({
        name: baseName,
        description: source.description,
        category: source.category,
        steps: source.steps,
        config: source.config,
      })
      .select()
      .single()

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      template: newTemplate,
      message: "模板已复制",
    })
  } catch (err: any) {
    console.error("[TemplateDuplicate] Error:", err)
    return NextResponse.json(
      { error: err.message || "服务器内部错误" },
      { status: 500 }
    )
  }
})
