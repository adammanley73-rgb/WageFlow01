/* @ts-nocheck */
// C:\Users\adamm\Projects\wageflow01\app\api\pay\runs\[id]\ssp\route.ts

import { NextResponse } from "next/server";
import { getAdmin } from "@lib/admin";
import { getSspAmountsForRun } from "@/lib/services/absenceService";

export const dynamic = "force-dynamic";

type Params = { params: { id: string } };

function round2(n: number): number {
  return Math.round((Number(n || 0) + Number.EPSILON) * 100) / 100;
}

export async function GET(req: Request, { params }: Params) {
  try {
    const admin = await getAdmin();

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

    const { searchParams } = new URL(req.url);
    const dailyRateRaw = searchParams.get("dailyRate");
    const dailyRateOverride =
      dailyRateRaw !== null && Number(dailyRateRaw) > 0 ? Number(dailyRateRaw) : undefined;

    const sspEmployees = await getSspAmountsForRun(
      run.company_id,
      run.period_start,
      run.period_end,
      dailyRateOverride
    );

    const totalSsp = round2(
      sspEmployees.reduce((sum, emp) => sum + (Number(emp.sspAmount) || 0), 0)
    );

    const firstWithPack = sspEmployees.find((e) => e?.packMeta);
    const packSummary = firstWithPack?.packMeta ?? null;

    const warnings = Array.from(
      new Set(
        sspEmployees
          .flatMap((e) => (Array.isArray(e?.warnings) ? e.warnings : []))
          .filter(Boolean)
      )
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

        dailyRateOverrideUsed: typeof dailyRateOverride === "number" ? dailyRateOverride : null,
        packSummary,
        warnings,
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
