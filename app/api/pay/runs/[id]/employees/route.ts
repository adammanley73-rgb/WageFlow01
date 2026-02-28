// C:\Projects\wageflow01\app\api\pay\runs\[id]\employees\route.ts

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

type RouteContext = { params: Promise<{ id: string }> };

type PayrollRunEmployeeRow = {
  id: string;
  employee_id: string | null;
  calc_mode: string | null;
  company_id: string | null;
  run_id: string | null;
};

type JsonError = {
  ok: false;
  error: string;
  message?: string;
  details?: string;
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

export async function GET(_req: Request, { params }: RouteContext) {
  try {
    const supabase = await createClient();

    const { data: auth, error: authErr } = await supabase.auth.getUser();
    if (authErr || !auth?.user) {
      return NextResponse.json({ ok: false, error: "UNAUTHENTICATED" } satisfies JsonError, { status: 401 });
    }

    const companyId = await readActiveCompanyId();
    if (!companyId) {
      return NextResponse.json(
        { ok: false, error: "ACTIVE_COMPANY_NOT_SET", message: "No active company selected." } satisfies JsonError,
        { status: 400 }
      );
    }

    const resolvedParams = await params;
    const runId = String(resolvedParams?.id ?? "").trim();
    if (!runId) {
      return NextResponse.json({ ok: false, error: "MISSING_RUN_ID" } satisfies JsonError, { status: 400 });
    }

    const { data, error } = await supabase
      .from("payroll_run_employees")
      .select("id, employee_id, calc_mode, company_id, run_id")
      .eq("company_id", companyId)
      .eq("run_id", runId)
      .returns<PayrollRunEmployeeRow[]>();

    if (error) {
      return NextResponse.json(
        {
          ok: false,
          error: "LOAD_FAILED",
          message: "Failed to load payroll run employees.",
          details: (error as any)?.message ?? String(error),
        } satisfies JsonError,
        { status: statusFromErr(error) }
      );
    }

    const rows = Array.isArray(data) ? data : [];

    const items = rows.map((r) => ({
      id: String(r.id),
      employee_id: r.employee_id ? String(r.employee_id) : null,
      status: String(r.calc_mode ?? "uncomputed"),
    }));

    return NextResponse.json({ ok: true, runId, items }, { status: 200 });
  } catch (err: unknown) {
    const msg = err && typeof err === "object" && "message" in err ? String((err as any).message) : String(err);
    return NextResponse.json(
      {
        ok: false,
        error: "UNEXPECTED_ERROR",
        message: "Unexpected failure while loading payroll run employees.",
        details: msg,
      } satisfies JsonError,
      { status: 500 }
    );
  }
}