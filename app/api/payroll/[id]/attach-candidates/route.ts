// C:\Projects\wageflow01\app\api\payroll\[id]\attach-candidates\route.ts

// @ts-nocheck

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type RouteParams = {
  params: Promise<{
    id: string;
  }>;
};

function statusFromErr(err: any, fallback = 500): number {
  const s = Number(err?.status);
  if (s === 400 || s === 401 || s === 403 || s === 404 || s === 409) return s;
  return fallback;
}

function isUuid(s: any) {
  return /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/.test(
    String(s || "").trim()
  );
}

function pickFirst(...values: any[]): any {
  for (const v of values) {
    if (v == null) continue;
    const s = String(v).trim();
    if (!s) continue;
    return v;
  }
  return null;
}

function normalizeFrequency(v: any): string {
  const s = String(v ?? "").trim().toLowerCase();
  if (!s) return "";
  if (s === "4weekly" || s === "fourweekly" || s === "four-weekly") return "four_weekly";
  return s;
}

function cleanEmail(v: any) {
  const raw = pickFirst(v, null);
  if (raw === null || raw === undefined) return "";
  const s = String(raw).trim();
  if (!s) return "";
  const lower = s.toLowerCase();
  if (lower === "null" || lower === "undefined" || lower === "n/a") return "";
  if (s.includes("\uFFFD")) return "";
  return s;
}

export async function GET(_req: Request, { params }: RouteParams) {
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
    .select("id, company_id, frequency, pay_frequency, payFrequency")
    .eq("id", runId)
    .maybeSingle();

  if (runError) {
    return NextResponse.json(
      {
        ok: false,
        error: "RUN_LOAD_FAILED",
        message: "Failed to load payroll run.",
        details: runError?.message ?? null,
      },
      { status: statusFromErr(runError) }
    );
  }

  if (!runRow) {
    return NextResponse.json(
      {
        ok: false,
        error: "RUN_NOT_FOUND",
        message: "Payroll run not found.",
      },
      { status: 404 }
    );
  }

  const companyId = pickFirst(runRow.company_id, null);
  const runFrequencyRaw = pickFirst(runRow.frequency, runRow.pay_frequency, runRow.payFrequency, null);
  const runFrequency = normalizeFrequency(runFrequencyRaw);

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
        message: "Payroll run is missing a frequency. Cannot determine candidates.",
      },
      { status: 500 }
    );
  }

  const { data: existingRows, error: existingError } = await supabase
    .from("payroll_run_employees")
    .select("employee_id")
    .eq("run_id", runId);

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
    (existingRows ?? []).map((r: any) => String(r?.employee_id ?? "").trim()).filter(Boolean)
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
        "payFrequency",
        "payFrequencyUsed",
        "first_name",
        "firstName",
        "last_name",
        "lastName",
        "full_name",
        "fullName",
        "employee_number",
        "payroll_number",
        "employeeNumber",
        "payrollNumber",
        "email",
        "employee_email",
        "work_email",
        "personal_email",
      ].join(",")
    )
    .eq("company_id", companyId);

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

  const allEmployees = Array.isArray(employeeRows) ? employeeRows : [];

  const candidates = allEmployees
    .filter((emp: any) => {
      const status = String(pickFirst(emp?.status, "") ?? "").trim().toLowerCase();
      const isActive = !status || status === "active";
      if (!isActive) return false;

      const empFreq = normalizeFrequency(
        pickFirst(emp?.pay_frequency, emp?.frequency, emp?.payFrequency, emp?.payFrequencyUsed)
      );

      if (!empFreq) return false;
      if (empFreq !== runFrequency) return false;

      const employeeUuid = isUuid(emp?.id) ? String(emp.id).trim() : "";
      if (!employeeUuid) return false;

      if (existingIds.has(employeeUuid)) return false;

      return true;
    })
    .map((emp: any) => {
      const id = String(emp.id).trim();
      const first = String(pickFirst(emp?.first_name, emp?.firstName, "") ?? "").trim();
      const last = String(pickFirst(emp?.last_name, emp?.lastName, "") ?? "").trim();
      const fullName = String(pickFirst(emp?.full_name, emp?.fullName, `${first} ${last}`.trim(), "") ?? "").trim();

      const employeeNumber = String(
        pickFirst(emp?.employee_number, emp?.payroll_number, emp?.employeeNumber, emp?.payrollNumber, "") ?? ""
      ).trim();

      const email = cleanEmail(pickFirst(emp?.email, emp?.employee_email, emp?.work_email, emp?.personal_email, ""));

      return {
        id,
        name: fullName || employeeNumber || id,
        employeeNumber: employeeNumber || "",
        email: email || "",
        payFrequency: runFrequency,
      };
    })
    .sort((a: any, b: any) => String(a.name).localeCompare(String(b.name)));

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
