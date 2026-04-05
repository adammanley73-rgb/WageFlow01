// C:\Projects\wageflow01\app\api\payroll\[id]\attach-candidates\route.ts

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
  company_id?: string | null;
  companyId?: string | null;
  frequency?: string | null;
  pay_frequency?: string | null;
  payFrequency?: string | null;
  period_start?: string | null;
  pay_period_start?: string | null;
  start_date?: string | null;
  periodStart?: string | null;
  period_end?: string | null;
  pay_period_end?: string | null;
  end_date?: string | null;
  periodEnd?: string | null;
  pay_date?: string | null;
  payDate?: string | null;
  created_at?: string | null;
  [key: string]: unknown;
};

type PayrollRunEmployeeRow = {
  employee_id: string | null;
  contract_id?: string | null;
};

type ContractRow = {
  id: string | null;
  company_id: string | null;
  employee_id: string | null;
  contract_number: string | null;
  job_title: string | null;
  status: string | null;
  pay_frequency: string | null;
  start_date?: string | null;
  leave_date?: string | null;
  pay_after_leaving?: boolean | null;
};

type EmployeeRow = {
  id: string;
  company_id: string | null;
  first_name: string | null;
  last_name: string | null;
  known_as?: string | null;
  employee_number: string | null;
  email: string | null;
  [key: string]: unknown;
};

type Candidate = {
  id: string;
  name: string;
  employeeNumber: string;
  email: string;
  payFrequency: string;
};

function statusFromErr(err: unknown, fallback = 500): number {
  const anyErr = err as { status?: unknown } | null;
  const s = Number(anyErr?.status);
  if (s === 400 || s === 401 || s === 403 || s === 404 || s === 409) return s;
  return fallback;
}

function isUuid(v: unknown): boolean {
  const s = String(v ?? "").trim();
  return /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/.test(s);
}

function pickFirst(...values: unknown[]): unknown | null {
  for (const v of values) {
    if (v == null) continue;
    const s = String(v).trim();
    if (!s) continue;
    return v;
  }
  return null;
}

function normalizeFrequency(v: unknown): string {
  const s = String(v ?? "").trim().toLowerCase();
  if (!s) return "";
  if (s === "4weekly" || s === "fourweekly" || s === "four-weekly" || s === "4-weekly" || s === "4 weekly") {
    return "four_weekly";
  }
  return s;
}

function cleanEmail(v: unknown): string {
  if (v == null) return "";
  const s = String(v).trim();
  if (!s) return "";
  const lower = s.toLowerCase();
  if (lower === "null" || lower === "undefined" || lower === "n/a") return "";
  if (s.includes("\uFFFD")) return "";
  return s;
}

function normalizeStatus(v: unknown): string {
  return String(v ?? "").trim().toLowerCase();
}


function toIsoDateOnly(value: unknown): string {
  const s = String(value ?? "").trim();
  if (!s) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const dt = new Date(s);
  if (Number.isNaN(dt.getTime())) return "";
  return dt.toISOString().slice(0, 10);
}

export async function GET(_req: Request, { params }: RouteContext) {
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

  const { data: runRow, error: runError } = await supabase
    .from("payroll_runs")
    .select("*")
    .eq("id", runId)
    .maybeSingle<PayrollRunRow>();

  if (runError) {
    return NextResponse.json(
      {
        ok: false,
        error: "RUN_LOAD_FAILED",
        message: "Failed to load payroll run.",
        details: runError.message ?? null,
      },
      { status: statusFromErr(runError) }
    );
  }

  if (!runRow) {
    return NextResponse.json(
      { ok: false, error: "RUN_NOT_FOUND", message: "Payroll run not found." },
      { status: 404 }
    );
  }

  const companyIdRaw = pickFirst(runRow.company_id, runRow.companyId);
  const companyId = companyIdRaw == null ? "" : String(companyIdRaw).trim();

  const runFrequencyRaw = pickFirst(runRow.frequency, runRow.pay_frequency, runRow.payFrequency);
  const runFrequency = normalizeFrequency(runFrequencyRaw);

  if (!companyId || !isUuid(companyId)) {
    return NextResponse.json(
      { ok: false, error: "RUN_MISSING_COMPANY", message: "Payroll run is missing a valid company_id." },
      { status: 500 }
    );
  }

  if (!runFrequency) {
    return NextResponse.json(
      {
        ok: false,
        error: "RUN_MISSING_FREQUENCY",
        message: "Payroll run is missing a frequency. Cannot determine candidates.",
      },
      { status: 500 }
    );
  }

  const runPeriodStartIso = toIsoDateOnly(pickFirst(runRow.period_start, runRow.pay_period_start, runRow.start_date, runRow.periodStart)) || "";
  const runPeriodEndIso = toIsoDateOnly(pickFirst(runRow.period_end, runRow.pay_period_end, runRow.end_date, runRow.periodEnd)) || "";
  const runPayDateIso = toIsoDateOnly(pickFirst(runRow.pay_date, runRow.payDate)) || "";
  const eligibilityStartDate = runPeriodStartIso || runPayDateIso || toIsoDateOnly(runRow.created_at) || toIsoDateOnly(new Date());
  const asOfDate = runPeriodEndIso || runPayDateIso || eligibilityStartDate;

  const { data: existingRows, error: existingError } = await supabase
    .from("payroll_run_employees")
    .select("employee_id, contract_id")
    .eq("run_id", runId)
    .returns<PayrollRunEmployeeRow[]>();

  if (existingError) {
    return NextResponse.json(
      {
        ok: false,
        error: "EXISTING_ROWS_LOAD_FAILED",
        message: "Failed to check existing attached employees for this run.",
        details: existingError.message,
      },
      { status: statusFromErr(existingError) }
    );
  }

  const existingContractIds = new Set(
    (existingRows ?? [])
      .map((r) => String(r.contract_id ?? "").trim())
      .filter((id) => Boolean(id))
  );

  const { data: contractRows, error: contractsError } = await supabase
    .from("employee_contracts")
    .select(
      [
        "id",
        "company_id",
        "employee_id",
        "contract_number",
        "job_title",
        "status",
        "pay_frequency",
      ].join(",")
    )
    .eq("company_id", companyId)
    .returns<ContractRow[]>();

  if (contractsError) {
    return NextResponse.json(
      {
        ok: false,
        error: "CONTRACTS_LOAD_FAILED",
        message: "Failed to load employee contracts for this company.",
        details: contractsError.message,
      },
      { status: statusFromErr(contractsError) }
    );
  }

  const { data: employeeRows, error: employeesError } = await supabase
    .from("employees")
    .select("*")
    .eq("company_id", companyId)
    .returns<EmployeeRow[]>();

  if (employeesError) {
    return NextResponse.json(
      {
        ok: false,
        error: "EMPLOYEES_LOAD_FAILED",
        message: "Failed to load employees for this company.",
        details: employeesError.message,
      },
      { status: statusFromErr(employeesError) }
    );
  }

  const employeeById = new Map<string, EmployeeRow>();
  for (const emp of Array.isArray(employeeRows) ? employeeRows : []) {
    const employeeUuid = isUuid(emp.id) ? String(emp.id).trim() : "";
    if (employeeUuid) employeeById.set(employeeUuid, emp);
  }

  const allContracts: ContractRow[] = Array.isArray(contractRows) ? contractRows : [];

  const candidates: Candidate[] = allContracts
    .filter((contract) => {
      const contractId = isUuid(contract.id) ? String(contract.id).trim() : "";
      const employeeUuid = isUuid(contract.employee_id) ? String(contract.employee_id).trim() : "";
      if (!contractId || !employeeUuid) return false;
      if (existingContractIds.has(contractId)) return false;

      const contractStatus = normalizeStatus(contract.status);
      if (contractStatus && contractStatus !== "active") return false;

      const contractFreq = normalizeFrequency(contract.pay_frequency);
      if (!contractFreq || contractFreq !== runFrequency) return false;

      const contractStart = toIsoDateOnly(contract.start_date);
      if (contractStart && contractStart > asOfDate) return false;

      const contractLeave = toIsoDateOnly(contract.leave_date);
      if (contractLeave && contractLeave < eligibilityStartDate && !Boolean(contract.pay_after_leaving ?? false)) {
        return false;
      }

      return employeeById.has(employeeUuid);
    })
    .map((contract) => {
      const contractId = String(contract.id).trim();
      const employeeUuid = String(contract.employee_id).trim();
      const emp = employeeById.get(employeeUuid)!;

      const first = String(emp.first_name ?? "").trim();
      const last = String(emp.last_name ?? "").trim();
      const knownAs = String(emp.known_as ?? "").trim();
      const baseName = String(
        pickFirst(knownAs ? `${knownAs} ${last}`.trim() : "", `${first} ${last}`.trim(), "") ?? ""
      ).trim();

      const contractNumber = String(contract.contract_number ?? "").trim();
      const masterEmployeeNumber = String(pickFirst(emp.employee_number, "") ?? "").trim();
      const jobTitle = String(contract.job_title ?? "").trim();
      const email = cleanEmail(pickFirst(emp.email, ""));

      const nameParts = [baseName || masterEmployeeNumber || contractNumber || contractId];
      if (jobTitle) nameParts.push(`(${jobTitle})`);

      return {
        id: contractId,
        name: nameParts.join(" ").trim(),
        employeeNumber: contractNumber || masterEmployeeNumber || "",
        email: email || "",
        payFrequency: runFrequency,
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));

  return NextResponse.json(
    {
      ok: true,
      error: null,
      runId,
      runFrequency,
      candidates,
      total: candidates.length,
    },
    { status: 200 }
  );
}
