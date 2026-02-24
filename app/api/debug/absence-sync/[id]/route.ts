/* @ts-nocheck */
/* C:\Projects\wageflow01\app\api\debug\absence-sync\[id]\route.ts */

import { NextResponse } from "next/server";
import { getAdmin } from "@lib/admin";
import { syncAbsencePayToRun } from "@lib/payroll/syncAbsencePayToRun";
import { getSspAmountsForRun } from "@/lib/services/absenceService";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

function isUuid(v: any) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    String(v || "").trim()
  );
}

function normalizeIso(v: any): string | null {
  const s = String(v || "").trim();
  if (!s) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  return null;
}

function pickPeriod(run: any) {
  const start =
    normalizeIso(run?.period_start) ||
    normalizeIso(run?.pay_period_start) ||
    normalizeIso(run?.pay_period_start_iso) ||
    null;

  const end =
    normalizeIso(run?.period_end) ||
    normalizeIso(run?.pay_period_end) ||
    normalizeIso(run?.pay_period_end_iso) ||
    null;

  return { start, end };
}

function safeErr(e: any) {
  if (!e) return null;
  return {
    code: e.code ?? null,
    message: e.message ?? String(e),
    details: e.details ?? null,
    hint: e.hint ?? null,
  };
}

function envHost(raw: string | undefined) {
  const s = String(raw || "").trim();
  if (!s) return null;
  try {
    const u = new URL(s.startsWith("http") ? s : `https://${s}`);
    return u.host;
  } catch {
    return s;
  }
}

function looksLikeSspType(code: any, name: any, desc: any) {
  const c = String(code || "").toUpperCase().trim();
  const n = String(name || "").toLowerCase();
  const d = String(desc || "").toLowerCase();

  if (c === "SSP" || c === "SSP1") return true;
  if (n.includes("statutory sick")) return true;
  if (d.includes("statutory sick")) return true;

  return false;
}

async function loadRun(client: any, runId: string) {
  const { data, error } = await client
    .from("payroll_runs")
    .select(
      "id, company_id, status, period_start, period_end, pay_period_start, pay_period_end, created_at"
    )
    .eq("id", runId)
    .maybeSingle();

  return { run: data ?? null, error };
}

async function loadPayrollRunEmployees(client: any, runId: string, fullRows: boolean) {
  const sel = fullRows ? "*" : "id, employee_id";
  const { data, error } = await client
    .from("payroll_run_employees")
    .select(sel)
    .eq("run_id", runId);

  return { rows: Array.isArray(data) ? data : [], error };
}

async function loadStoredSspElements(client: any, runId: string) {
  const preRes = await loadPayrollRunEmployees(client, runId, false);
  if (preRes.error) {
    return {
      ok: false,
      error: preRes.error,
      payrollRunEmployeesCount: 0,
      elements: [],
      summary: { storedElementCount: 0, storedEmployeeCount: 0, storedTotalSsp: 0 },
    };
  }

  const pres = preRes.rows || [];
  const preIdToEmployeeId: Record<string, string> = {};
  const preIds = pres
    .map((r: any) => {
      const preId = String(r?.id || "").trim();
      const empId = String(r?.employee_id || "").trim();
      if (preId && empId) preIdToEmployeeId[preId] = empId;
      return preId;
    })
    .filter(Boolean);

  if (preIds.length === 0) {
    return {
      ok: true,
      payrollRunEmployeesCount: pres.length,
      elements: [],
      summary: { storedElementCount: 0, storedEmployeeCount: 0, storedTotalSsp: 0 },
    };
  }

  const { data: peRows, error: peErr } = await client
    .from("payroll_run_pay_elements")
    .select(
      "id, payroll_run_employee_id, pay_element_type_id, amount, description_override, absence_id, created_at, updated_at"
    )
    .in("payroll_run_employee_id", preIds);

  if (peErr) {
    return {
      ok: false,
      error: peErr,
      payrollRunEmployeesCount: pres.length,
      elements: [],
      summary: { storedElementCount: 0, storedEmployeeCount: 0, storedTotalSsp: 0 },
    };
  }

  const pe = Array.isArray(peRows) ? peRows : [];
  if (pe.length === 0) {
    return {
      ok: true,
      payrollRunEmployeesCount: pres.length,
      elements: [],
      summary: { storedElementCount: 0, storedEmployeeCount: 0, storedTotalSsp: 0 },
    };
  }

  const typeIds = Array.from(
    new Set(
      pe
        .map((r: any) => String(r?.pay_element_type_id || "").trim())
        .filter((x: string) => x.length > 0)
    )
  );

  const typeById: Record<string, any> = {};
  if (typeIds.length > 0) {
    const { data: typeRows, error: typeErr } = await client
      .from("pay_element_types")
      .select("id, code, name, side")
      .in("id", typeIds);

    if (!typeErr && Array.isArray(typeRows)) {
      for (const t of typeRows) {
        if (t?.id) typeById[String(t.id)] = t;
      }
    }
  }

  const sspElements: any[] = [];
  let storedTotalSsp = 0;

  for (const row of pe) {
    const typeId = String(row?.pay_element_type_id || "").trim();
    const t = typeById[typeId] ?? null;

    const code = t?.code ?? null;
    const name = t?.name ?? null;
    const desc = row?.description_override ?? null;

    if (!looksLikeSspType(code, name, desc)) continue;

    const amount = Number(row?.amount) || 0;
    storedTotalSsp += amount;

    const preId = String(row?.payroll_run_employee_id || "").trim();
    const employeeId = preIdToEmployeeId[preId] ?? null;

    sspElements.push({
      payElementId: row?.id ?? null,
      payrollRunEmployeeId: preId || null,
      employeeId,
      payElementTypeId: typeId || null,
      code: code ? String(code) : null,
      name: name ? String(name) : null,
      side: t?.side ? String(t.side) : null,
      storedAmount: Math.round((Number(amount) + Number.EPSILON) * 100) / 100,
      description: desc ? String(desc) : null,
      absenceId: row?.absence_id ?? null,
      createdAt: row?.created_at ?? null,
      updatedAt: row?.updated_at ?? null,
    });
  }

  const storedEmployeeCount = Array.from(
    new Set(sspElements.map((x) => String(x?.employeeId || "").trim()).filter(Boolean))
  ).length;

  return {
    ok: true,
    payrollRunEmployeesCount: pres.length,
    elements: sspElements,
    summary: {
      storedElementCount: sspElements.length,
      storedEmployeeCount,
      storedTotalSsp: Math.round((storedTotalSsp + Number.EPSILON) * 100) / 100,
    },
  };
}

function buildExpectedLookupFromEngine(engineEmployees: any[]) {
  const expectedByEmployeeAbsence: Record<string, any> = {};
  const expectedByEmployeeTotal: Record<string, any> = {};

  for (const e of engineEmployees || []) {
    const employeeId = String(e?.employeeId || "").trim();
    if (!employeeId) continue;

    const dailyRate = Number(e?.dailyRate) || 0;
    const totalPayableDays = Number(e?.totalPayableDays) || 0;
    const totalAmount = Number(e?.sspAmount) || 0;

    expectedByEmployeeTotal[employeeId] = {
      employeeId,
      dailyRate,
      totalPayableDays,
      expectedTotalAmount: Math.round((totalAmount + Number.EPSILON) * 100) / 100,
      packMeta: e?.packMeta ?? null,
      warnings: Array.isArray(e?.warnings) ? e.warnings : [],
    };

    const abs = Array.isArray(e?.absences) ? e.absences : [];
    for (const a of abs) {
      const absenceId = String(a?.absenceId || "").trim();
      if (!absenceId) continue;

      const payableDays = Array.isArray(a?.payableDays) ? a.payableDays : [];
      const qualifyingDays = Array.isArray(a?.qualifyingDays) ? a.qualifyingDays : [];

      const payableCount = payableDays.length;
      const expectedAmount = Math.round((payableCount * dailyRate + Number.EPSILON) * 100) / 100;

      expectedByEmployeeAbsence[`${employeeId}|${absenceId}`] = {
        employeeId,
        absenceId,
        payableDaysCount: payableCount,
        qualifyingDaysCount: qualifyingDays.length,
        dailyRate,
        expectedAmount,
      };
    }
  }

  return { expectedByEmployeeAbsence, expectedByEmployeeTotal };
}

async function computeSspEngine(companyId: string, start: string, end: string) {
  try {
    const rowsRaw = await getSspAmountsForRun(companyId, start, end);
    const rows = Array.isArray(rowsRaw) ? rowsRaw : [];

    const totalSsp = Math.round(
      (rows.reduce((sum: number, r: any) => sum + (Number(r?.sspAmount) || 0), 0) + Number.EPSILON) * 100
    ) / 100;

    const firstPack = rows.find((x: any) => x?.packMeta)?.packMeta ?? null;

    return { ok: true, totalSsp, employeeCount: rows.length, packSummary: firstPack, employees: rows };
  } catch (e: any) {
    return { ok: false, error: e?.message ?? String(e), employees: [] };
  }
}

async function tryComputeFull(client: any, runId: string) {
  try {
    const { data, error } = await client.rpc("payroll_run_compute_full", { p_run_id: runId });
    if (error) return { ok: false, error: error?.message ?? "RPC failed", details: safeErr(error) };
    return { ok: true, data };
  } catch (e: any) {
    return { ok: false, error: e?.message ?? String(e), details: safeErr(e) };
  }
}

async function buildPayload(client: any, runId: string) {
  const envInfo = {
    SUPABASE_URL: envHost(process.env.SUPABASE_URL),
    NEXT_PUBLIC_SUPABASE_URL: envHost(process.env.NEXT_PUBLIC_SUPABASE_URL),
    SUPABASE_PUBLIC_URL: envHost((process.env as any).SUPABASE_PUBLIC_URL),
    VERCEL_URL: envHost(process.env.VERCEL_URL),
    NODE_ENV: process.env.NODE_ENV ?? null,
  };

  if (!isUuid(runId)) {
    return {
      ok: false,
      status: 400,
      body: { ok: false, error: "BAD_RUN_ID", message: "Run id must be a UUID.", runId, env: envInfo },
    } as const;
  }

  const runRes = await loadRun(client, runId);
  if (runRes.error || !runRes.run) {
    return {
      ok: false,
      status: 404,
      body: {
        ok: false,
        error: "RUN_NOT_FOUND",
        message: "Payroll run not found.",
        runId,
        env: envInfo,
        details: safeErr(runRes.error),
      },
    } as const;
  }

  const run = runRes.run;
  const companyId = String(run?.company_id || "").trim() || null;

  const period = pickPeriod(run);
  const period_start = period.start;
  const period_end = period.end;

  const stored = await loadStoredSspElements(client, runId);

  let engine: any = null;
  let expectedLookup: any = { expectedByEmployeeAbsence: {}, expectedByEmployeeTotal: {} };

  if (companyId && period_start && period_end) {
    engine = await computeSspEngine(companyId, period_start, period_end);
    if (engine?.ok) {
      expectedLookup = buildExpectedLookupFromEngine(engine.employees || []);
    }
  } else {
    engine = {
      ok: false,
      error: "Missing companyId or period_start/period_end on run, cannot run SSP engine preview.",
    };
  }

  const elementsWithExpected = (stored.elements || []).map((el: any) => {
    const employeeId = String(el?.employeeId || "").trim();
    const absenceId = el?.absenceId ? String(el.absenceId).trim() : null;

    const byAbsence =
      employeeId && absenceId
        ? expectedLookup.expectedByEmployeeAbsence[`${employeeId}|${absenceId}`] ?? null
        : null;

    const byEmployee = employeeId ? expectedLookup.expectedByEmployeeTotal[employeeId] ?? null : null;

    const expectedAmount =
      byAbsence?.expectedAmount ??
      (absenceId ? null : byEmployee?.expectedTotalAmount ?? null);

    const payableDaysCount =
      byAbsence?.payableDaysCount ?? (absenceId ? null : byEmployee?.totalPayableDays ?? null);

    const dailyRate =
      byAbsence?.dailyRate ?? (absenceId ? null : byEmployee?.dailyRate ?? null);

    return {
      ...el,
      expectedAmount,
      expectedDailyRate: dailyRate,
      expectedPayableDays: payableDaysCount,
    };
  });

  const storedVsExpected = (() => {
    const storedTotal = Number(stored?.summary?.storedTotalSsp || 0);
    const expectedTotal = engine?.ok ? Number(engine?.totalSsp || 0) : null;
    return {
      storedTotalSsp: storedTotal,
      expectedTotalSsp: expectedTotal,
      discrepancyStoredMinusExpected:
        expectedTotal === null ? null : Math.round(((storedTotal - expectedTotal) + Number.EPSILON) * 100) / 100,
    };
  })();

  return {
    ok: true,
    status: 200,
    body: {
      ok: true,
      runId: run?.id,
      companyId,
      status: run?.status ?? null,
      period_start,
      period_end,
      env: envInfo,

      payrollRunEmployeesCount: stored?.payrollRunEmployeesCount ?? 0,

      ssp: {
        stored: {
          ok: Boolean(stored?.ok),
          summary: stored?.summary ?? null,
          elements: elementsWithExpected,
          error: stored?.ok ? null : safeErr(stored?.error),
        },
        engine: engine,
        reconcile: storedVsExpected,
      },

      note:
        "Dev-only endpoint. GET shows current SSP stored elements plus expected SSP amounts from the engine. POST (below) will run absence sync first.",
    },
  } as const;
}

export async function GET(_req: Request, { params }: Params) {
  try {
    const admin = await getAdmin();
    const client = admin?.client;

    if (!client) {
      return NextResponse.json(
        { ok: false, error: "ADMIN_CLIENT_NOT_AVAILABLE", message: "Admin client not available." },
        { status: 503 }
      );
    }

    const resolved = await params;
    const runId = String(resolved?.id || "").trim();

    const payload = await buildPayload(client, runId);
    return NextResponse.json(payload.body, { status: payload.status });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: "UNEXPECTED_ERROR", message: e?.message ?? String(e) },
      { status: 500 }
    );
  }
}

export async function POST(_req: Request, { params }: Params) {
  try {
    const admin = await getAdmin();
    const client = admin?.client;

    if (!client) {
      return NextResponse.json(
        { ok: false, error: "ADMIN_CLIENT_NOT_AVAILABLE", message: "Admin client not available." },
        { status: 503 }
      );
    }

    const resolved = await params;
    const runId = String(resolved?.id || "").trim();

    if (!isUuid(runId)) {
      return NextResponse.json(
        { ok: false, error: "BAD_RUN_ID", message: "Run id must be a UUID.", runId },
        { status: 400 }
      );
    }

    const runRes = await loadRun(client, runId);
    if (runRes.error || !runRes.run) {
      return NextResponse.json(
        { ok: false, error: "RUN_NOT_FOUND", message: "Payroll run not found.", details: safeErr(runRes.error) },
        { status: 404 }
      );
    }

    const run = runRes.run;
    const period = pickPeriod(run);

    const preFull = await loadPayrollRunEmployees(client, runId, true);

    if (preFull.error) {
      return NextResponse.json(
        {
          ok: false,
          error: "PAYROLL_RUN_EMPLOYEES_LOAD_FAILED",
          message: "Failed loading payroll_run_employees for sync.",
          details: safeErr(preFull.error),
        },
        { status: 500 }
      );
    }

    await syncAbsencePayToRun({
      supabase: client,
      runId,
      runRow: run,
      payrollRunEmployees: preFull.rows,
    });

    const basePayload = await buildPayload(client, runId);

    const compute = await tryComputeFull(client, runId);

    return NextResponse.json(
      {
        ...(basePayload.body || {}),
        compute: compute,
        note:
          "Dev-only endpoint. POST ran syncAbsencePayToRun first, then attempted payroll_run_compute_full. SSP section includes stored SSP pay elements plus engine-expected amounts.",
      },
      { status: 200 }
    );
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: "UNEXPECTED_ERROR", message: e?.message ?? String(e) },
      { status: 500 }
    );
  }
}