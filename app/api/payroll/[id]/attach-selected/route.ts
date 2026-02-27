// C:\Projects\wageflow01\app\api\payroll\[id]\attach-selected\route.ts

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

type PayrollRunRow = {
  id: string;
  company_id: string | null;
  companyId?: string | null;

  frequency?: string | null;
  pay_frequency?: string | null;
  payFrequency?: string | null;

  period_start?: string | null;
  pay_period_start?: string | null;
  start_date?: string | null;
  periodStart?: string | null;

  created_at?: string | null;

  run_kind?: string | null;
  kind?: string | null;
  parent_run_id?: string | null;
  parentRunId?: string | null;

  [key: string]: unknown;
};

type EmployeeRow = {
  id?: unknown;
  employee_id?: unknown;

  status?: unknown;

  pay_frequency?: unknown;
  frequency?: unknown;
  payFrequency?: unknown;
  payFrequencyUsed?: unknown;

  tax_code?: unknown;
  taxCode?: unknown;
  tax_basis?: unknown;
  taxBasis?: unknown;

  ni_category?: unknown;
  niCategory?: unknown;

  student_loan?: unknown;
  loan_plan?: unknown;
  studentLoan?: unknown;
  student_loan_plan?: unknown;

  postgraduate_loan?: unknown;
  has_pgl?: unknown;
  postgrad_loan?: unknown;

  pay_basis?: unknown;
  pay_basis_used?: unknown;
  pay_type?: unknown;
  payType?: unknown;

  hours_per_week?: unknown;
  hoursPerWeek?: unknown;

  dob_verified?: unknown;
  date_of_birth?: unknown;
  dateOfBirth?: unknown;

  [key: string]: unknown;
};

type ExistingAttachedRow = { employee_id: string | null };

type RejectedRow = { employee_id: string; reasons: string[] };

type SettingsPendingOrApprovedRow = {
  id: string;
  employee_key: string;
  status: string;
  source: string | null;
  effective_from: string;
};

type SettingsAppliedRow = {
  id: string;
  employee_key: string;
  employee_uuid: string | null;
  effective_from: string;
  tax_code: string | null;
  tax_basis: string | null;
  ni_category: string | null;
  student_loan_plan: string | null;
  postgrad_loan: boolean | null;
  status: string;
  created_at?: string | null;
};

type AttachSelectedBody = {
  employee_ids?: unknown;
  employeeIds?: unknown;
  employee_ids_to_attach?: unknown;
};

function statusFromErr(err: unknown, fallback = 500): number {
  const anyErr = err as { status?: unknown } | null;
  const s = Number(anyErr?.status);
  if (s === 400 || s === 401 || s === 403 || s === 404 || s === 409) return s;
  return fallback;
}

function isUuid(v: unknown): boolean {
  return /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/.test(
    String(v ?? "").trim()
  );
}

function pickFirst(...values: unknown[]): string | null {
  for (const v of values) {
    if (v == null) continue;
    const s = String(v).trim();
    if (!s) continue;
    return s;
  }
  return null;
}

function toIsoDateOnly(value: unknown): string {
  const s = String(value ?? "").trim();
  if (!s) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const dt = new Date(s);
  if (Number.isNaN(dt.getTime())) return "";
  return dt.toISOString().slice(0, 10);
}

function normalizeFrequency(v: unknown): string {
  const s = String(v ?? "").trim().toLowerCase();
  if (!s) return "";
  if (s === "4weekly" || s === "fourweekly" || s === "four-weekly") return "four_weekly";
  return s;
}

function isMissingColumnError(err: unknown): boolean {
  const anyErr = err as { code?: unknown; message?: unknown } | null;
  const code = String(anyErr?.code ?? "");
  const msg = String(anyErr?.message ?? "").toLowerCase();

  if (code === "42703") return true;
  if (msg.includes('column "') && msg.includes("does not exist")) return true;

  if (code.toLowerCase().startsWith("pgrst")) return true;
  if (msg.includes("schema cache") && msg.includes("could not find") && msg.includes("column")) return true;

  return false;
}

function missingColumnName(err: unknown): string | null {
  const anyErr = err as { message?: unknown } | null;
  const msg = String(anyErr?.message ?? "");

  const m1 = msg.match(/column\s+"([^"]+)"\s+does not exist/i);
  if (m1?.[1]) return m1[1];

  const m2 = msg.match(/could not find the '([^']+)' column of/i);
  if (m2?.[1]) return m2[1];

  return null;
}

async function insertWithMissingColumnStrip(
  supabase: any,
  tableName: string,
  rows: Record<string, unknown>[]
): Promise<{ ok: boolean; error: unknown | null; stripped: string[] }> {
  const stripped: string[] = [];
  let working: Record<string, unknown>[] = rows.map((r) => ({ ...r }));

  for (let attempt = 0; attempt < 8; attempt++) {
    const { error } = await supabase.from(tableName).insert(working);

    if (!error) {
      return { ok: true, error: null, stripped };
    }

    if (isMissingColumnError(error)) {
      const col = missingColumnName(error);
      if (!col) return { ok: false, error, stripped };

      if (!stripped.includes(col)) stripped.push(col);

      working = working.map((r) => {
        const copy: Record<string, unknown> = { ...r };
        delete copy[col];
        return copy;
      });

      continue;
    }

    return { ok: false, error, stripped };
  }

  return { ok: false, error: new Error("Too many insert retries"), stripped };
}

function normalizeLoanPlan(v: unknown): string {
  const s = String(v ?? "").trim().toLowerCase();
  if (!s) return "none";
  if (s === "none" || s === "no" || s === "n/a") return "none";
  if (s === "plan1" || s === "plan_1" || s === "1") return "plan1";
  if (s === "plan2" || s === "plan_2" || s === "2") return "plan2";
  if (s === "plan4" || s === "plan_4" || s === "4") return "plan4";
  if (s === "plan5" || s === "plan_5" || s === "5") return "plan5";
  return s;
}

function computeAgeYears(dob: unknown): number | null {
  const iso = toIsoDateOnly(dob);
  if (!iso) return null;

  const dt = new Date(iso + "T00:00:00.000Z");
  if (Number.isNaN(dt.getTime())) return null;

  const now = new Date();
  let age = now.getUTCFullYear() - dt.getUTCFullYear();
  const m = now.getUTCMonth() - dt.getUTCMonth();
  if (m < 0 || (m === 0 && now.getUTCDate() < dt.getUTCDate())) age--;

  return age;
}

function defaultNiCategory(emp: EmployeeRow): string {
  const dobVerified = Boolean(emp.dob_verified ?? false);
  if (!dobVerified) return "A";

  const age = computeAgeYears(emp.date_of_birth ?? emp.dateOfBirth ?? null);
  if (age == null) return "A";

  if (age >= 66) return "C";
  return "A";
}

function uniqStrings(xs: string[]): string[] {
  return Array.from(new Set(xs));
}

async function loadEmployeesByIds(
  supabase: any,
  companyId: string,
  ids: string[]
): Promise<{ data: EmployeeRow[] | null; error: unknown | null }> {
  const results: EmployeeRow[] = [];

  for (let i = 0; i < ids.length; i += 200) {
    const chunk = ids.slice(i, i + 200);

    const { data, error } = await supabase.from("employees").select("*").eq("company_id", companyId).in("id", chunk);

    if (error) return { data: null, error };

    const rows = (Array.isArray(data) ? data : []) as unknown as EmployeeRow[];
    if (rows.length) results.push(...rows);
  }

  return { data: results, error: null };
}

export async function POST(req: Request, { params }: RouteContext) {
  const supabase = await createClient();

  const { data: auth, error: authErr } = await supabase.auth.getUser();
  if (authErr || !auth?.user) {
    return NextResponse.json({ ok: false, error: "UNAUTHENTICATED" }, { status: 401 });
  }

  const resolvedParams = await params;
  const runId = String(resolvedParams?.id ?? "").trim();

  if (!runId) {
    return NextResponse.json(
      { ok: false, error: "BAD_REQUEST", message: "Payroll run id is required." },
      { status: 400 }
    );
  }

  const body = (await req.json().catch(() => null)) as AttachSelectedBody | null;

  const list1 = Array.isArray(body?.employee_ids) ? (body?.employee_ids as unknown[]) : null;
  const list2 = Array.isArray(body?.employeeIds) ? (body?.employeeIds as unknown[]) : null;
  const list3 = Array.isArray(body?.employee_ids_to_attach) ? (body?.employee_ids_to_attach as unknown[]) : null;

  const rawList: unknown[] = list1 ?? list2 ?? list3 ?? [];
  const rawIds: string[] = rawList.map((x) => String(x ?? "").trim()).filter(Boolean);

  if (rawIds.length === 0) {
    return NextResponse.json(
      { ok: false, error: "NO_EMPLOYEES_SELECTED", message: "Provide employee_ids as an array of employee UUIDs." },
      { status: 400 }
    );
  }

  const invalidIds: string[] = rawIds.filter((x) => !isUuid(x));
  const selectedIds: string[] = uniqStrings(rawIds.filter((x) => isUuid(x)));

  if (selectedIds.length === 0) {
    return NextResponse.json(
      { ok: false, error: "NO_VALID_EMPLOYEE_IDS", message: "No valid UUID employee ids were provided.", invalidIds },
      { status: 400 }
    );
  }

  const { data: runRowRaw, error: runError } = await supabase.from("payroll_runs").select("*").eq("id", runId).maybeSingle();

  if (runError) {
    return NextResponse.json(
      { ok: false, error: "RUN_LOAD_FAILED", message: "Failed to load payroll run.", details: (runError as any)?.message ?? null },
      { status: statusFromErr(runError) }
    );
  }

  const runRow = (runRowRaw as PayrollRunRow | null) ?? null;
  if (!runRow) {
    return NextResponse.json({ ok: false, error: "RUN_NOT_FOUND", message: "Payroll run not found." }, { status: 404 });
  }

  const companyIdStr = String(runRow.company_id ?? runRow.companyId ?? "").trim();
  const runFrequency = normalizeFrequency(runRow.frequency ?? runRow.pay_frequency ?? runRow.payFrequency ?? null);

  const runPeriodStart = pickFirst(runRow.period_start, runRow.pay_period_start, runRow.start_date, runRow.periodStart);
  const asOfDate = toIsoDateOnly(runPeriodStart) || toIsoDateOnly(runRow.created_at) || toIsoDateOnly(new Date());

  const runKindRaw = String(pickFirst(runRow.run_kind, runRow.kind, "") ?? "").trim().toLowerCase();
  const parentRunId = String(pickFirst(runRow.parent_run_id, runRow.parentRunId, "") ?? "").trim();
  const isSupplementary = runKindRaw === "supplementary" || Boolean(parentRunId);

  if (!companyIdStr || !isUuid(companyIdStr)) {
    return NextResponse.json(
      { ok: false, error: "RUN_MISSING_COMPANY", message: "Payroll run is missing a company_id." },
      { status: 500 }
    );
  }

  if (!runFrequency) {
    return NextResponse.json(
      { ok: false, error: "RUN_MISSING_FREQUENCY", message: "Payroll run is missing a frequency. Cannot validate selected employees." },
      { status: 500 }
    );
  }

  const employeesRes = await loadEmployeesByIds(supabase, companyIdStr, selectedIds);

  if (employeesRes.error) {
    return NextResponse.json(
      {
        ok: false,
        error: "EMPLOYEES_LOAD_FAILED",
        message: "Failed to load selected employees for this company.",
        details: (employeesRes.error as any)?.message ?? String(employeesRes.error),
      },
      { status: statusFromErr(employeesRes.error) }
    );
  }

  const employeeRows = employeesRes.data ?? [];
  const foundIds = new Set(employeeRows.map((e) => String(e?.id ?? "").trim()).filter(Boolean));
  const missingIds = selectedIds.filter((id) => !foundIds.has(id));

  type EligibleEmployee = { emp: EmployeeRow; employeeUuid: string; employeeKey: string };

  const rejected: RejectedRow[] = [];
  const eligibleEmployees: EligibleEmployee[] = employeeRows
    .map((emp) => {
      const employeeUuid = isUuid(emp?.id) ? String(emp.id).trim() : "";
      const employeeKey = String(emp?.employee_id ?? "").trim() || employeeUuid || "";

      const status = String(emp?.status ?? "").trim().toLowerCase();
      const isActive = !status || status === "active";

      const empFreq = normalizeFrequency(pickFirst(emp?.pay_frequency, emp?.frequency, emp?.payFrequency, emp?.payFrequencyUsed));

      const reasons: string[] = [];
      if (!employeeUuid) reasons.push("missing_or_invalid_employee_uuid");
      if (!employeeKey) reasons.push("missing_employee_key");
      if (!isActive) reasons.push("not_active");
      if (empFreq !== runFrequency) reasons.push("frequency_mismatch");

      if (reasons.length > 0) {
        rejected.push({ employee_id: employeeUuid || String(emp?.id ?? ""), reasons });
        return null;
      }

      return { emp, employeeUuid, employeeKey };
    })
    .filter((x): x is EligibleEmployee => Boolean(x));

  if (eligibleEmployees.length === 0) {
    return NextResponse.json(
      {
        ok: false,
        error: "NO_ELIGIBLE_SELECTED_EMPLOYEES",
        message: "None of the selected employees are eligible for this run.",
        runFrequency,
        missingIds,
        invalidIds,
        rejected,
      },
      { status: 400 }
    );
  }

  const employeeUuids = eligibleEmployees.map((x) => String(x.employeeUuid));

  const { data: existingRowsRaw, error: existingError } = await supabase
    .from("payroll_run_employees")
    .select("employee_id")
    .eq("run_id", runId)
    .in("employee_id", employeeUuids);

  if (existingError) {
    return NextResponse.json(
      {
        ok: false,
        error: "EXISTING_ROWS_LOAD_FAILED",
        message: "Failed to check existing employees already attached to this run.",
        details: (existingError as any)?.message ?? String(existingError),
      },
      { status: statusFromErr(existingError) }
    );
  }

  const existingRows = (Array.isArray(existingRowsRaw) ? existingRowsRaw : []) as unknown as ExistingAttachedRow[];
  const existingIds = new Set(existingRows.map((row) => String(row.employee_id ?? "").trim()).filter(Boolean));
  const toAttach = eligibleEmployees.filter((x) => !existingIds.has(String(x.employeeUuid)));

  if (toAttach.length === 0) {
    return NextResponse.json(
      {
        ok: true,
        error: null,
        message: "All selected eligible employees are already attached to this payroll run.",
        attachedCount: 0,
        totalSelected: selectedIds.length,
        eligibleSelected: eligibleEmployees.length,
        missingIds,
        invalidIds,
        rejected,
      },
      { status: 200 }
    );
  }

  const employeeKeys = Array.from(new Set(toAttach.map((x) => String(x.employeeKey))));

  async function loadPendingOrApproved(
    keys: string[]
  ): Promise<{ data: SettingsPendingOrApprovedRow[] | null; error: unknown | null }> {
    const results: SettingsPendingOrApprovedRow[] = [];

    for (let i = 0; i < keys.length; i += 200) {
      const chunk = keys.slice(i, i + 200);

      const { data, error } = await supabase
        .from("employee_payroll_settings_history")
        .select("id, employee_key, status, source, effective_from")
        .eq("company_id", companyIdStr)
        .in("employee_key", chunk)
        .in("status", ["pending", "approved"])
        .lte("effective_from", asOfDate)
        .order("effective_from", { ascending: false })
        .limit(500);

      if (error) return { data: null, error };

      const rows = (Array.isArray(data) ? data : []) as unknown as SettingsPendingOrApprovedRow[];
      if (rows.length) results.push(...rows);
    }

    return { data: results, error: null };
  }

  const pendingCheck = await loadPendingOrApproved(employeeKeys);

  if (pendingCheck.error) {
    return NextResponse.json(
      {
        ok: false,
        error: "SETTINGS_CHECK_FAILED",
        message: "Failed to check pending payroll setting changes.",
        details: (pendingCheck.error as any)?.message ?? String(pendingCheck.error),
      },
      { status: statusFromErr(pendingCheck.error) }
    );
  }

  const pendingRows = pendingCheck.data ?? [];
  if (pendingRows.length > 0) {
    const affectedKeys = Array.from(new Set(pendingRows.map((r) => String(r.employee_key)))).slice(0, 20);

    return NextResponse.json(
      {
        ok: false,
        error: "PENDING_SETTINGS",
        message:
          "There are pending or approved payroll setting changes effective on or before this run period. Apply them before attaching employees to the run.",
        asOfDate,
        affectedEmployeeKeys: affectedKeys,
        affectedCount: affectedKeys.length,
      },
      { status: 409 }
    );
  }

  async function loadAppliedSettings(keys: string[]): Promise<{ data: SettingsAppliedRow[] | null; error: unknown | null }> {
    const results: SettingsAppliedRow[] = [];

    for (let i = 0; i < keys.length; i += 200) {
      const chunk = keys.slice(i, i + 200);

      const { data, error } = await supabase
        .from("employee_payroll_settings_history")
        .select(
          [
            "id",
            "employee_key",
            "employee_uuid",
            "effective_from",
            "tax_code",
            "tax_basis",
            "ni_category",
            "student_loan_plan",
            "postgrad_loan",
            "status",
            "created_at",
          ].join(",")
        )
        .eq("company_id", companyIdStr)
        .eq("status", "applied")
        .in("employee_key", chunk)
        .lte("effective_from", asOfDate)
        .order("effective_from", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(2000);

      if (error) return { data: null, error };

      const rows = (Array.isArray(data) ? data : []) as unknown as SettingsAppliedRow[];
      if (rows.length) results.push(...rows);
    }

    return { data: results, error: null };
  }

  const appliedRes = await loadAppliedSettings(employeeKeys);

  if (appliedRes.error) {
    return NextResponse.json(
      {
        ok: false,
        error: "SETTINGS_LOAD_FAILED",
        message: "Failed to load applied payroll settings for employees.",
        details: (appliedRes.error as any)?.message ?? String(appliedRes.error),
      },
      { status: statusFromErr(appliedRes.error) }
    );
  }

  const appliedRows = appliedRes.data ?? [];
  const appliedByKey = new Map<string, SettingsAppliedRow>();
  for (const r of appliedRows) {
    const k = String(r.employee_key ?? "").trim();
    if (!k) continue;
    if (!appliedByKey.has(k)) appliedByKey.set(k, r);
  }

  const nowIso = new Date().toISOString();

  const rowsToInsert: Record<string, unknown>[] = toAttach.map(({ emp, employeeUuid, employeeKey }) => {
    const applied = appliedByKey.get(employeeKey) ?? null;

    const empTaxCode = pickFirst(emp?.tax_code, emp?.taxCode);
    const empTaxBasis = pickFirst(emp?.tax_basis, emp?.taxBasis);
    const empNiCat = pickFirst(emp?.ni_category, emp?.niCategory);

    const empLoan = pickFirst(emp?.student_loan, emp?.loan_plan, emp?.studentLoan, emp?.student_loan_plan);
    const empPg = emp?.postgraduate_loan ?? emp?.has_pgl ?? emp?.postgrad_loan ?? null;

    const taxCodeUsed = String(applied?.tax_code ?? empTaxCode ?? "BR").trim() || "BR";
    const taxBasisUsed = String(applied?.tax_basis ?? empTaxBasis ?? "w1m1").trim() || "w1m1";
    const niCategoryUsed =
      String(applied?.ni_category ?? empNiCat ?? defaultNiCategory(emp)).trim() || defaultNiCategory(emp);

    const studentLoanUsed = normalizeLoanPlan(applied?.student_loan_plan ?? empLoan ?? "none");
    const pgLoanUsed = Boolean(applied?.postgrad_loan ?? empPg ?? false);

    const payFrequencyUsed = normalizeFrequency(pickFirst(emp?.pay_frequency, emp?.frequency)) || runFrequency;
    const payBasisUsed = pickFirst(emp?.pay_basis, emp?.pay_basis_used, emp?.pay_type, emp?.payType);

    const hoursUsedRaw = pickFirst(emp?.hours_per_week, emp?.hoursPerWeek);
    const hoursUsed =
      hoursUsedRaw == null || hoursUsedRaw === ""
        ? null
        : Number.isFinite(Number(hoursUsedRaw))
        ? Number(hoursUsedRaw)
        : null;

    const settingsHistoryIdUsed = applied?.id ?? null;

    return {
      run_id: runRow.id,
      employee_id: employeeUuid,
      company_id: companyIdStr,

      tax_code_used: taxCodeUsed,
      ni_category_used: niCategoryUsed,
      student_loan_used: studentLoanUsed,
      pg_loan_used: pgLoanUsed,

      pay_frequency_used: payFrequencyUsed,
      pay_basis_used: payBasisUsed,
      hours_per_week_used: hoursUsed,

      tax_basis_used: taxBasisUsed,
      settings_history_id_used: settingsHistoryIdUsed,

      basic_pay: 0,
      overtime_pay: 0,
      bonus_pay: 0,
      other_earnings: 0,
      taxable_pay: 0,
      tax: 0,
      employee_ni: 0,
      employer_ni: 0,
      pension_employee: 0,
      pension_employer: 0,
      other_deductions: 0,
      attachment_of_earnings: 0,
      gross_pay: 0,
      net_pay: 0,

      ni_employee: 0,
      ni_employer: 0,
      manual_override: false,

      calc_mode: "uncomputed",

      pay_after_leaving: false,
      allow_negative_net: false,
      negative_net_reason: null,
      included_in_rti: false,
      marked_for_payment: true,

      metadata: {
        snapped_at: nowIso,
        settings_source: settingsHistoryIdUsed ? "history" : "defaults_or_employee",
        as_of_date: asOfDate,
        tax_basis_used: taxBasisUsed,
        employee_key: employeeKey,
        attach_mode: "selected",
      },

      created_at: nowIso,
      updated_at: nowIso,
    };
  });

  const insertRes = await insertWithMissingColumnStrip(supabase, "payroll_run_employees", rowsToInsert);

  if (!insertRes.ok) {
    return NextResponse.json(
      {
        ok: false,
        error: "ATTACH_SELECTED_FAILED",
        message: "Failed to attach selected employees to this payroll run.",
        details: (insertRes.error as any)?.message ?? String(insertRes.error),
        strippedColumns: insertRes.stripped,
      },
      { status: statusFromErr(insertRes.error) }
    );
  }

  if (isSupplementary) {
    const upd = await supabase.from("payroll_runs").update({ attached_all_due_employees: false }).eq("id", runId);

    if (upd.error && !isMissingColumnError(upd.error)) {
      return NextResponse.json(
        {
          ok: false,
          error: "RUN_UPDATE_FAILED",
          message: "Employees were attached, but updating the payroll run metadata failed.",
          details: (upd.error as any)?.message ?? String(upd.error),
          attachedCount: rowsToInsert.length,
        },
        { status: statusFromErr(upd.error) }
      );
    }
  }

  return NextResponse.json(
    {
      ok: true,
      error: null,
      message: "Selected employees attached to payroll run.",
      attachedCount: rowsToInsert.length,
      totalSelected: selectedIds.length,
      eligibleSelected: eligibleEmployees.length,
      asOfDate,
      invalidIds,
      missingIds,
      rejected,
      strippedColumns: insertRes.stripped,
    },
    { status: 200 }
  );
}