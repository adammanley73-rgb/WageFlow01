/* @ts-nocheck */
// app/api/payroll/[id]/attach/route.ts

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

/**
 * Create an admin Supabase client using service role credentials.
 * This helper is reused across multiple API routes.
 */
function createAdminClient() {
  const url = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error("payroll/[id]/attach route: missing Supabase env");
  }

  return createClient(url, serviceKey, {
    auth: { persistSession: false },
  });
}

/**
 * POST /api/payroll/[id]/attach
 *
 * Attach all current employees of the run's company to the specified payroll run.
 * A minimal gross/net/zero record is inserted for each missing employee.
 * Sets attached_all_due_employees flag on the run after insertion.
 *
 * Request params:
 *   id: the payroll run id (dynamic route segment)
 *
 * Response: { ok: true, inserted: number }
 */
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = createAdminClient();
  const resolvedParams = await params;
  const runId = resolvedParams?.id;
  if (!runId) {
    return NextResponse.json(
      { ok: false, error: "RUN_ID_MISSING" },
      { status: 400 },
    );
  }

  try {
    // 1) Load the payroll run (company_id required)
    const { data: runRow, error: runError } = await supabase
      .from("payroll_runs")
      .select("id, company_id")
      .eq("id", runId)
      .maybeSingle();

    if (runError || !runRow) {
      return NextResponse.json(
        { ok: false, error: "RUN_NOT_FOUND" },
        { status: 404 },
      );
    }

    const companyId = runRow.company_id;

    // 2) Load all employees for this company. We deliberately do not filter by employment dates here.
    const { data: employeeRows, error: empError } = await supabase
      .from("employees")
      .select("id")
      .eq("company_id", companyId);

    if (empError) {
      return NextResponse.json(
        { ok: false, error: "EMPLOYEE_LOAD_FAILED", details: empError.message },
        { status: 500 },
      );
    }

    const allEmployeeIds: string[] = (employeeRows ?? []).map((r: any) => String(r.id));

    // 3) Load existing payroll_run_employees for this run
    const { data: existingRows, error: existingError } = await supabase
      .from("payroll_run_employees")
      .select("employee_id")
      .eq("run_id", runId);

    if (existingError) {
      return NextResponse.json(
        { ok: false, error: "EXISTING_LOAD_FAILED", details: existingError.message },
        { status: 500 },
      );
    }

    const existingIds = new Set<string>(
      (existingRows ?? []).map((r: any) => String(r.employee_id)),
    );

    // 4) Determine which employee_ids are missing
    const newEmployeeIds = allEmployeeIds.filter((id) => !existingIds.has(id));

    // 5) Bulk insert missing employees into payroll_run_employees with zero amounts
    let insertedCount = 0;
    if (newEmployeeIds.length > 0) {
      const payload = newEmployeeIds.map((empId) => ({
        // Include company_id in case the schema requires it for RLS or constraints
        company_id: companyId,
        run_id: runId,
        employee_id: empId,
        gross_pay: 0,
        net_pay: 0,
        pay_after_leaving: false,
      }));
      const { error: insertError } = await supabase
        .from("payroll_run_employees")
        .insert(payload);
      if (insertError) {
        return NextResponse.json(
          { ok: false, error: "INSERT_FAILED", details: insertError.message },
          { status: 500 },
        );
      }
      insertedCount = newEmployeeIds.length;
    }

    // 6) Mark run as having all due employees attached
    const { error: updateRunError } = await supabase
      .from("payroll_runs")
      .update({ attached_all_due_employees: true })
      .eq("id", runId);

    if (updateRunError) {
      return NextResponse.json(
        { ok: false, error: "RUN_UPDATE_FAILED", details: updateRunError.message },
        { status: 500 },
      );
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
