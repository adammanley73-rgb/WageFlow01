// C:\Projects\wageflow01\app\api\payroll\supplementary\lookup\route.ts

import { NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function json(status: number, body: any) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const parentRunId = url.searchParams.get("parent_run_id");

    if (!parentRunId) {
      return json(400, {
        error: "MISSING_PARENT_RUN_ID",
        message: "parent_run_id is required",
      });
    }

    const supabase = await getServerSupabase();

    const { data, error } = await supabase
      .from("payroll_runs")
      .select("id,status")
      .eq("parent_run_id", parentRunId)
      .order("created_at", { ascending: false })
      .limit(1);

    if (error) {
      return json(500, {
        error: "DB_ERROR",
        message: error.message,
      });
    }

    const row = data && data.length ? (data[0] as any) : null;

    return json(200, {
      parent_run_id: parentRunId,
      exists: Boolean(row?.id),
      supplementary_run_id: row?.id ?? null,
      supplementary_status: row?.status ?? null,
    });
  } catch {
    return json(500, {
      error: "UNEXPECTED_ERROR",
      message: "Unexpected error while looking up supplementary run.",
    });
  }
}