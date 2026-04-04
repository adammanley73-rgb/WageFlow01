// C:\Projects\wageflow01\app\api\payroll\[id]\export\route.ts

import { NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase/server";
import { getPayrollRunDetail } from "@/lib/payroll/getPayrollRunDetail";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

function isUuid(v: any): boolean {
  const s = String(v ?? "").trim();
  if (!s) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(s);
}

function pickFirst(...vals: any[]) {
  for (const v of vals) {
    if (v === null || v === undefined) continue;
    const s = String(v).trim();
    if (!s) continue;
    return v;
  }
  return null;
}

function csvCell(value: any): string {
  const s = value === null || value === undefined ? "" : String(value);
  return `"${s.replace(/"/g, `""`)}"`;
}

function num(value: any): string {
  const n = Number(value ?? 0);
  if (!Number.isFinite(n)) return "0.00";
  return n.toFixed(2);
}

function text(value: any): string {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

function safeFilePart(value: any): string {
  const s = String(value ?? "").trim();
  if (!s) return "";
  return s
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, "")
    .replace(/\s+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 80);
}

function buildFilename(run: any, runId: string): string {
  const payDate = safeFilePart(pickFirst(run?.pay_date, run?.payDate, ""));
  const runName = safeFilePart(pickFirst(run?.run_name, run?.runName, ""));
  const status = safeFilePart(pickFirst(run?.status, run?.run_status, ""));
  const parts = ["payroll_export"];

  if (runName) parts.push(runName);
  if (payDate) parts.push(payDate);
  if (status) parts.push(status);
  parts.push(runId);

  return `${parts.join("_")}.csv`;
}

async function requireUser() {
  const supabase = await getServerSupabase();
  const { data, error } = await supabase.auth.getUser();

  const user = data?.user ?? null;
  if (error || !user) {
    return {
      ok: false as const,
      response: NextResponse.json(
        {
          ok: false,
          code: "UNAUTHENTICATED",
          message: "Sign in required.",
        },
        { status: 401, headers: { "Cache-Control": "no-store" } }
      ),
    };
  }

  return { ok: true as const, supabase, user };
}

async function getRoleForCompany(supabase: any, companyId: string, userId: string) {
  const { data, error } = await supabase
    .from("company_memberships")
    .select("role")
    .eq("company_id", companyId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    return {
      ok: false as const,
      response: NextResponse.json(
        {
          ok: false,
          code: "MEMBERSHIP_CHECK_FAILED",
          message: "Could not validate company membership.",
        },
        { status: 500, headers: { "Cache-Control": "no-store" } }
      ),
    };
  }

  if (!data) {
    return {
      ok: false as const,
      response: NextResponse.json(
        {
          ok: false,
          code: "FORBIDDEN",
          message: "You do not have access to this company.",
        },
        { status: 403, headers: { "Cache-Control": "no-store" } }
      ),
    };
  }

  return { ok: true as const, role: String((data as any).role || "member") };
}

function buildCsv(detail: Awaited<ReturnType<typeof getPayrollRunDetail>> & { ok: true }) {
  const run = detail.run || {};
  const employees = Array.isArray(detail.employees) ? detail.employees : [];

  const headers = [
    "run_id",
    "run_name",
    "run_status",
    "pay_frequency",
    "period_start",
    "period_end",
    "pay_date",
    "employee_id",
    "employee_number",
    "employee_name",
    "email",
    "gross",
    "tax",
    "employee_ni",
    "employer_ni",
    "employee_pension",
    "employer_pension",
    "other_deductions",
    "attachment_of_earnings",
    "student_loan",
    "postgrad_loan",
    "total_deductions",
    "net",
    "tax_code_used",
    "tax_code_basis_used",
    "ni_category_used",
    "pay_frequency_used",
    "pay_basis_used",
    "hours_per_week_used",
    "calc_mode",
  ];

  const lines: string[] = [];
  lines.push(headers.map(csvCell).join(","));

  for (const row of employees) {
    const values = [
      text(run?.id),
      text(pickFirst(run?.run_name, run?.runName, "")),
      text(pickFirst(run?.status, run?.run_status, "")),
      text(pickFirst(run?.frequency, run?.pay_frequency, run?.payFrequency, "")),
      text(pickFirst(run?.period_start, run?.periodStart, "")),
      text(pickFirst(run?.period_end, run?.periodEnd, "")),
      text(pickFirst(run?.pay_date, run?.payDate, "")),
      text(pickFirst(row?.employee_id, row?.employeeId, "")),
      text(pickFirst(row?.employee_number, row?.employeeNumber, row?.payroll_number, "")),
      text(pickFirst(row?.employee_name, row?.employeeName, "")),
      text(pickFirst(row?.email, row?.employee_email, row?.employeeEmail, "")),
      num(pickFirst(row?.gross, row?.gross_pay, row?.total_gross, 0)),
      num(pickFirst(row?.tax, row?.total_tax, row?.tax_pay, row?.paye_tax, row?.income_tax, 0)),
      num(pickFirst(row?.ni_employee, row?.employee_ni, row?.ni, row?.niEmployee, row?.employeeNi, 0)),
      num(pickFirst(row?.ni_employer, row?.employer_ni, row?.niEmployer, row?.employerNi, 0)),
      num(pickFirst(row?.pension_employee, row?.pensionEmployee, row?.employee_pension, 0)),
      num(pickFirst(row?.pension_employer, row?.pensionEmployer, row?.employer_pension, 0)),
      num(pickFirst(row?.other_deductions, row?.otherDeductions, 0)),
      num(pickFirst(row?.attachment_of_earnings, row?.attachmentOfEarnings, 0)),
      num(pickFirst(row?.student_loan, row?.studentLoan, 0)),
      num(pickFirst(row?.pg_loan, row?.postgrad_loan, row?.pgLoan, 0)),
      num(pickFirst(row?.deductions, row?.total_deductions, row?.deduction_total, 0)),
      num(pickFirst(row?.net, row?.net_pay, row?.total_net, 0)),
      text(pickFirst(row?.tax_code_used, row?.taxCode, row?.tax_code, "")),
      text(pickFirst(row?.tax_code_basis_used, row?.tax_code_basis, row?.tax_basis_used, row?.tax_basis, "")),
      text(pickFirst(row?.ni_category_used, row?.ni_category, row?.niCategory, "")),
      text(pickFirst(row?.pay_frequency_used, "")),
      text(pickFirst(row?.pay_basis_used, "")),
      text(pickFirst(row?.hours_per_week_used, "")),
      text(pickFirst(row?.calc_mode, "")),
    ];

    lines.push(values.map(csvCell).join(","));
  }

  return "\ufeff" + lines.join("\r\n");
}

export async function GET(_req: Request, { params }: Ctx) {
  const resolvedParams = await params;
  const runId = String(resolvedParams?.id || "").trim();

  if (!runId) {
    return NextResponse.json(
      { ok: false, message: "Missing payroll run id." },
      { status: 400, headers: { "Cache-Control": "no-store" } }
    );
  }

  if (!isUuid(runId)) {
    return NextResponse.json(
      { ok: false, message: "Invalid payroll run id." },
      { status: 400, headers: { "Cache-Control": "no-store" } }
    );
  }

  const gate = await requireUser();
  if (!gate.ok) return gate.response;

  const detail = await getPayrollRunDetail(gate.supabase, runId, false);
  if (!detail.ok) {
    return NextResponse.json(
      { ok: false, message: detail.error },
      { status: detail.status || 500, headers: { "Cache-Control": "no-store" } }
    );
  }

  const companyId = String(detail.run?.company_id || "").trim();
  if (!companyId || !isUuid(companyId)) {
    return NextResponse.json(
      { ok: false, message: "Payroll run is missing a valid company_id." },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }

  const roleCheck = await getRoleForCompany(gate.supabase, companyId, gate.user.id);
  if (!roleCheck.ok) return roleCheck.response;

  const csv = buildCsv(detail);
  const filename = buildFilename(detail.run, runId);

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}