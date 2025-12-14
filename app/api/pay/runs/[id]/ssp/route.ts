/* @ts-nocheck */
// C:\Users\adamm\Projects\wageflow01\app\api\pay\runs\[id]\ssp\route.ts

import { NextResponse } from "next/server";
import { getAdmin } from "@lib/admin";
import { getSspAmountsForRun } from "@/lib/services/absenceService";

type Params = { params: { id: string } };

export async function GET(_req: Request, { params }: Params) {
  try {
    const admin = await getAdmin();

    // We only care about the Supabase client here. companyId may be null when
    // this route is called server-to-server from /api/payroll/[id].
    if (!admin || !admin.client) {
      return NextResponse.json(
        { ok: false, error: "Admin client not available" },
        { status: 503 }
      );
    }

    const client = admin.client;
    const runId = params?.id;

    if (!runId) {
      return NextResponse.json(
        { ok: false, error: "Missing payroll run id" },
        { status: 400 }
      );
    }

    // IMPORTANT: only filter by id. Do NOT filter by company_id using a
    // possibly-null companyId, which was causing 22P02 errors.
    const { data: run, error: runErr } = await client
      .from("payroll_runs")
      .select("id, company_id, period_start, period_end")
      .eq("id", runId)
      .maybeSingle();

    if (runErr) {
      console.error("ssp route: error loading payroll_run", runErr);
      return NextResponse.json(
        { ok: false, error: "Error loading payroll run" },
        { status: 500 }
      );
    }

    if (!run) {
      return NextResponse.json(
        { ok: false, error: "Payroll run not found" },
        { status: 404 }
      );
    }

    // Compute SSP per employee for this run using the *run's* company_id.
    const sspEmployees = await getSspAmountsForRun(
      run.company_id,
      run.period_start,
      run.period_end
    );

    const totalSsp = sspEmployees.reduce(
      (sum, emp) => sum + (emp.sspAmount || 0),
      0
    );

    return NextResponse.json(
      {
        ok: true,
        runId: run.id,
        companyId: run.company_id,
        period_start: run.period_start,
        period_end: run.period_end,
        totalSsp,
        employeeCount: sspEmployees.length,
        employees: sspEmployees,
      },
      { status: 200 }
    );
  } catch (err: any) {
    console.error("ssp route: unexpected error", err);
    return NextResponse.json(
      {
        ok: false,
        error: err?.message ?? "Unexpected error while computing SSP for run",
      },
      { status: 500 }
    );
  }
}
