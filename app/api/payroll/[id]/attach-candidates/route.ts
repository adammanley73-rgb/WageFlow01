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
  company_id: string | null;
  frequency: string | null;
  pay_frequency: string | null;
};

type PayrollRunEmployeeRow = {
  employee_id: string | null;
};

type EmployeeRow = {
  id: string;
  company_id: string | null;
  status: string | null;
  pay_frequency: string | null;
  frequency: string | null;
  first_name: string | null;
  last_name: string | null;
  full_name: string | null;
  employee_number: string | null;
  payroll_number: string | null;
  email: string | null;
  work_email: string | null;
  personal_email: string | null;
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
  if (s === "4weekly" || s === "fourweekly" || s === "four-weekly") return "four_weekly";
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
    .select("id, company_id, frequency, pay_frequency")
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

  const companyIdRaw = pickFirst(runRow.company_id);
  const companyId = companyIdRaw == null ? "" : String(companyIdRaw).trim();

  const runFrequencyRaw = pickFirst(runRow.frequency, runRow.pay_frequency);
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

  const { data: existingRows, error: existingError } = await supabase
    .from("payroll_run_employees")
    .select("employee_id")
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

  const existingIds = new Set(
    (existingRows ?? [])
      .map((r) => String(r.employee_id ?? "").trim())
      .filter((id) => Boolean(id))
  );

  const { data: employeeRows, error: employeesError } = await supabase
    .from("employees")
    .select(
      [
        "id",
        "company_id",
        "status",
        "pay_frequency",
        "frequency",
        "first_name",
        "last_name",
        "full_name",
        "employee_number",
        "payroll_number",
        "email",
        "work_email",
        "personal_email",
      ].join(",")
    )
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

  const allEmployees: EmployeeRow[] = Array.isArray(employeeRows) ? employeeRows : [];

  const candidates: Candidate[] = allEmployees
    .filter((emp) => {
      const status = String(emp.status ?? "").trim().toLowerCase();
      const isActive = !status || status === "active";
      if (!isActive) return false;

      const empFreq = normalizeFrequency(pickFirst(emp.pay_frequency, emp.frequency));
      if (!empFreq) return false;
      if (empFreq !== runFrequency) return false;

      const employeeUuid = isUuid(emp.id) ? String(emp.id).trim() : "";
      if (!employeeUuid) return false;
      if (existingIds.has(employeeUuid)) return false;

      return true;
    })
    .map((emp) => {
      const id = String(emp.id).trim();
      const first = String(emp.first_name ?? "").trim();
      const last = String(emp.last_name ?? "").trim();
      const fullName = String(pickFirst(emp.full_name, `${first} ${last}`.trim(), "") ?? "").trim();

      const employeeNumber = String(pickFirst(emp.employee_number, emp.payroll_number, "") ?? "").trim();

      const email = cleanEmail(pickFirst(emp.email, emp.work_email, emp.personal_email, ""));

      return {
        id,
        name: fullName || employeeNumber || id,
        employeeNumber: employeeNumber || "",
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