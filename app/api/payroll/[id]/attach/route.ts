// C:\Projects\wageflow01\app\api\payroll\[id]\attach\route.ts

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

function statusFromErr(err: any, fallback = 500): number {
  const s = Number(err?.status);
  if (s === 400 || s === 401 || s === 403 || s === 404 || s === 409) return s;
  return fallback;
}

export async function POST(_req: Request, { params }: Ctx) {
  const supabase = await createClient();

  const { data: auth, error: authErr } = await supabase.auth.getUser();
  if (authErr || !auth?.user) {
    return NextResponse.json({ ok: false, error: "UNAUTHENTICATED" }, { status: 401 });
  }

  const resolvedParams = await params;
  const runId = resolvedParams?.id;
  if (!runId) {
    return NextResponse.json({ ok: false, error: "RUN_ID_MISSING" }, { status: 400 });
  }

  try {
    // 1) Load the payroll run (RLS-scoped)
    const { data: runRow, error: runError } = await supabase
      .from("payroll_runs")
      .select("id, company_id")
      .eq("id", runId)
      .maybeSingle();

    if (runError) {
      return NextResponse.json(
        { ok: false, error: "RUN_LOAD_FAILED", details: runError.message },
        { status: statusFromErr(runError) },
      );
    }

    // If RLS hides it, treat as not found (no cross-tenant leakage)
    if (!runRow?.company_id) {
      return NextResponse.json({ ok: false, error: "RUN_NOT_FOUND" }, { status: 404 });
    }

    const companyId = String(runRow.company_id);

    // 2) Load all employees for this company (RLS-scoped)
    const { data: employeeRows, error: empError } = await supabase
      .from("employees")
      .select("id")
      .eq("company_id", companyId);

    if (empError) {
      return NextResponse.json(
        { ok: false, error: "EMPLOYEE_LOAD_FAILED", details: empError.message },
        { status: statusFromErr(empError) },
      );
    }

    const allEmployeeIds = (employeeRows ?? [])
      .map((r: any) => String(r.id))
      .filter((v: string) => !!v);

    // 3) Load existing payroll_run_employees for this run (RLS-scoped)
    const { data: existingRows, error: existingError } = await supabase
      .from("payroll_run_employees")
      .select("employee_id")
      .eq("run_id", runId);

    if (existingError) {
      return NextResponse.json(
        { ok: false, error: "EXISTING_LOAD_FAILED", details: existingError.message },
        { status: statusFromErr(existingError) },
      );
    }

    const existingIds = new Set<string>(
      (existingRows ?? []).map((r: any) => String(r.employee_id)),
    );

    // 4) Determine which employee_ids are missing
    const newEmployeeIds = allEmployeeIds.filter((id) => !existingIds.has(id));

    // 5) Bulk upsert missing employees into payroll_run_employees with zero amounts (ignore duplicates)
    let insertedCount = 0;

    if (newEmployeeIds.length > 0) {
      const payload = newEmployeeIds.map((empId) => ({
        company_id: companyId,
        run_id: runId,
        employee_id: empId,
        gross_pay: 0,
        net_pay: 0,
        pay_after_leaving: false,
      }));

      const { data: insertedRows, error: insertError } = await supabase
        .from("payroll_run_employees")
        .upsert(payload, { onConflict: "run_id,employee_id", ignoreDuplicates: true })
        .select("employee_id");

      if (insertError) {
        return NextResponse.json(
          { ok: false, error: "INSERT_FAILED", details: insertError.message },
          { status: statusFromErr(insertError) },
        );
      }

      insertedCount = (insertedRows ?? []).length;
    }

    // 6) Mark run as having all due employees attached (RLS-scoped)
    const { data: updatedRun, error: updateRunError } = await supabase
      .from("payroll_runs")
      .update({ attached_all_due_employees: true })
      .eq("id", runId)
      .select("id")
      .maybeSingle();

    if (updateRunError) {
      return NextResponse.json(
        { ok: false, error: "RUN_UPDATE_FAILED", details: updateRunError.message },
        { status: statusFromErr(updateRunError) },
      );
    }

    // If run existed but update is blocked by role-gated RLS
    if (!updatedRun?.id) {
      return NextResponse.json({ ok: false, error: "FORBIDDEN" }, { status: 403 });
    }

    return NextResponse.json({ ok: true, inserted: insertedCount }, { status: 200 });
  } catch (err: any) {
    console.error("[payroll/[id]/attach] unexpected error", err);
    return NextResponse.json(
      { ok: false, error: "UNEXPECTED_ERROR", details: err?.message ?? String(err) },
      { status: 500 },
    );
  }
}
