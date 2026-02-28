// C:\Projects\wageflow01\app\api\pay\runs\[id]\ssp\route.ts

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { getSspAmountsForRun } from "@/lib/services/absenceService";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

type RouteContext = { params: Promise<{ id: string }> };

type PayrollRunRow = {
  id: string;
  company_id: string | null;
  period_start: string | null;
  period_end: string | null;
};

type PayrollRunEmployeeRow = {
  id: string;
  employee_id: string | null;
};

type PayElementRow = {
  id: string;
  payroll_run_employee_id: string | null;
  pay_element_type_id: string | null;
  amount: number | null;
  description_override: string | null;
  absence_id: string | null;
  absence_pay_schedule_id: string | null;
  created_at: string | null;
  updated_at: string | null;
};

type PayElementTypeRow = {
  id: string;
  code: string | null;
  name: string | null;
  side: string | null;
};

type JsonError = {
  ok: false;
  error: string;
  message?: string;
  details?: string;
};

function round2(n: number): number {
  return Math.round((Number(n || 0) + Number.EPSILON) * 100) / 100;
}

function uniqStrings(list: unknown[]): string[] {
  const out = new Set<string>();
  for (const x of Array.isArray(list) ? list : []) {
    if (typeof x === "string") {
      const v = x.trim();
      if (v) out.add(v);
    }
  }
  return Array.from(out);
}

function looksLikeSsp(code: unknown, name: unknown, desc: unknown): boolean {
  const c = String(code ?? "").toUpperCase().trim();
  const n = String(name ?? "").toLowerCase();
  const d = String(desc ?? "").toLowerCase();

  if (c === "SSP" || c === "SSP1") return true;
  if (n.includes("statutory sick")) return true;
  if (d.includes("statutory sick")) return true;

  return false;
}

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

export async function GET(req: Request, { params }: RouteContext) {
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

    const { data: run, error: runErr } = await supabase
      .from("payroll_runs")
      .select("id, company_id, period_start, period_end")
      .eq("company_id", companyId)
      .eq("id", runId)
      .maybeSingle<PayrollRunRow>();

    if (runErr) {
      return NextResponse.json(
        {
          ok: false,
          error: "RUN_LOAD_FAILED",
          message: "Error loading payroll run.",
          details: (runErr as any)?.message ?? String(runErr),
        } satisfies JsonError,
        { status: statusFromErr(runErr) }
      );
    }

    if (!run) {
      return NextResponse.json({ ok: false, error: "RUN_NOT_FOUND" } satisfies JsonError, { status: 404 });
    }

    const periodStart = String(run.period_start ?? "").trim();
    const periodEnd = String(run.period_end ?? "").trim();
    if (!periodStart || !periodEnd) {
      return NextResponse.json(
        { ok: false, error: "RUN_PERIOD_MISSING", message: "Payroll run period_start/period_end missing." } satisfies JsonError,
        { status: 400 }
      );
    }

    const { searchParams } = new URL(req.url);
    const dailyRateRaw = searchParams.get("dailyRate");
    const dailyRateNum = dailyRateRaw !== null ? Number(dailyRateRaw) : NaN;
    const dailyRateOverrideUsed = Number.isFinite(dailyRateNum) && dailyRateNum > 0 ? dailyRateNum : null;

    // 1) SSP engine output (absence-driven)
    let sspEmployeesRaw: unknown = [];
    try {
      sspEmployeesRaw = await getSspAmountsForRun(companyId, periodStart, periodEnd, dailyRateOverrideUsed ?? undefined);
    } catch (e: unknown) {
      console.error("ssp route: SSP engine failed", e);
      sspEmployeesRaw = [];
    }

    const sspEmployees = Array.isArray(sspEmployeesRaw) ? sspEmployeesRaw : [];
    const engineTotalSsp = round2(
      sspEmployees.reduce((sum, emp) => sum + (Number((emp as any)?.sspAmount) || 0), 0)
    );

    const firstWithPack = sspEmployees.find((e) => (e as any)?.packMeta);
    const packSummary = (firstWithPack as any)?.packMeta ?? null;

    const engineWarnings = Array.from(
      new Set(
        sspEmployees
          .flatMap((e) => (Array.isArray((e as any)?.warnings) ? (e as any).warnings : []))
          .filter(Boolean)
      )
    ) as string[];

    // 2) Stored SSP pay elements (payroll_run_pay_elements-driven)
    let storedTotalSsp = 0;
    let storedEmployees: any[] = [];
    let storedElementCount = 0;

    const { data: preRows, error: preErr } = await supabase
      .from("payroll_run_employees")
      .select("id, employee_id")
      .eq("company_id", companyId)
      .eq("run_id", runId)
      .returns<PayrollRunEmployeeRow[]>();

    if (preErr) {
      console.error("ssp route: error loading payroll_run_employees", preErr);
    }

    const pres = Array.isArray(preRows) ? preRows : [];
    const preIdToEmployeeId: Record<string, string> = {};
    const preIds = pres
      .map((r) => {
        const preId = String(r?.id ?? "");
        const empId = String(r?.employee_id ?? "");
        if (preId && empId) preIdToEmployeeId[preId] = empId;
        return preId;
      })
      .filter((x) => typeof x === "string" && x.length > 0);

    if (preIds.length > 0) {
      const { data: peRows, error: peErr } = await supabase
        .from("payroll_run_pay_elements")
        .select(
          "id, payroll_run_employee_id, pay_element_type_id, amount, description_override, absence_id, absence_pay_schedule_id, created_at, updated_at"
        )
        .in("payroll_run_employee_id", preIds)
        .returns<PayElementRow[]>();

      if (peErr) {
        console.error("ssp route: error loading payroll_run_pay_elements", peErr);
      }

      const pe = Array.isArray(peRows) ? peRows : [];
      storedElementCount = pe.length;

      const typeIds = uniqStrings(pe.map((r) => r?.pay_element_type_id ?? null));
      const typeById: Record<string, PayElementTypeRow> = {};

      if (typeIds.length > 0) {
        const { data: typeRows, error: typeErr } = await supabase
          .from("pay_element_types")
          .select("id, code, name, side")
          .in("id", typeIds)
          .returns<PayElementTypeRow[]>();

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
        const typeId = String(row?.pay_element_type_id ?? "");
        const t = typeId ? typeById[typeId] ?? null : null;

        const code = t?.code ?? null;
        const name = t?.name ?? null;
        const desc = row?.description_override ?? null;

        if (!looksLikeSsp(code, name, desc)) continue;

        const amount = Number(row?.amount) || 0;
        storedTotalSsp = storedTotalSsp + amount;

        const preId = String(row?.payroll_run_employee_id ?? "");
        const employeeId = preId ? preIdToEmployeeId[preId] ?? null : null;

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

    const storedEmployeeCount = uniqStrings(storedEmployees.map((x: any) => x?.employeeId ?? null)).length;

    // 3) Reconciliation warnings
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
        companyId,
        period_start: periodStart,
        period_end: periodEnd,

        // Backward compatible fields (engine view)
        totalSsp: engineTotalSsp,
        employeeCount: sspEmployees.length,
        employees: sspEmployees,
        dailyRateOverrideUsed,
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
  } catch (err: unknown) {
    console.error("ssp route: unexpected error", err);
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { ok: false, error: "UNEXPECTED_ERROR", message: msg } satisfies JsonError,
      { status: 500 }
    );
  }
}