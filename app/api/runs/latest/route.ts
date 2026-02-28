// C:\Projects\wageflow01\app\api\runs\latest\route.ts

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

type PayrollRunRow = {
  id: string;
  company_id: string | null;
  run_number: number | null;
  run_name: string | null;
  created_at: string | null;
};

async function readActiveCompanyId(): Promise<string | null> {
  const jar = await cookies();

  const a = String(jar.get("active_company_id")?.value ?? "").trim();
  if (a) return a;

  const legacy = String(jar.get("company_id")?.value ?? "").trim();
  if (legacy) return legacy;

  return null;
}

function statusFromErr(err: unknown, fallback = 500): number {
  const anyErr = err as { status?: unknown } | null;
  const s = Number(anyErr?.status);
  if (s === 400 || s === 401 || s === 403 || s === 404 || s === 409) return s;
  return fallback;
}

export async function GET() {
  try {
    const supabase = await createClient();

    const { data: auth, error: authErr } = await supabase.auth.getUser();
    if (authErr || !auth?.user) {
      return NextResponse.json({ ok: false, error: "UNAUTHENTICATED" }, { status: 401 });
    }

    const companyId = await readActiveCompanyId();
    if (!companyId) {
      return NextResponse.json(
        { ok: false, error: "ACTIVE_COMPANY_NOT_SET", message: "No active company selected." },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("payroll_runs")
      .select("id, company_id, run_number, run_name, created_at")
      .eq("company_id", companyId)
      .order("created_at", { ascending: false })
      .limit(1)
      .returns<PayrollRunRow[]>();

    if (error) {
      return NextResponse.json(
        {
          ok: false,
          error: "LOAD_FAILED",
          message: "Failed to load latest payroll run.",
          details: (error as any)?.message ?? String(error),
        },
        { status: statusFromErr(error) }
      );
    }

    const row = Array.isArray(data) && data.length > 0 ? data[0] : null;
    if (!row) {
      return NextResponse.json({ ok: false, error: "NO_RUNS_FOUND" }, { status: 404 });
    }

    return NextResponse.json({
      ok: true,
      id: row.id,
      run_number: row.run_number ?? row.run_name ?? null,
      created_at: row.created_at,
    });
  } catch (err: unknown) {
    const msg = err && typeof err === "object" && "message" in err ? String((err as any).message) : String(err);
    return NextResponse.json(
      {
        ok: false,
        error: "UNEXPECTED_ERROR",
        message: "Unexpected failure while loading latest payroll run.",
        details: msg,
      },
      { status: 500 }
    );
  }
}