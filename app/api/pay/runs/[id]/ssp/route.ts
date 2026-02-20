/* @ts-nocheck */
// E:\Projects\wageflow01\app\api\pay\runs\[id]\ssp\route.ts

import { NextResponse } from "next/server";
import { getAdmin } from "@lib/admin";
import { getSspAmountsForRun } from "@/lib/services/absenceService";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

function round2(n: number): number {
  return Math.round((Number(n || 0) + Number.EPSILON) * 100) / 100;
}

function uniqStrings(list: any[]): string[] {
  return Array.from(
    new Set(
      (Array.isArray(list) ? list : [])
        .map((x) => (typeof x === "string" ? x : null))
        .filter(Boolean)
    )
  ) as string[];
}

function looksLikeSsp(code: any, name: any, desc: any): boolean {
  const c = String(code || "").toUpperCase().trim();
  const n = String(name || "").toLowerCase();
  const d = String(desc || "").toLowerCase();

  if (c === "SSP" || c === "SSP1") return true;
  if (n.includes("statutory sick")) return true;
  if (d.includes("statutory sick")) return true;

  return false;
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
    const resolvedParams = await params;
    const runId = resolvedParams?.id;

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

    // 1) SSP engine output (absence-driven)
    let sspEmployeesRaw: any = [];
    try {
      sspEmployeesRaw = await getSspAmountsForRun(
        run.company_id,
        run.period_start,
        run.period_end,
        dailyRateOverride
      );
    } catch (e) {
      console.error("ssp route: SSP engine failed", e);
      sspEmployeesRaw = [];
    }

    const sspEmployees = Array.isArray(sspEmployeesRaw) ? sspEmployeesRaw : [];
    const engineTotalSsp = round2(
      sspEmployees.reduce((sum, emp) => sum + (Number(emp?.sspAmount) || 0), 0)
    );

    const firstWithPack = sspEmployees.find((e) => e?.packMeta);
    const packSummary = firstWithPack?.packMeta ?? null;

    const engineWarnings = Array.from(
      new Set(
        sspEmployees
          .flatMap((e) => (Array.isArray(e?.warnings) ? e.warnings : []))
          .filter(Boolean)
      )
    );

    // 2) Stored SSP pay elements (payroll_run_pay_elements-driven)
    let storedTotalSsp = 0;
    let storedEmployees: any[] = [];
    let storedElementCount = 0;

    const { data: preRows, error: preErr } = await client
      .from("payroll_run_employees")
      .select("id, employee_id")
      .eq("run_id", runId);

    if (preErr) {
      console.error("ssp route: error loading payroll_run_employees", preErr);
    }

    const pres = Array.isArray(preRows) ? preRows : [];
    const preIdToEmployeeId: Record<string, string> = {};
    const preIds = pres
      .map((r: any) => {
        const preId = String(r?.id || "");
        const empId = String(r?.employee_id || "");
        if (preId && empId) preIdToEmployeeId[preId] = empId;
        return preId;
      })
      .filter((x: any) => typeof x === "string" && x.length > 0);

    if (preIds.length > 0) {
      const { data: peRows, error: peErr } = await client
        .from("payroll_run_pay_elements")
        .select(
          "id, payroll_run_employee_id, pay_element_type_id, amount, description_override, absence_id, absence_pay_schedule_id, created_at, updated_at"
        )
        .in("payroll_run_employee_id", preIds);

      if (peErr) {
        console.error("ssp route: error loading payroll_run_pay_elements", peErr);
      }

      const pe = Array.isArray(peRows) ? peRows : [];
      storedElementCount = pe.length;

      const typeIds = uniqStrings(pe.map((r: any) => r?.pay_element_type_id));
      const typeById: Record<string, any> = {};

      if (typeIds.length > 0) {
        const { data: typeRows, error: typeErr } = await client
          .from("pay_element_types")
          .select("id, code, name, side")
          .in("id", typeIds);

        if (typeErr) {
          console.error("ssp route: error loading pay_element_types", typeErr);
        }

        if (Array.isArray(typeRows)) {
          for (const t of typeRows) {
            if (t?.id) typeById[String(t.id)] = t;
          }
        }
      }

      for (const row of pe) {
        const typeId = String(row?.pay_element_type_id || "");
        const t = typeById[typeId] ?? null;

        const code = t?.code ?? null;
        const name = t?.name ?? null;

        const desc = row?.description_override ?? null;

        if (!looksLikeSsp(code, name, desc)) continue;

        const amount = Number(row?.amount) || 0;
        storedTotalSsp = storedTotalSsp + amount;

        const preId = String(row?.payroll_run_employee_id || "");
        const employeeId = preIdToEmployeeId[preId] ?? null;

        storedEmployees.push({
          employeeId,
          payrollRunEmployeeId: preId || null,
          payElementId: row?.id ?? null,
          payElementTypeId: typeId || null,
          code: code ? String(code) : null,
          name: name ? String(name) : null,
          side: t?.side ? String(t.side) : null,
          amount: round2(amount),
          description: desc ? String(desc) : null,
          absenceId: row?.absence_id ?? null,
          absencePayScheduleId: row?.absence_pay_schedule_id ?? null,
          createdAt: row?.created_at ?? null,
          updatedAt: row?.updated_at ?? null,
        });
      }

      storedTotalSsp = round2(storedTotalSsp);
    }

    const storedEmployeeCount = uniqStrings(storedEmployees.map((x: any) => x?.employeeId)).length;

    // 3) Reconciliation warnings (the thing that was confusing you, and rightly so)
    const reconcileWarnings: string[] = [];

    if (storedTotalSsp > 0 && engineTotalSsp === 0) {
      reconcileWarnings.push(
        "Stored SSP pay elements exist in payroll_run_pay_elements for this run, but SSP engine found no sickness records in the run period. Run-level SSP engine total is 0. Payslips may still show stored SSP elements."
      );
    }

    if (engineTotalSsp > 0 && storedTotalSsp === 0) {
      reconcileWarnings.push(
        "SSP engine computed SSP amounts for this run period, but no stored SSP pay elements were found in payroll_run_pay_elements. If you expect SSP on payslips, confirm the payroll write-back step is creating SSP pay elements."
      );
    }

    const warnings = Array.from(new Set([...(engineWarnings || []), ...reconcileWarnings]));

    return NextResponse.json(
      {
        ok: true,
        runId: run.id,
        companyId: run.company_id,
        period_start: run.period_start,
        period_end: run.period_end,

        // Backward compatible fields (engine view)
        totalSsp: engineTotalSsp,
        employeeCount: sspEmployees.length,
        employees: sspEmployees,
        dailyRateOverrideUsed: typeof dailyRateOverride === "number" ? dailyRateOverride : null,
        packSummary,

        // New fields (stored view)
        storedTotalSsp,
        storedEmployeeCount,
        storedElementCount,
        storedEmployees,

        // Quick reconciliation
        discrepancyStoredMinusEngine: round2(storedTotalSsp - engineTotalSsp),

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
