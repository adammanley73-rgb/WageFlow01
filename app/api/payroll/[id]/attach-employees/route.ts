import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const WEEKS_PER_YEAR = 52.14285714;

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

type ExistingAttachedRow = {
  contract_id: string | null;
};

type EmployeeRow = {
  id?: unknown;
  employee_id?: unknown;
  employee_number?: unknown;
  status?: unknown;
  tax_code?: unknown;
  taxCode?: unknown;
  tax_code_basis?: unknown;
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
  dob_verified?: unknown;
  date_of_birth?: unknown;
  dateOfBirth?: unknown;
  [key: string]: unknown;
};

type ContractEmployeeRow = {
  contract_id?: unknown;
  contract_number?: unknown;
  contract_status?: unknown;
  contract_start_date?: unknown;
  contract_leave_date?: unknown;

  contract_pay_frequency?: unknown;
  contract_pay_basis?: unknown;
  contract_annual_salary?: unknown;
  contract_hourly_rate?: unknown;
  contract_hours_per_week?: unknown;
  contract_pay_after_leaving?: unknown;
  contract_job_title?: unknown;

  employee_uuid?: unknown;
  employee_id?: unknown;
  employee_number?: unknown;
  employee_status?: unknown;

  tax_code?: unknown;
  taxCode?: unknown;
  tax_code_basis?: unknown;
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

  dob_verified?: unknown;
  date_of_birth?: unknown;
  dateOfBirth?: unknown;

  [key: string]: unknown;
};

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
  tax_code_basis: string | null;
  tax_basis: string | null;
  ni_category: string | null;
  student_loan_plan: string | null;
  postgrad_loan: boolean | null;
  status: string;
  created_at?: string | null;
};

type AttachedSeedRow = {
  id: string;
  employee_id: string;
  contract_id: string;
};

type SettingsHistoryQueryResult<T> = {
  data: T[] | null;
  error: unknown | null;
  unavailable: boolean;
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

function normalizeTaxCodeBasis(v: unknown): "cumulative" | "week1_month1" {
  const s = String(v ?? "").trim().toLowerCase();
  if (
    s === "week1_month1" ||
    s === "w1m1" ||
    s === "week1month1" ||
    s === "week1" ||
    s === "month1" ||
    s === "wk1/mth1" ||
    s === "wk1mth1"
  ) {
    return "week1_month1";
  }
  return "cumulative";
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

function isMissingTableError(err: unknown): boolean {
  const anyErr = err as { code?: unknown; message?: unknown } | null;
  const code = String(anyErr?.code ?? "");
  const msg = String(anyErr?.message ?? "").toLowerCase();

  if (code === "42P01") return true;
  if (msg.includes('relation "') && msg.includes('" does not exist')) return true;
  if (msg.includes("relation") && msg.includes("does not exist")) return true;

  if (
    code.toLowerCase().startsWith("pgrst") &&
    msg.includes("schema cache") &&
    (msg.includes("table") || msg.includes("relation"))
  ) {
    return true;
  }

  if (
    code.toLowerCase().startsWith("pgrst") &&
    msg.includes("could not find") &&
    (msg.includes("table") || msg.includes("relation"))
  ) {
    return true;
  }

  return false;
}

function isSettingsHistoryUnavailableError(err: unknown): boolean {
  return isMissingColumnError(err) || isMissingTableError(err);
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

function defaultNiCategory(row: ContractEmployeeRow): string {
  const dobVerified = Boolean(row.dob_verified ?? false);
  if (!dobVerified) return "A";

  const age = computeAgeYears(row.date_of_birth ?? row.dateOfBirth ?? null);
  if (age == null) return "A";

  if (age >= 66) return "C";

  return "A";
}

function round2(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

function getNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function isSupplementaryRun(runRow: PayrollRunRow): boolean {
  const runKindRaw = String(pickFirst(runRow.run_kind, runRow.kind, "") ?? "").trim().toLowerCase();
  const parentRunId = String(pickFirst(runRow.parent_run_id, runRow.parentRunId, "") ?? "").trim();
  return runKindRaw === "supplementary" || Boolean(parentRunId);
}

function computeInitialBasicAmount(row: ContractEmployeeRow, frequency: string): number {
  const payBasis = String(
    pickFirst(row.contract_pay_basis, "") ?? ""
  )
    .trim()
    .toLowerCase();

  if (payBasis !== "salary" && payBasis !== "salaried") return 0;

  const annualSalary = getNumber(row.contract_annual_salary);
  const hourlyRate = getNumber(row.contract_hourly_rate);
  const hoursPerWeek = getNumber(row.contract_hours_per_week);

  let weeklyAmount = 0;

  if (annualSalary !== null && annualSalary > 0) {
    weeklyAmount = annualSalary / WEEKS_PER_YEAR;
  } else if (hourlyRate !== null && hourlyRate > 0 && hoursPerWeek !== null && hoursPerWeek > 0) {
    weeklyAmount = hourlyRate * hoursPerWeek;
  } else {
    return 0;
  }

  const freq = normalizeFrequency(frequency);

  if (freq === "weekly") return round2(weeklyAmount);
  if (freq === "fortnightly") return round2(weeklyAmount * 2);
  if (freq === "four_weekly") return round2(weeklyAmount * 4);
  if (freq === "monthly") {
    if (annualSalary !== null && annualSalary > 0) return round2(annualSalary / 12);
    return round2((weeklyAmount * WEEKS_PER_YEAR) / 12);
  }

  return 0;
}

async function loadBasicPayElementTypeId(supabase: any, companyId: string): Promise<string | null> {
  const companyRes = await supabase
    .from("pay_element_types")
    .select("id")
    .eq("code", "BASIC")
    .eq("company_id", companyId)
    .limit(1)
    .maybeSingle();

  if (!companyRes.error && companyRes.data?.id) {
    return String(companyRes.data.id);
  }

  const globalRes = await supabase
    .from("pay_element_types")
    .select("id")
    .eq("code", "BASIC")
    .is("company_id", null)
    .limit(1)
    .maybeSingle();

  if (!globalRes.error && globalRes.data?.id) {
    return String(globalRes.data.id);
  }

  return null;
}

async function loadInsertedRunEmployeeRows(
  supabase: any,
  runId: string,
  contractIds: string[]
): Promise<{ ok: true; rows: AttachedSeedRow[] } | { ok: false; error: unknown }> {
  const { data, error } = await supabase
    .from("payroll_run_employees")
    .select("id, employee_id, contract_id")
    .eq("run_id", runId)
    .in("contract_id", contractIds);

  if (error) return { ok: false, error };

  const rows = (Array.isArray(data) ? data : [])
    .map((r: any) => ({
      id: String(r?.id ?? "").trim(),
      employee_id: String(r?.employee_id ?? "").trim(),
      contract_id: String(r?.contract_id ?? "").trim(),
    }))
    .filter((r) => r.id && r.employee_id && r.contract_id);

  return { ok: true, rows };
}

async function seedInitialBasicPayElements(args: {
  supabase: any;
  runRow: PayrollRunRow;
  companyId: string;
  runFrequency: string;
  insertedRows: AttachedSeedRow[];
  contractById: Map<string, ContractEmployeeRow>;
}): Promise<
  | { ok: true; seededCount: number; skippedCount: number }
  | { ok: false; error: string; details?: string }
> {
  const { supabase, runRow, companyId, runFrequency, insertedRows, contractById } = args;

  if (isSupplementaryRun(runRow)) {
    return { ok: true, seededCount: 0, skippedCount: insertedRows.length };
  }

  if (!Array.isArray(insertedRows) || insertedRows.length === 0) {
    return { ok: true, seededCount: 0, skippedCount: 0 };
  }

  const basicTypeId = await loadBasicPayElementTypeId(supabase, companyId);
  if (!basicTypeId) {
    return {
      ok: false,
      error: "BASIC_TYPE_NOT_FOUND",
      details: "No BASIC pay element type was found for this company or globally.",
    };
  }

  const inserts: Record<string, unknown>[] = [];
  let skippedCount = 0;

  for (const pre of insertedRows) {
    const row = contractById.get(pre.contract_id) ?? null;
    if (!row) {
      skippedCount += 1;
      continue;
    }

    const contractFrequency = normalizeFrequency(row.contract_pay_frequency) || runFrequency;
    const amount = computeInitialBasicAmount(row, contractFrequency);

    if (!(amount > 0)) {
      skippedCount += 1;
      continue;
    }

    inserts.push({
      payroll_run_employee_id: pre.id,
      pay_element_type_id: basicTypeId,
      amount: round2(amount),
      taxable_for_paye_override: null,
      nic_earnings_override: null,
      pensionable_override: null,
      ae_qualifying_override: null,
      description_override: "Basic pay (created automatically on attach)",
    });
  }

  if (inserts.length === 0) {
    return { ok: true, seededCount: 0, skippedCount };
  }

  const { error } = await supabase.from("payroll_run_pay_elements").insert(inserts);

  if (error) {
    return {
      ok: false,
      error: "BASIC_SEED_FAILED",
      details: (error as any)?.message ?? String(error),
    };
  }

  return { ok: true, seededCount: inserts.length, skippedCount };
}

async function loadEmployeesByIds(
  supabase: any,
  companyId: string,
  ids: string[]
): Promise<{ data: EmployeeRow[] | null; error: unknown | null }> {
  const results: EmployeeRow[] = [];

  for (let i = 0; i < ids.length; i += 200) {
    const chunk = ids.slice(i, i + 200);

    const { data, error } = await supabase
      .from("employees")
      .select("*")
      .eq("company_id", companyId)
      .in("id", chunk);

    if (error) return { data: null, error };

    const rows = (Array.isArray(data) ? data : []) as unknown as EmployeeRow[];
    if (rows.length) results.push(...rows);
  }

  return { data: results, error: null };
}

export async function POST(_req: Request, { params }: RouteContext) {
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

  const { data: runRowRaw, error: runError } = await supabase
    .from("payroll_runs")
    .select("*")
    .eq("id", runId)
    .maybeSingle();

  if (runError) {
    return NextResponse.json(
      {
        ok: false,
        error: "RUN_LOAD_FAILED",
        message: "Failed to load payroll run.",
        details: (runError as any)?.message ?? null,
      },
      { status: statusFromErr(runError) }
    );
  }

  const runRow = (runRowRaw as PayrollRunRow | null) ?? null;

  if (!runRow) {
    return NextResponse.json(
      { ok: false, error: "RUN_NOT_FOUND", message: "Payroll run not found." },
      { status: 404 }
    );
  }

  const companyId = String(runRow.company_id ?? runRow.companyId ?? "").trim();
  const runFrequency = normalizeFrequency(runRow.frequency ?? runRow.pay_frequency ?? runRow.payFrequency ?? null);

  const runPeriodStartRaw =
    pickFirst(runRow.period_start, runRow.pay_period_start, runRow.start_date, runRow.periodStart) ?? null;
  const runPeriodEndRaw =
    pickFirst((runRow as any).period_end, (runRow as any).pay_period_end, (runRow as any).end_date, (runRow as any).periodEnd) ?? null;
  const runPayDateRaw = pickFirst((runRow as any).pay_date, (runRow as any).payDate) ?? null;

  const runPeriodStartIso = toIsoDateOnly(runPeriodStartRaw) || "";
  const runPeriodEndIso = toIsoDateOnly(runPeriodEndRaw) || "";
  const runPayDateIso = toIsoDateOnly(runPayDateRaw) || "";

  const eligibilityStartDate = runPeriodStartIso || runPayDateIso || toIsoDateOnly(runRow.created_at) || toIsoDateOnly(new Date());
  const asOfDate = runPeriodEndIso || runPayDateIso || eligibilityStartDate;

  if (!companyId || !isUuid(companyId)) {
    return NextResponse.json(
      { ok: false, error: "RUN_MISSING_COMPANY", message: "Payroll run is missing a company_id." },
      { status: 500 }
    );
  }

  if (!runFrequency) {
    return NextResponse.json(
      {
        ok: false,
        error: "RUN_MISSING_FREQUENCY",
        message: "Payroll run is missing a frequency. Cannot determine which contracts are due.",
      },
      { status: 500 }
    );
  }

  const { data: contractRowsRaw, error: contractsError } = await supabase
    .from("employee_contracts")
    .select("*")
    .eq("company_id", companyId);

  if (contractsError) {
    return NextResponse.json(
      {
        ok: false,
        error: "CONTRACTS_LOAD_FAILED",
        message: "Failed to load employee contracts for this company.",
        details: (contractsError as any)?.message ?? String(contractsError),
      },
      { status: statusFromErr(contractsError) }
    );
  }

  const contractRows = Array.isArray(contractRowsRaw) ? contractRowsRaw : [];
  const employeeIds = Array.from(
    new Set(
      contractRows
        .map((row: any) => String(row?.employee_id ?? "").trim())
        .filter((id) => isUuid(id))
    )
  );

  const employeesRes = await loadEmployeesByIds(supabase, companyId, employeeIds);

  if (employeesRes.error) {
    return NextResponse.json(
      {
        ok: false,
        error: "EMPLOYEES_LOAD_FAILED",
        message: "Failed to load employees for these contracts.",
        details: (employeesRes.error as any)?.message ?? String(employeesRes.error),
      },
      { status: statusFromErr(employeesRes.error) }
    );
  }

  const employeeById = new Map<string, EmployeeRow>();
  for (const emp of Array.isArray(employeesRes.data) ? employeesRes.data : []) {
    const employeeUuid = isUuid(emp?.id) ? String(emp.id).trim() : "";
    if (employeeUuid) employeeById.set(employeeUuid, emp);
  }

  const allContracts: ContractEmployeeRow[] = contractRows.map((row: any) => {
    const employeeUuid = String(row?.employee_id ?? "").trim();
    const employee = employeeById.get(employeeUuid) ?? {};

    return {
      contract_id: row?.id,
      contract_number: row?.contract_number,
      contract_status: row?.status,
      contract_start_date: row?.start_date,
      contract_leave_date: row?.leave_date,
      contract_pay_frequency: row?.pay_frequency,
      contract_pay_basis: row?.pay_basis,
      contract_annual_salary: row?.annual_salary,
      contract_hourly_rate: row?.hourly_rate,
      contract_hours_per_week: row?.hours_per_week,
      contract_pay_after_leaving: row?.pay_after_leaving,
      contract_job_title: row?.job_title,

      employee_uuid: employee?.id ?? row?.employee_id,
      employee_id: employee?.employee_id,
      employee_number: employee?.employee_number,
      employee_status: employee?.status,

      tax_code: employee?.tax_code,
      taxCode: employee?.tax_code,
      tax_code_basis: employee?.tax_code_basis,
      tax_basis: employee?.tax_basis,
      taxBasis: employee?.tax_basis,
      ni_category: employee?.ni_category,
      niCategory: employee?.ni_category,
      student_loan: employee?.student_loan,
      loan_plan: employee?.loan_plan,
      studentLoan: employee?.student_loan,
      student_loan_plan: employee?.student_loan_plan,
      postgraduate_loan: employee?.postgraduate_loan,
      has_pgl: employee?.has_pgl,
      postgrad_loan: employee?.postgrad_loan,
      dob_verified: employee?.dob_verified,
      date_of_birth: employee?.date_of_birth,
      dateOfBirth: employee?.date_of_birth,
    };
  });

  const contractById = new Map<string, ContractEmployeeRow>();
  for (const row of allContracts) {
    const contractId = isUuid(row.contract_id) ? String(row.contract_id).trim() : "";
    if (contractId) contractById.set(contractId, row);
  }

  type EligibleContract = {
    row: ContractEmployeeRow;
    contractUuid: string;
    employeeUuid: string;
    employeeKey: string;
  };

  const eligibleContracts: EligibleContract[] = allContracts
    .filter((row) => {
      const contractId = isUuid(row.contract_id) ? String(row.contract_id).trim() : "";
      const employeeUuid = isUuid(row.employee_uuid) ? String(row.employee_uuid).trim() : "";
      if (!contractId || !employeeUuid) return false;

      const contractStatus = String(row.contract_status ?? "").trim().toLowerCase();
      const isActiveContract = !contractStatus || contractStatus === "active";
      if (!isActiveContract) return false;

      const contractStart = toIsoDateOnly(row.contract_start_date);
      if (contractStart && contractStart > asOfDate) return false;

      const contractLeave = toIsoDateOnly(row.contract_leave_date);
      if (contractLeave && contractLeave < eligibilityStartDate && !Boolean(row.contract_pay_after_leaving ?? false)) {
        return false;
      }

      const contractFreq = normalizeFrequency(row.contract_pay_frequency);
      return contractFreq === runFrequency;
    })
    .map((row) => {
      const contractUuid = String(row.contract_id).trim();
      const employeeUuid = String(row.employee_uuid).trim();
      const employeeKey =
        String(row.employee_id ?? "").trim() ||
        String(row.employee_number ?? "").trim() ||
        employeeUuid;

      return { row, contractUuid, employeeUuid, employeeKey };
    })
    .filter((x) => Boolean(x.contractUuid) && Boolean(x.employeeUuid) && Boolean(x.employeeKey));

  if (eligibleContracts.length === 0) {
    return NextResponse.json(
      {
        ok: false,
        error: "NO_ELIGIBLE_CONTRACTS",
        message: "No active employee contracts with matching pay frequency were found for this company.",
        runFrequency,
      },
      { status: 400 }
    );
  }

  const { data: existingRowsRaw, error: existingError } = await supabase
    .from("payroll_run_employees")
    .select("contract_id")
    .eq("run_id", runId);

  if (existingError) {
    return NextResponse.json(
      {
        ok: false,
        error: "EXISTING_ROWS_LOAD_FAILED",
        message: "Failed to check existing contracts already attached to this run.",
        details: (existingError as any)?.message ?? String(existingError),
      },
      { status: statusFromErr(existingError) }
    );
  }

  const existingRows = (Array.isArray(existingRowsRaw) ? existingRowsRaw : []) as unknown as ExistingAttachedRow[];
  const existingContractIds = new Set(existingRows.map((row) => String(row.contract_id ?? "").trim()).filter(Boolean));
  const toAttach = eligibleContracts.filter((x) => !existingContractIds.has(x.contractUuid));

  if (toAttach.length === 0) {
    return NextResponse.json(
      {
        ok: true,
        error: null,
        message: "All eligible contracts are already attached to this payroll run.",
        attachedCount: 0,
        totalContractsConsidered: eligibleContracts.length,
      },
      { status: 200 }
    );
  }

  const employeeKeys = Array.from(new Set(toAttach.map((x) => x.employeeKey)));

  async function loadPendingOrApproved(
    keys: string[]
  ): Promise<SettingsHistoryQueryResult<SettingsPendingOrApprovedRow>> {
    const results: SettingsPendingOrApprovedRow[] = [];

    for (let i = 0; i < keys.length; i += 200) {
      const chunk = keys.slice(i, i + 200);

      const { data, error } = await supabase
        .from("employee_payroll_settings_history")
        .select("id, employee_key, status, source, effective_from")
        .eq("company_id", companyId)
        .in("employee_key", chunk)
        .in("status", ["pending", "approved"])
        .lte("effective_from", asOfDate)
        .order("effective_from", { ascending: false })
        .limit(500);

      if (error) {
        if (isSettingsHistoryUnavailableError(error)) {
          return { data: [], error: null, unavailable: true };
        }
        return { data: null, error, unavailable: false };
      }

      const rows = (Array.isArray(data) ? data : []) as unknown as SettingsPendingOrApprovedRow[];
      if (rows.length) results.push(...rows);
    }

    return { data: results, error: null, unavailable: false };
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
  const settingsHistoryUnavailable = pendingCheck.unavailable === true;

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

  async function loadAppliedSettings(
    keys: string[]
  ): Promise<SettingsHistoryQueryResult<SettingsAppliedRow>> {
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
            "tax_code_basis",
            "tax_basis",
            "ni_category",
            "student_loan_plan",
            "postgrad_loan",
            "status",
            "created_at",
          ].join(",")
        )
        .eq("company_id", companyId)
        .eq("status", "applied")
        .in("employee_key", chunk)
        .lte("effective_from", asOfDate)
        .order("effective_from", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(2000);

      if (error) {
        if (isSettingsHistoryUnavailableError(error)) {
          return { data: [], error: null, unavailable: true };
        }
        return { data: null, error, unavailable: false };
      }

      const rows = (Array.isArray(data) ? data : []) as unknown as SettingsAppliedRow[];
      if (rows.length) results.push(...rows);
    }

    return { data: results, error: null, unavailable: false };
  }

  const appliedByKey = new Map<string, SettingsAppliedRow>();

  if (!settingsHistoryUnavailable) {
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

    for (const r of appliedRows) {
      const k = String(r.employee_key ?? "").trim();
      if (!k) continue;
      if (!appliedByKey.has(k)) appliedByKey.set(k, r);
    }
  }

  const nowIso = new Date().toISOString();

  const rowsToInsert: Record<string, unknown>[] = toAttach.map(({ row, contractUuid, employeeUuid, employeeKey }) => {
    const applied = appliedByKey.get(employeeKey) ?? null;

    const empTaxCode = pickFirst(row.tax_code, row.taxCode);
    const empTaxCodeBasis = pickFirst(row.tax_code_basis, row.tax_basis, row.taxBasis);
    const empNiCat = pickFirst(row.ni_category, row.niCategory);

    const empLoan = pickFirst(row.student_loan, row.loan_plan, row.studentLoan, row.student_loan_plan);
    const empPg = row.postgraduate_loan ?? row.has_pgl ?? row.postgrad_loan ?? null;

    const taxCodeUsed = String(applied?.tax_code ?? empTaxCode ?? "1257L").trim().toUpperCase() || "1257L";
    const taxCodeBasisUsed = normalizeTaxCodeBasis(applied?.tax_code_basis ?? applied?.tax_basis ?? empTaxCodeBasis);
    const niCategoryUsed =
      String(applied?.ni_category ?? empNiCat ?? defaultNiCategory(row)).trim().toUpperCase() || defaultNiCategory(row);

    const studentLoanUsed = normalizeLoanPlan(applied?.student_loan_plan ?? empLoan ?? "none");
    const pgLoanUsed = Boolean(applied?.postgrad_loan ?? empPg ?? false);

    const payFrequencyUsed = normalizeFrequency(row.contract_pay_frequency) || runFrequency;
    const payBasisUsed = pickFirst(row.contract_pay_basis);
    const hoursUsedRaw = pickFirst(row.contract_hours_per_week);
    const hoursUsed =
      hoursUsedRaw == null || hoursUsedRaw === ""
        ? null
        : Number.isFinite(Number(hoursUsedRaw))
          ? Number(hoursUsedRaw)
          : null;

    const settingsHistoryIdUsed = applied?.id ?? null;
    const payAfterLeaving = Boolean(row.contract_pay_after_leaving ?? false);

    return {
      run_id: runRow.id,
      employee_id: employeeUuid,
      contract_id: contractUuid,
      company_id: companyId,

      tax_code_used: taxCodeUsed,
      tax_code_basis_used: taxCodeBasisUsed,
      ni_category_used: niCategoryUsed,
      student_loan_used: studentLoanUsed,
      pg_loan_used: pgLoanUsed,

      pay_frequency_used: payFrequencyUsed,
      pay_basis_used: payBasisUsed,
      hours_per_week_used: hoursUsed,

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

      pay_after_leaving: payAfterLeaving,
      allow_negative_net: false,
      negative_net_reason: null,
      included_in_rti: false,
      marked_for_payment: true,

      metadata: {
        snapped_at: nowIso,
        settings_source: settingsHistoryIdUsed ? "history" : "defaults_or_employee",
        as_of_date: asOfDate,
        tax_code_basis_used: taxCodeBasisUsed,
        employee_key: employeeKey,
        attach_mode: "due",
        contract_id: contractUuid,
        contract_number: pickFirst(row.contract_number),
        settings_history_unavailable: settingsHistoryUnavailable,
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
        error: "ATTACH_CONTRACTS_FAILED",
        message: "Failed to attach employee contracts to this payroll run.",
        details: (insertRes.error as any)?.message ?? String(insertRes.error),
        strippedColumns: insertRes.stripped,
      },
      { status: statusFromErr(insertRes.error) }
    );
  }

  const insertedLookupRes = await loadInsertedRunEmployeeRows(
    supabase,
    runId,
    toAttach.map((x) => x.contractUuid)
  );

  if (!insertedLookupRes.ok) {
    return NextResponse.json(
      {
        ok: false,
        error: "ATTACH_LOOKUP_FAILED",
        message: "Contracts were attached, but the inserted rows could not be reloaded for BASIC pay seeding.",
        details: (insertedLookupRes.error as any)?.message ?? String(insertedLookupRes.error),
      },
      { status: statusFromErr(insertedLookupRes.error) }
    );
  }

  const basicSeed = await seedInitialBasicPayElements({
    supabase,
    runRow,
    companyId,
    runFrequency,
    insertedRows: insertedLookupRes.rows,
    contractById,
  });

  if (!basicSeed.ok) {
    return NextResponse.json(
      {
        ok: false,
        error: basicSeed.error,
        message: "Contracts were attached, but automatic BASIC pay element creation failed.",
        details: basicSeed.details ?? null,
        attachedCount: rowsToInsert.length,
      },
      { status: 500 }
    );
  }

  const upd = await supabase
    .from("payroll_runs")
    .update({ attached_all_due_employees: true })
    .eq("id", runId)
    .select("id")
    .maybeSingle();

  if (upd.error && !isMissingColumnError(upd.error)) {
    return NextResponse.json(
      {
        ok: false,
        error: "RUN_UPDATE_FAILED",
        message: "Contracts were attached, but updating the payroll run metadata failed.",
        details: (upd.error as any)?.message ?? String(upd.error),
        attachedCount: rowsToInsert.length,
        basicSeededCount: basicSeed.seededCount,
        basicSkippedCount: basicSeed.skippedCount,
      },
      { status: statusFromErr(upd.error) }
    );
  }

  const updId = String((upd.data as any)?.id ?? "").trim();
  if (!upd.error && !updId) {
    return NextResponse.json(
      {
        ok: false,
        error: "FORBIDDEN",
        message: "Contracts were attached, but you do not have permission to update the run metadata.",
        attachedCount: rowsToInsert.length,
        basicSeededCount: basicSeed.seededCount,
        basicSkippedCount: basicSeed.skippedCount,
      },
      { status: 403 }
    );
  }

  return NextResponse.json(
    {
      ok: true,
      error: null,
      message: "Employee contracts attached to payroll run.",
      attachedCount: rowsToInsert.length,
      totalContractsConsidered: eligibleContracts.length,
      asOfDate,
      strippedColumns: insertRes.stripped,
      basicSeededCount: basicSeed.seededCount,
      basicSkippedCount: basicSeed.skippedCount,
      settingsHistoryUnavailable,
    },
    { status: 200 }
  );
}