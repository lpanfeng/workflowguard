/**
 * Template Upload API
 * Accepts CSV uploads and parses them into workflow steps.
 * 
 * Expected CSV format:
 * step_order,step_name,step_type,description,prompt_template
 * 1,接收咨询,action,接收客户咨询内容,
 * 2,AI生成回复,ai_execute,AI根据上下文生成回复草稿,"你是一个专业的客服助手..."
 * 3,人工审核,human_approve,审核AI生成的回复,
 * 4,发送回复,action,确认后发送给客户,
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

interface ParsedRow {
  step_order: number;
  step_name: string;
  step_type: "ai_execute" | "human_approve" | "notify" | "action";
  description: string;
  prompt_template: string;
}

function parseCSV(text: string): ParsedRow[] {
  const lines = text.trim().split("\n");
  if (lines.length < 2) {
    throw new Error("CSV 文件至少需要表头 + 1行数据");
  }

  const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());
  const requiredHeaders = ["step_order", "step_name", "step_type", "description"];
  for (const rh of requiredHeaders) {
    if (!headers.includes(rh)) {
      throw new Error(`缺少必需列: ${rh}`);
    }
  }

  const rows: ParsedRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue; // skip empty lines

    // Simple CSV parser (handles quoted fields)
    const values: string[] = [];
    let current = "";
    let inQuotes = false;
    for (const ch of line) {
      if (ch === '"') {
        inQuotes = !inQuotes;
      } else if (ch === "," && !inQuotes) {
        values.push(current.trim());
        current = "";
      } else {
        current += ch;
      }
    }
    values.push(current.trim());

    if (values.length < 4) continue;

    const row: ParsedRow = {
      step_order: parseInt(values[headers.indexOf("step_order")] || "0", 10),
      step_name: values[headers.indexOf("step_name")] || "",
      step_type: (values[headers.indexOf("step_type")] || "action") as ParsedRow["step_type"],
      description: values[headers.indexOf("description")] || "",
      prompt_template: values[headers.indexOf("prompt_template")] || "",
    };

    // Validate
    if (!row.step_name) continue;
    if (isNaN(row.step_order) || row.step_order < 1) continue;
    const validTypes = ["ai_execute", "human_approve", "notify", "action"];
    if (!validTypes.includes(row.step_type)) continue;

    rows.push(row);
  }

  // Sort by step_order
  rows.sort((a, b) => a.step_order - b.step_order);

  if (rows.length === 0) {
    throw new Error("CSV 中没有有效的数据行");
  }

  return rows;
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "请先登录" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File;
    if (!file) {
      return NextResponse.json({ error: "请上传文件" }, { status: 400 });
    }

    // Validate file type
    if (!file.name.endsWith(".csv")) {
      return NextResponse.json({ error: "只支持 .csv 文件格式" }, { status: 400 });
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: "文件大小不能超过 5MB" }, { status: 400 });
    }

    const csvText = await file.text();
    const parsedRows = parseCSV(csvText);

    // Check for duplicate step_order
    const orders = parsedRows.map((r) => r.step_order);
    const uniqueOrders = new Set(orders);
    if (uniqueOrders.size !== orders.length) {
      return NextResponse.json(
        { error: "存在重复的步骤序号，请检查 CSV", details: parsedRows },
        { status: 400 }
      );
    }

    // Return parsed data for preview
    return NextResponse.json({
      success: true,
      rows: parsedRows,
      rowCount: parsedRows.length,
    });
  } catch (error: any) {
    console.error("Template upload error:", error);
    return NextResponse.json(
      { error: error.message || "上传失败" },
      { status: 400 }
    );
  }
}
