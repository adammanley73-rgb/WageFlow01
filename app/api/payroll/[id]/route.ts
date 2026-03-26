// C:\Projects\wageflow01\app\api\payroll\[id]\route.ts

import { NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase/server";
import { WorkflowService } from "@/lib/services/workflow.service";
import { calculatePay } from "@/lib/payroll/calculatePay";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

function json(status: number, body: any) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
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

function toNumberSafe(v: any): number {
  const n = typeof v === "number" ? v : parseFloat(String(v ?? "").replace(/[^\d.-]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

function round2(n: number): number {
  return Math.round((Number(n || 0) + Number.EPSILON) * 100) / 100;
}

function isUuid(v: any): boolean {
  const s = String(v ?? "").trim();
  if (!s) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(s);
}

function isIsoDateOnly(s: any): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(s ?? "").trim());
}

function normalizeAction(v: any): string {
  return String(v ?? "").trim().toLowerCase();
}

function isStaffRole(role: string) {
  return ["owner", "admin", "manager", "processor"].includes(String(role || "").toLowerCase());
}

function isApproveRole(role: string) {
  return ["owner", "admin", "manager"].includes(String(role || "").toLowerCase());
}

function isConfirmTrue(v: any): boolean {
  if (v === true) return true;
  const s = String(v ?? "").trim().toLowerCase();
  return s === "true" || s === "1" || s === "yes" || s === "y";
}

function parseBoolStrict(v: any): boolean | null {
  if (v === true) return true;
  if (v === false) return false;
  const s = String(v ?? "").trim().toLowerCase();
  if (!s) return null;
  if (["true", "1", "yes", "y", "on"].includes(s)) return true;
  if (["false", "0", "no", "n", "off"].includes(s)) return false;
  return null;
}

function getObjectSafe(value: any): Record<string, any> | null {
  if (!value) {
    return null;
  }

  if (typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, any>;
  }

  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return parsed as Record<string, any>;
      }
    } catch {
      // ignore invalid JSON metadata
    }
  }

  return null;
}

function normalizeTaxCodeBasisValue(value: any): "cumulative" | "week1_month1" | null {
  const s = String(value ?? "").trim().toLowerCase();
  if (!s) return null;

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

function normalisePayElementSide(value: any): "earning" | "deduction" {
  const s = String(value ?? "").trim().toLowerCase();
  return s === "deduction" ? "deduction" : "earning";
}

function getNonCumulativeTaxMarker(payFrequency: any): "M1" | "W1" {
  const s = String(payFrequency ?? "").trim().toLowerCase();
  if (!s || s === "monthly") return "M1";
  return "W1";
}

function formatTaxCodeForCalc(taxCode: any, basis: any, payFrequency?: any): string {
  const rawBase = (String(taxCode ?? "").trim() || "1257L").toUpperCase();
  const basisNorm = String(basis ?? "").trim().toLowerCase();

  const basisRequestsNonCumulative =
    basisNorm === "week1_month1" ||
    basisNorm === "w1m1" ||
    basisNorm === "week1month1" ||
    basisNorm === "week1" ||
    basisNorm === "month1" ||
    basisNorm === "wk1/mth1" ||
    basisNorm === "wk1mth1";

  const baseHasNonCumulativeMarker = /\b(?:WK1\/MTH1|WK1MTH1|W1M1|W1|M1)\b/i.test(rawBase);

  const cleanedBase = rawBase
    .replace(/\bWK1\/MTH1\b/gi, " ")
    .replace(/\bWK1MTH1\b/gi, " ")
    .replace(/\bW1M1\b/gi, " ")
    .replace(/\bW1\b/gi, " ")
    .replace(/\bM1\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim();

  const base = cleanedBase || "1257L";

  if (basisRequestsNonCumulative || baseHasNonCumulativeMarker) {
    return `${base} ${getNonCumulativeTaxMarker(payFrequency)}`.trim();
  }

  return base;
}

function computeApproxMonthlyNi(gross: number, niCategory: any) {
  const pay = Math.max(0, Number(gross || 0));
  const cat = String(niCategory ?? "A").trim().toUpperCase();

  const PT = 1048;
  const UEL = 4189;
  const ST = 417;

  let employee = 0;
  let employer = 0;

  if (pay > 0) {
    if (cat !== "C") {
      const employeeMainBand = Math.max(Math.min(pay, UEL) - PT, 0);
      const employeeUpperBand = Math.max(pay - UEL, 0);
      employee = employeeMainBand * 0.08 + employeeUpperBand * 0.02;
    }

    employer = Math.max(pay - ST, 0) * 0.15;
  }

  return {
    employee: round2(employee),
    employer: round2(employer),
  };
}

function resultLooksGrossOnly(result: any): boolean {
  const totals = result?.totals ?? {};
  const employees = Array.isArray(result?.employees) ? result.employees : [];

  if (employees.length === 0) return true;

  const totalTax = toNumberSafe(totals?.tax);
  const totalNi = toNumberSafe(totals?.ni);

  const rowsLookGrossOnly = employees.every((row: any) => {
    const gross = toNumberSafe(row?.gross);
    const deductions = toNumberSafe(row?.deductions);
    const net = toNumberSafe(row?.net);

    if (gross <= 0) return true;
    return deductions === 0 && Math.abs(net - gross) <= 0.01;
  });

  return totalTax === 0 && totalNi === 0 && rowsLookGrossOnly;
}

async function requireUser() {
  const supabase = await getServerSupabase();
  const { data, error } = await supabase.auth.getUser();

  const user = data?.user ?? null;
  if (error || !user) {
    return {
      ok: false as const,
      res: json(401, {
        ok: false,
        code: "UNAUTHENTICATED",
        message: "Sign in required.",
      }),
    };
  }

  return { ok: true as const, supabase, user };
}

async function getRoleForCompany(
  supabase: any,
  companyId: string,
  userId: string
): Promise<{ ok: true; role: string } | { ok: false; res: Response }> {
  const { data, error } = await supabase
    .from("company_memberships")
    .select("role")
    .eq("company_id", companyId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    return {
      ok: false,
      res: json(500, {
        ok: false,
        code: "MEMBERSHIP_CHECK_FAILED",
        message: "Could not validate company membership.",
      }),
    };
  }

  if (!data) {
    return {
      ok: false,
      res: json(403, {
        ok: false,
        code: "FORBIDDEN",
        message: "You do not have access to this company.",
      }),
    };
  }

  return { ok: true, role: String((data as any).role || "member") };
}

async function loadRun(supabase: any, runId: string) {
  const { data, error } = await supabase.from("payroll_runs").select("*").eq("id", runId).maybeSingle();

  if (error) {
    return { ok: false as const, status: 500, error: error.message };
  }

  if (!data) {
    return { ok: false as const, status: 404, error: "Payroll run not found" };
  }

  return { ok: true as const, run: data as any };
}

async function loadAttachments(supabase: any, runId: string, companyId: string) {
  const attempts: any[] = [];

  const a = await supabase
    .from("payroll_run_employees")
    .select("*")
    .eq("run_id", runId)
    .eq("company_id", companyId);

  if (!a.error) {
    return {
      ok: true as const,
      tableUsed: "payroll_run_employees",
      whereColumn: "run_id,company_id",
      rows: Array.isArray(a.data) ? a.data : [],
      attempts,
    };
  }

  attempts.push({
    table: "payroll_run_employees",
    col: "run_id,company_id",
    error: { code: a.error.code, message: a.error.message, details: a.error.details, hint: a.error.hint },
  });

  const msg = String(a.error.message || "").toLowerCase();
  const missingCol = a.error.code === "42703" || (msg.includes("column") && msg.includes("does not exist"));

  if (missingCol) {
    const b = await supabase.from("payroll_run_employees").select("*").eq("run_id", runId);

    if (!b.error) {
      return {
        ok: true as const,
        tableUsed: "payroll_run_employees",
        whereColumn: "run_id",
        rows: Array.isArray(b.data) ? b.data : [],
        attempts,
      };
    }

    attempts.push({
      table: "payroll_run_employees",
      col: "run_id",
      error: { code: b.error.code, message: b.error.message, details: b.error.details, hint: b.error.hint },
    });
  }

  return { ok: false as const, tableUsed: null, whereColumn: null, rows: [], attempts };
}

function buildEmployeeRow(att: any, emp: any, run: any) {
  const meta = getObjectSafe(att?.metadata);

  const employeeId = String(pickFirst(att?.employee_id, att?.employeeId, "") || "");

  const employeeName = String(
    pickFirst(
      emp?.full_name,
      emp?.fullName,
      emp?.name,
      [emp?.first_name, emp?.last_name].filter(Boolean).join(" ").trim(),
      [emp?.firstName, emp?.lastName].filter(Boolean).join(" ").trim(),
      "â€”"
    ) || "â€”"
  );

  const employeeNumber = String(
    pickFirst(
      emp?.employee_number,
      emp?.employeeNumber,
      emp?.payroll_number,
      emp?.payrollNumber,
      emp?.payroll_no,
      emp?.payrollNo,
      "â€”"
    ) || "â€”"
  );

  const email = String(pickFirst(emp?.email, emp?.work_email, emp?.workEmail, "â€”") || "â€”");

  const gross = round2(toNumberSafe(pickFirst(att?.gross_pay, att?.grossPay, att?.gross, 0)));

  const storedTax = round2(toNumberSafe(pickFirst(att?.tax, att?.paye_tax, att?.income_tax, 0)));
  const storedEmployeeNi = round2(toNumberSafe(pickFirst(att?.ni_employee, att?.employee_ni, att?.ni, 0)));
  const storedEmployerNi = round2(toNumberSafe(pickFirst(att?.ni_employer, att?.employer_ni, 0)));
  const pensionEmployee = round2(
    toNumberSafe(pickFirst(att?.pension_employee, att?.pensionEmployee, att?.employee_pension, 0))
  );
  const pensionEmployer = round2(
    toNumberSafe(pickFirst(att?.pension_employer, att?.pensionEmployer, att?.employer_pension, 0))
  );
  const otherDeductions = round2(toNumberSafe(pickFirst(att?.other_deductions, att?.otherDeductions, 0)));
  const aoe = round2(toNumberSafe(pickFirst(att?.attachment_of_earnings, att?.attachmentOfEarnings, 0)));
  const studentLoanDeduction = round2(toNumberSafe(pickFirst(att?.student_loan, att?.studentLoan, 0)));
  const postgradLoanDeduction = round2(
    toNumberSafe(pickFirst(att?.pg_loan, att?.postgrad_loan, att?.pgLoan, 0))
  );
  const storedNet = round2(toNumberSafe(pickFirst(att?.net_pay, att?.netPay, att?.net, gross)));

  let tax = storedTax;
  let employeeNi = storedEmployeeNi;
  let employerNi = storedEmployerNi;
  let usedTaxFallback = false;
  let usedNiFallback = false;

  const taxCodeUsedRaw = pickFirst(
    att?.tax_code_used,
    att?.taxCodeUsed,
    emp?.tax_code,
    emp?.taxCode,
    emp?.taxcode,
    null
  );
  const taxCodeUsed =
    taxCodeUsedRaw === null || taxCodeUsedRaw === undefined
      ? null
      : String(taxCodeUsedRaw).trim().toUpperCase() || null;

  const taxCodeBasisUsed = normalizeTaxCodeBasisValue(
    pickFirst(
      att?.tax_code_basis_used,
      att?.taxCodeBasisUsed,
      meta?.tax_code_basis_used,
      emp?.tax_code_basis,
      emp?.tax_basis,
      emp?.taxBasis,
      null
    )
  );

  const niCategoryUsedRaw = pickFirst(
    att?.ni_category_used,
    att?.niCategoryUsed,
    emp?.ni_category,
    emp?.niCategory,
    emp?.ni_cat,
    emp?.niCat,
    null
  );
  const niCategoryUsed =
    niCategoryUsedRaw === null || niCategoryUsedRaw === undefined
      ? null
      : String(niCategoryUsedRaw).trim().toUpperCase() || null;

  const runFrequency = String(
    pickFirst(run?.frequency, run?.pay_frequency, run?.payFrequency, att?.pay_frequency_used, "") || ""
  )
    .trim()
    .toLowerCase();

  if (tax <= 0 && gross > 0 && runFrequency === "monthly" && taxCodeUsed) {
    try {
      const periodStartSrc = String(pickFirst(run?.period_start, run?.pay_period_start, run?.start_date, "") || "");
      const taxYear = parseInt(periodStartSrc.slice(0, 4), 10);

      const payResult = calculatePay({
        grossForPeriod: gross,
        taxCode: formatTaxCodeForCalc(taxCodeUsed, taxCodeBasisUsed, runFrequency),
        period: 1,
        ytdTaxableBeforeThisPeriod: toNumberSafe(
          pickFirst(att?.ytd_taxable_before, att?.ytd_gross_before, emp?.ytd_gross, 0)
        ),
        ytdTaxPaidBeforeThisPeriod: toNumberSafe(pickFirst(att?.ytd_tax_before, emp?.ytd_tax, 0)),
        taxYear: Number.isFinite(taxYear) ? taxYear : undefined,
      });

      const computedTax = round2(Number((payResult as any)?.tax ?? 0));
      if (computedTax > 0) {
        tax = computedTax;
        usedTaxFallback = true;
      }
    } catch {
      // leave stored/fallback value as-is
    }
  }

  if (gross > 0 && runFrequency === "monthly" && niCategoryUsed && employeeNi <= 0 && employerNi <= 0) {
    try {
      const ni = computeApproxMonthlyNi(gross, niCategoryUsed);
      const cat = String(niCategoryUsed || "").trim().toUpperCase();

      if (ni.employee > 0 || ni.employer > 0 || cat === "C") {
        employeeNi = ni.employee;
        employerNi = ni.employer;
        usedNiFallback = true;
      }
    } catch {
      // leave stored/fallback value as-is
    }
  }

  const deductions = round2(
    tax + employeeNi + pensionEmployee + otherDeductions + aoe + studentLoanDeduction + postgradLoanDeduction
  );

  const derivedNet = round2(Math.max(0, gross - deductions));

  const storedRowLooksGrossOnly =
    gross > 0 &&
    Math.abs(storedNet - gross) <= 0.01 &&
    storedTax <= 0 &&
    storedEmployeeNi <= 0 &&
    storedEmployerNi <= 0;

  const netShouldBeDerived =
    gross > 0 &&
    (usedTaxFallback ||
      usedNiFallback ||
      storedRowLooksGrossOnly ||
      storedNet <= 0 ||
      (Math.abs(storedNet - derivedNet) > 0.01 && (storedTax <= 0 || storedEmployeeNi <= 0)));

  const net = round2(netShouldBeDerived ? derivedNet : storedNet);

  const safeId = String(pickFirst(att?.id, "") || "");
  const calcMode = String(pickFirst(att?.calc_mode, "uncomputed") || "uncomputed");

  return {
    ...(att && typeof att === "object" ? att : {}),

    id: safeId,
    payroll_run_employee_id: safeId,
    payrollRunEmployeeId: safeId,

    employee_id: employeeId,
    employeeId: employeeId,

    employee_name: employeeName,
    employeeName: employeeName,

    employee_number: employeeNumber,
    employeeNumber: employeeNumber,
    payroll_number: employeeNumber,
    payrollNumber: employeeNumber,

    email,
    employee_email: email,
    employeeEmail: email,

    gross: round2(gross),
    gross_pay: round2(gross),
    total_gross: round2(gross),
    gross_pay_used: round2(gross),

    tax: round2(tax),
    total_tax: round2(tax),
    tax_pay: round2(tax),
    paye_tax: round2(tax),
    income_tax: round2(tax),

    ni: round2(employeeNi),
    ni_employee: round2(employeeNi),
    employee_ni: round2(employeeNi),
    niEmployee: round2(employeeNi),
    employeeNi: round2(employeeNi),

    ni_employer: round2(employerNi),
    employer_ni: round2(employerNi),
    niEmployer: round2(employerNi),
    employerNi: round2(employerNi),

    pension_employee: round2(pensionEmployee),
    pensionEmployee: round2(pensionEmployee),
    employee_pension: round2(pensionEmployee),

    pension_employer: round2(pensionEmployer),
    pensionEmployer: round2(pensionEmployer),
    employer_pension: round2(pensionEmployer),

    other_deductions: round2(otherDeductions),
    otherDeductions: round2(otherDeductions),

    attachment_of_earnings: round2(aoe),
    attachmentOfEarnings: round2(aoe),

    student_loan: round2(studentLoanDeduction),
    studentLoan: round2(studentLoanDeduction),

    pg_loan: round2(postgradLoanDeduction),
    postgrad_loan: round2(postgradLoanDeduction),
    pgLoan: round2(postgradLoanDeduction),

    deductions: round2(deductions),
    total_deductions: round2(deductions),
    deduction_total: round2(deductions),

    net: round2(net),
    net_pay: round2(net),
    total_net: round2(net),

    calc_mode: calcMode,
    manual_override: Boolean(att?.manual_override ?? false),

    tax_code_used: taxCodeUsed,
    tax_code: taxCodeUsed,
    taxCode: taxCodeUsed,

    tax_code_basis_used: taxCodeBasisUsed,
    tax_code_basis: taxCodeBasisUsed,
    tax_basis_used: taxCodeBasisUsed,
    tax_basis: taxCodeBasisUsed,

    ni_category_used: niCategoryUsed,
    ni_category: niCategoryUsed,
    niCategory: niCategoryUsed,

    pay_frequency_used: pickFirst(
      att?.pay_frequency_used,
      emp?.pay_frequency,
      emp?.frequency,
      run?.frequency,
      run?.pay_frequency,
      null
    ),

    pay_basis_used: pickFirst(
      att?.pay_basis_used,
      emp?.pay_basis,
      emp?.pay_basis_used,
      emp?.pay_type,
      emp?.payType,
      null
    ),

    hours_per_week_used: pickFirst(att?.hours_per_week_used, emp?.hours_per_week, emp?.hoursPerWeek, null),
  };
}

function summariseEmployeeRows(employees: any[]) {
  const gross = round2(
    employees.reduce((sum: number, row: any) => sum + toNumberSafe(pickFirst(row?.gross, row?.gross_pay, 0)), 0)
  );
  const tax = round2(
    employees.reduce((sum: number, row: any) => sum + toNumberSafe(pickFirst(row?.tax, row?.total_tax, 0)), 0)
  );
  const ni = round2(
    employees.reduce(
      (sum: number, row: any) => sum + toNumberSafe(pickFirst(row?.ni_employee, row?.employee_ni, row?.ni, 0)),
      0
    )
  );
  const deductions = round2(
    employees.reduce(
      (sum: number, row: any) => sum + toNumberSafe(pickFirst(row?.deductions, row?.total_deductions, 0)),
      0
    )
  );
  const net = round2(
    employees.reduce((sum: number, row: any) => sum + toNumberSafe(pickFirst(row?.net, row?.net_pay, 0)), 0)
  );

  return { gross, tax, ni, deductions, net };
}

function deriveSeededMode(run: any, attachments: any[]): boolean {
  if (!Array.isArray(attachments) || attachments.length === 0) return true;

  const runTax = toNumberSafe(pickFirst(run?.total_tax, 0));
  const runNi = toNumberSafe(pickFirst(run?.total_ni, 0));

  const allGrossOnly = attachments.every((r: any) => {
    const gross = toNumberSafe(pickFirst(r?.gross_pay, r?.grossPay, 0));
    const net = toNumberSafe(pickFirst(r?.net_pay, r?.netPay, gross));
    const tax = toNumberSafe(pickFirst(r?.tax, 0));
    const niEmp = toNumberSafe(pickFirst(r?.ni_employee, r?.employee_ni, 0));
    const niEr = toNumberSafe(pickFirst(r?.ni_employer, r?.employer_ni, 0));
    const sameNet = Math.abs(Number((net - gross).toFixed(2))) <= 0.01;
    return sameNet && tax === 0 && niEmp === 0 && niEr === 0;
  });

  const hasCalcMode = attachments.some((r: any) => r && typeof r === "object" && "calc_mode" in r);
  if (hasCalcMode) {
    const anyNotFull = attachments.some((r: any) => String(pickFirst(r?.calc_mode, "uncomputed")) !== "full");
    if (anyNotFull) return true;
  }

  return runTax === 0 && runNi === 0 && allGrossOnly;
}

function computeExceptions(attachments: any[], empById: Map<string, any>) {
  const items: any[] = [];
  let blockingCount = 0;
  let warningCount = 0;

  for (const att of attachments || []) {
    const employeeId = String(pickFirst(att?.employee_id, "") || "").trim();
    const gross = toNumberSafe(pickFirst(att?.gross_pay, att?.grossPay, 0));

    const emp = employeeId ? empById.get(employeeId) : null;

    const employeeName = String(
      pickFirst(
        emp?.full_name,
        emp?.fullName,
        emp?.name,
        [emp?.first_name, emp?.last_name].filter(Boolean).join(" ").trim(),
        [emp?.firstName, emp?.lastName].filter(Boolean).join(" ").trim(),
        "â€”"
      ) || "â€”"
    );

    const codes: string[] = [];

    if (gross <= 0) codes.push("GROSS_ZERO");

    const taxCode = pickFirst(att?.tax_code_used, emp?.tax_code, emp?.taxCode, emp?.taxcode, null);
    if (!taxCode) codes.push("MISSING_TAX_CODE");

    const niCat = pickFirst(att?.ni_category_used, emp?.ni_category, emp?.niCategory, emp?.ni_cat, emp?.niCat, null);
    if (!niCat) codes.push("MISSING_NI_CATEGORY");

    const blocking = codes.includes("MISSING_TAX_CODE") || codes.includes("MISSING_NI_CATEGORY");

    if (blocking) blockingCount++;
    else if (codes.length > 0) warningCount++;

    if (codes.length > 0) {
      items.push({
        employee_id: employeeId || null,
        employee_name: employeeName,
        codes,
        blocking,
      });
    }
  }

  return { items, blockingCount, warningCount, total: items.length };
}

function deriveRtiLogType(_run: any): "FPS" | "EPS" | "EYU" {
  return "FPS";
}

function deriveRtiLogPeriod(run: any): string {
  const frequency = String(
    pickFirst(run?.frequency, run?.pay_frequency, run?.payFrequency, run?.pay_schedule_frequency_used, "") || ""
  )
    .trim()
    .toLowerCase();

  const start = String(pickFirst(run?.period_start, run?.pay_period_start, run?.start_date, "") || "").trim();
  const end = String(pickFirst(run?.period_end, run?.pay_period_end, run?.end_date, "") || "").trim();
  const payDate = String(pickFirst(run?.pay_date, run?.payDate, "") || "").trim();

  const freqLabel = frequency ? `${frequency.charAt(0).toUpperCase()}${frequency.slice(1)} ` : "";

  if (isIsoDateOnly(start) && isIsoDateOnly(end)) {
    return `${freqLabel}${start} to ${end}`.trim();
  }

  if (isIsoDateOnly(payDate)) {
    return `${freqLabel}pay date ${payDate}`.trim();
  }

  return String(pickFirst(run?.run_name, run?.runName, "Payroll run") || "Payroll run");
}

async function upsertRtiLogForRun(
  supabase: any,
  runId: string,
  companyId: string,
  run: any,
  nextStatus: "pending" | "submitted" | "accepted" | "rejected",
  message: string
) {
  const type = deriveRtiLogType(run);
  const period = deriveRtiLogPeriod(run);
  const nowIso = new Date().toISOString();

  const { data: existing, error: existingErr } = await supabase
    .from("rti_logs")
    .select("id,reference,status,submitted_at")
    .eq("pay_run_id", runId)
    .eq("company_id", companyId)
    .eq("type", type)
    .order("submitted_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existingErr) {
    return {
      ok: false as const,
      error: {
        code: existingErr.code,
        message: existingErr.message,
        details: existingErr.details,
        hint: existingErr.hint,
      },
    };
  }

  const payload: any = {
    pay_run_id: runId,
    company_id: companyId,
    type,
    period,
    status: nextStatus,
    message,
    submitted_at: nowIso,
  };

  if (existing?.reference) {
    payload.reference = existing.reference;
  }

  if (existing?.id) {
    const { error: updateErr } = await supabase.from("rti_logs").update(payload).eq("id", String(existing.id));

    if (updateErr) {
      return {
        ok: false as const,
        error: {
          code: updateErr.code,
          message: updateErr.message,
          details: updateErr.details,
          hint: updateErr.hint,
        },
      };
    }

    return {
      ok: true as const,
      existed: true,
      id: String(existing.id),
      type,
      period,
      status: nextStatus,
    };
  }

  const { data: inserted, error: insertErr } = await supabase
    .from("rti_logs")
    .insert(payload)
    .select("id")
    .maybeSingle();

  if (insertErr) {
    return {
      ok: false as const,
      error: {
        code: insertErr.code,
        message: insertErr.message,
        details: insertErr.details,
        hint: insertErr.hint,
      },
    };
  }

  return {
    ok: true as const,
    existed: false,
    id: String(inserted?.id || ""),
    type,
    period,
    status: nextStatus,
  };
}

async function getRunAndEmployees(supabase: any, runId: string, includeDebug: boolean) {
  const debug: any = { runId, stage: {} };

  const runRes = await loadRun(supabase, runId);
  if (!runRes.ok) {
    debug.stage.runFetch = { ok: false, error: runRes.error };
    return {
      ok: false as const,
      status: runRes.status,
      error: runRes.error,
      debug: includeDebug ? debug : undefined,
    };
  }

  const run = runRes.run;
  debug.stage.runFetch = { ok: true };

  const companyId = String(run?.company_id || "").trim();
  if (!companyId || !isUuid(companyId)) {
    return {
      ok: false as const,
      status: 500,
      error: "Payroll run is missing a valid company_id.",
      debug: includeDebug ? { ...debug, companyId } : undefined,
    };
  }

  const attachTry = await loadAttachments(supabase, runId, companyId);
  if (!attachTry.ok) {
    return {
      ok: false as const,
      status: 500,
      error: "Failed to load attached employees for payroll run.",
      debug: includeDebug ? { ...debug, attempts: attachTry.attempts } : undefined,
    };
  }

  const attachments = attachTry.rows || [];
  debug.stage.attachments = { ok: true, count: attachments.length };

  const employeeIds = Array.from(
    new Set(
      attachments
        .map((r: any) => String(pickFirst(r?.employee_id, "") || "").trim())
        .filter(Boolean)
    )
  );

  let empRows: any[] = [];

  if (employeeIds.length > 0) {
    const { data: emps, error: empErr } = await supabase
      .from("employees")
      .select("*")
      .in("id", employeeIds)
      .eq("company_id", companyId);

    if (empErr) {
      return {
        ok: false as const,
        status: 500,
        error: "Failed to load employees for payroll run.",
        debug: includeDebug ? { ...debug, empErr: empErr.message } : undefined,
      };
    }

    empRows = Array.isArray(emps) ? emps : [];
  }

  debug.stage.employeeFetch = { ok: true, requested: employeeIds.length, found: empRows.length };

  const empById = new Map<string, any>();
  for (const e of empRows) {
    const id = String((e as any)?.id || "").trim();
    if (id) empById.set(id, e);
  }

  const employees = attachments.map((att: any) => {
    const employeeId = String(pickFirst(att?.employee_id, "") || "").trim();
    const emp = employeeId ? empById.get(employeeId) : null;
    return buildEmployeeRow(att, emp, run);
  });

  const storedTotalGross = round2(toNumberSafe(pickFirst(run?.total_gross_pay, 0)));
  const storedTotalTax = round2(toNumberSafe(pickFirst(run?.total_tax, 0)));
  const storedTotalNi = round2(toNumberSafe(pickFirst(run?.total_ni, 0)));
  const storedTotalNet = round2(toNumberSafe(pickFirst(run?.total_net_pay, 0)));

  const rowTotals = summariseEmployeeRows(employees);
  const storedDerivedDeductions = round2(storedTotalGross - storedTotalNet);

  const storedTotalsLookStale =
    employees.length > 0 &&
    ((rowTotals.tax > 0 && storedTotalTax === 0) ||
      (rowTotals.ni > 0 && storedTotalNi === 0) ||
      (rowTotals.net > 0 &&
        Math.abs(storedTotalNet - rowTotals.net) > 0.01 &&
        (storedTotalTax === 0 || storedTotalNi === 0)) ||
      (rowTotals.deductions > 0 &&
        Math.abs(storedDerivedDeductions - rowTotals.deductions) > 0.01 &&
        (storedTotalTax === 0 || storedTotalNi === 0)));

  const totalGross = storedTotalsLookStale && rowTotals.gross > 0 ? rowTotals.gross : storedTotalGross;
  const totalTax = storedTotalsLookStale ? rowTotals.tax : storedTotalTax;
  const totalNi = storedTotalsLookStale ? rowTotals.ni : storedTotalNi;
  const totalNet = storedTotalsLookStale && rowTotals.net > 0 ? rowTotals.net : storedTotalNet;
  const totalDeductions = storedTotalsLookStale
    ? rowTotals.deductions
    : rowTotals.deductions > 0
      ? rowTotals.deductions
      : storedDerivedDeductions;

  const totals = {
    gross: totalGross,
    total_gross: totalGross,
    tax: totalTax,
    total_tax: totalTax,
    ni: totalNi,
    total_ni: totalNi,
    deductions: totalDeductions,
    total_deductions: totalDeductions,
    net: totalNet,
    total_net: totalNet,
  };

  const seededMode = deriveSeededMode(run, attachments);
  const exceptions = computeExceptions(attachments, empById);

  return {
    ok: true as const,
    run: { ...(run as any), company_id: companyId },
    employees,
    totals,
    seededMode,
    exceptions,
    attachmentsMeta: { tableUsed: attachTry.tableUsed, whereColumn: attachTry.whereColumn },
    debug: includeDebug ? debug : undefined,
  };
}

async function fetchRunStatusAndFlag(supabase: any, runId: string, companyId: string) {
  const attempts: any[] = [];

  const a = await supabase
    .from("payroll_runs")
    .select("id,company_id,status,attached_all_due_employees")
    .eq("id", runId)
    .eq("company_id", companyId)
    .maybeSingle();

  if (!a.error && a.data) {
    return {
      ok: true,
      run: a.data,
      hasAttachedFlag: true,
      attachedFlag: (a.data as any)?.attached_all_due_employees,
      attempts,
    };
  }

  if (a.error) {
    attempts.push({
      cols: "id,company_id,status,attached_all_due_employees",
      error: { code: a.error.code, message: a.error.message, details: a.error.details, hint: a.error.hint },
    });
  }

  const msg = String(a.error?.message || "").toLowerCase();
  const missingCol = a.error?.code === "42703" || (msg.includes("column") && msg.includes("does not exist"));

  if (missingCol) {
    const b = await supabase
      .from("payroll_runs")
      .select("id,company_id,status")
      .eq("id", runId)
      .eq("company_id", companyId)
      .maybeSingle();

    if (!b.error && b.data) {
      return { ok: true, run: b.data, hasAttachedFlag: false, attachedFlag: undefined, attempts };
    }

    if (b.error) {
      attempts.push({
        cols: "id,company_id,status",
        error: { code: b.error.code, message: b.error.message, details: b.error.details, hint: b.error.hint },
      });
    }
  }

  return { ok: false, run: null, hasAttachedFlag: false, attachedFlag: undefined, attempts };
}

async function updatePayrollRunSafe(
  supabase: any,
  runId: string,
  companyId: string,
  patch: Record<string, any>
): Promise<{ ok: true } | { ok: false; error: any }> {
  const nowIso = new Date().toISOString();
  const withUpdated = { ...patch, updated_at: nowIso };

  const a = await supabase.from("payroll_runs").update(withUpdated).eq("id", runId).eq("company_id", companyId);
  if (!a.error) return { ok: true };

  const msg = String(a.error?.message || "").toLowerCase();
  const missingCol = a.error?.code === "42703" || (msg.includes("column") && msg.includes("does not exist"));

  if (missingCol && "updated_at" in withUpdated) {
    const { updated_at, ...withoutUpdated } = withUpdated;
    const b = await supabase.from("payroll_runs").update(withoutUpdated).eq("id", runId).eq("company_id", companyId);
    if (!b.error) return { ok: true };
    return { ok: false, error: b.error };
  }

  return { ok: false, error: a.error };
}

async function restoreAttachedAllDueEmployeesIfNeeded(
  supabase: any,
  runId: string,
  companyId: string,
  beforeValue: any,
  afterValue: any,
  enabled: boolean
) {
  if (!enabled) return { ok: true, restored: false, reason: "flag not present" };

  const before = parseBoolStrict(beforeValue);
  const after = parseBoolStrict(afterValue);

  if (before === after) return { ok: true, restored: false, reason: "no change" };

  if (before === null) {
    return { ok: true, restored: false, reason: "before value was null" };
  }

  const up = await updatePayrollRunSafe(supabase, runId, companyId, { attached_all_due_employees: before });
  if (!up.ok) {
    return {
      ok: false,
      restored: false,
      error: { code: up.error.code, message: up.error.message, details: up.error.details, hint: up.error.hint },
    };
  }

  return { ok: true, restored: true, before, after };
}

async function refreshRunTotalsFromAttachments(supabase: any, runId: string, companyId: string) {
  const attachTry = await loadAttachments(supabase, runId, companyId);
  if (!attachTry.ok) {
    return {
      ok: false,
      status: 500,
      error: "Failed to read payroll_run_employees for totals refresh.",
      debug: { attempts: attachTry.attempts },
    };
  }

  const rr = Array.isArray(attachTry.rows) ? attachTry.rows : [];

  const grossSum = rr.reduce((a: number, x: any) => a + toNumberSafe(pickFirst(x?.gross_pay, x?.grossPay, 0)), 0);
  const netSum = rr.reduce((a: number, x: any) => a + toNumberSafe(pickFirst(x?.net_pay, x?.netPay, 0)), 0);
  const taxSum = rr.reduce((a: number, x: any) => a + toNumberSafe(pickFirst(x?.tax, 0)), 0);
  const niSum = rr.reduce((a: number, x: any) => a + toNumberSafe(pickFirst(x?.ni_employee, x?.employee_ni, 0)), 0);

  const up = await updatePayrollRunSafe(supabase, runId, companyId, {
    total_gross_pay: Number(grossSum.toFixed(2)),
    total_net_pay: Number(netSum.toFixed(2)),
    total_tax: Number(taxSum.toFixed(2)),
    total_ni: Number(niSum.toFixed(2)),
  });

  if (!up.ok) {
    return { ok: false, status: 500, error: String(up.error?.message || "Failed to update payroll run totals.") };
  }

  return { ok: true, status: 200, tableUsed: "payroll_run_employees", whereColumn: attachTry.whereColumn };
}

async function setGrossOnlyCalcForRun(supabase: any, runId: string, companyId: string) {
  const attachTry = await loadAttachments(supabase, runId, companyId);
  if (!attachTry.ok) {
    return {
      ok: false,
      status: 500,
      error: "Failed to load payroll_run_employees for gross-only recalculation.",
      debug: { attempts: attachTry.attempts },
    };
  }

  const rr = Array.isArray(attachTry.rows) ? attachTry.rows : [];

  for (const r of rr) {
    const rowId = String(pickFirst(r?.id, "") || "").trim();
    if (!rowId) continue;

    const gross = toNumberSafe(pickFirst(r?.gross_pay, r?.grossPay, 0));
    const otherDeductions = toNumberSafe(pickFirst(r?.other_deductions, 0));
    const pensionEmployee = toNumberSafe(pickFirst(r?.pension_employee, 0));
    const aoe = toNumberSafe(pickFirst(r?.attachment_of_earnings, 0));

    let net = 0;
    if (gross > 0) {
      net = gross - otherDeductions - pensionEmployee - aoe;
      if (!Number.isFinite(net) || net < 0) net = 0;
    }

    const patch: any = {
      calc_mode: "gross_only",
      net_pay: Number(net.toFixed(2)),
      tax: 0,
      ni_employee: 0,
      ni_employer: 0,
    };

    if (r && typeof r === "object" && "employee_ni" in r) patch.employee_ni = 0;
    if (r && typeof r === "object" && "employer_ni" in r) patch.employer_ni = 0;

    const { error: upErr } = await supabase
      .from("payroll_run_employees")
      .update(patch)
      .eq("id", rowId)
      .eq("run_id", runId);

    if (upErr) {
      return { ok: false, status: 500, error: `Failed to update gross-only calc for row ${rowId}: ${upErr.message}` };
    }
  }

  return { ok: true, status: 200 };
}

async function updateRunEmployeeRow(
  supabase: any,
  runId: string,
  rowId: string,
  gross: number,
  deductions: number,
  net: number
) {
  const patch = { gross_pay: gross, net_pay: net, other_deductions: deductions, manual_override: true };

  const { error } = await supabase.from("payroll_run_employees").update(patch).eq("id", rowId).eq("run_id", runId);

  if (!error) return { ok: true as const };

  return {
    ok: false as const,
    error: { code: error.code, message: error.message, details: error.details, hint: error.hint },
  };
}

async function tryComputeFullViaRpc(supabase: any, runId: string) {
  const attempts: any[] = [];

  const candidates = [
    { fn: "payroll_run_compute_full", args: { p_run_id: runId } },
    { fn: "compute_payroll_run_full", args: { run_id: runId } },
    { fn: "payroll_run_compute", args: { run_id: runId, mode: "full" } },
    { fn: "compute_payroll_run", args: { run_id: runId, mode: "full" } },
    { fn: "payroll_compute_run_full", args: { run_id: runId } },
    { fn: "payroll_compute_run", args: { run_id: runId } },
    { fn: "run_compute_full", args: { run_id: runId } },
    { fn: "compute_run_full", args: { run_id: runId } },
    { fn: "wf_compute_payroll_run", args: { run_id: runId, compute_mode: "full" } },
  ];

  for (const c of candidates) {
    const { data, error } = await supabase.rpc(c.fn, c.args);
    if (!error) return { ok: true, via: { fn: c.fn, args: c.args }, data, attempts };

    attempts.push({
      fn: c.fn,
      args: c.args,
      error: { code: error.code, message: error.message, details: error.details, hint: error.hint },
    });
  }

  return {
    ok: false,
    status: 501,
    error: "No Supabase RPC function was found to compute a payroll run in full.",
    attempts: attempts.slice(0, 12),
  };
}

async function upsertGeneratedPayElement(
  supabase: any,
  payrollRunEmployeeId: string,
  payElementTypeId: string,
  amount: number,
  descriptionOverride: string
) {
  const { data: existing, error: existingErr } = await supabase
    .from("payroll_run_pay_elements")
    .select("id")
    .eq("payroll_run_employee_id", payrollRunEmployeeId)
    .eq("pay_element_type_id", payElementTypeId)
    .maybeSingle();

  if (existingErr) {
    return {
      ok: false as const,
      error: {
        code: existingErr.code,
        message: existingErr.message,
        details: existingErr.details,
        hint: existingErr.hint,
      },
    };
  }

  const payload = {
    amount: round2(amount),
    description_override: descriptionOverride,
  };

  if (existing?.id) {
    const { error: upErr } = await supabase
      .from("payroll_run_pay_elements")
      .update(payload)
      .eq("id", String(existing.id));

    if (upErr) {
      return {
        ok: false as const,
        error: { code: upErr.code, message: upErr.message, details: upErr.details, hint: upErr.hint },
      };
    }

    return { ok: true as const };
  }

  const { error: insErr } = await supabase.from("payroll_run_pay_elements").insert({
    payroll_run_employee_id: payrollRunEmployeeId,
    pay_element_type_id: payElementTypeId,
    amount: round2(amount),
    description_override: descriptionOverride,
  });

  if (insErr) {
    return {
      ok: false as const,
      error: { code: insErr.code, message: insErr.message, details: insErr.details, hint: insErr.hint },
    };
  }

  return { ok: true as const };
}

async function localComputeFullFromElements(supabase: any, runId: string, companyId: string, run: any) {
  const attachTry = await loadAttachments(supabase, runId, companyId);
  if (!attachTry.ok) {
    return {
      ok: false as const,
      status: 500,
      error: "Failed to load payroll_run_employees for local full compute.",
      debug: { attempts: attachTry.attempts || [] },
    };
  }

  const attachments = Array.isArray(attachTry.rows) ? attachTry.rows : [];
  const preIds = attachments
    .map((r: any) => String(pickFirst(r?.id, "") || "").trim())
    .filter(Boolean);

  if (preIds.length === 0) {
    return { ok: false as const, status: 409, error: "No attached employees found for local full compute." };
  }

  const { data: elementRowsRaw, error: elementErr } = await supabase
    .from("payroll_run_pay_elements")
    .select("id,payroll_run_employee_id,pay_element_type_id,amount,description_override")
    .in("payroll_run_employee_id", preIds);

  if (elementErr) {
    return { ok: false as const, status: 500, error: `Failed to load pay elements: ${elementErr.message}` };
  }

  const elementRows = Array.isArray(elementRowsRaw) ? elementRowsRaw : [];
  const typeIds = Array.from(
    new Set(
      elementRows
        .map((r: any) => String(pickFirst(r?.pay_element_type_id, "") || "").trim())
        .filter(Boolean)
    )
  );

  const codesWeNeed = ["PAYE", "EE_NI", "ER_NI"];
  const { data: generatedTypesRaw, error: generatedTypeErr } = await supabase
    .from("pay_element_types")
    .select("id,code,side")
    .in("code", codesWeNeed);

  if (generatedTypeErr) {
    return {
      ok: false as const,
      status: 500,
      error: `Failed to load generated pay element types: ${generatedTypeErr.message}`,
    };
  }

  const generatedTypeByCode = new Map<string, any>();
  for (const t of Array.isArray(generatedTypesRaw) ? generatedTypesRaw : []) {
    const code = String((t as any)?.code || "").trim().toUpperCase();
    if (code) generatedTypeByCode.set(code, t);
  }

  let typeById = new Map<string, any>();
  if (typeIds.length > 0) {
    const { data: typeRowsRaw, error: typeErr } = await supabase
      .from("pay_element_types")
      .select("id,code,side")
      .in("id", typeIds);

    if (typeErr) {
      return { ok: false as const, status: 500, error: `Failed to load pay element types: ${typeErr.message}` };
    }

    for (const t of Array.isArray(typeRowsRaw) ? typeRowsRaw : []) {
      const id = String((t as any)?.id || "").trim();
      if (id) typeById.set(id, t);
    }
  }

  const byPreId = new Map<string, any[]>();
  for (const row of elementRows) {
    const preId = String((row as any)?.payroll_run_employee_id || "").trim();
    if (!preId) continue;
    if (!byPreId.has(preId)) byPreId.set(preId, []);
    byPreId.get(preId)!.push(row);
  }

  const runFrequency = String(pickFirst(run?.frequency, "") || "").trim().toLowerCase();
  const taxYear = (() => {
    const src = String(pickFirst(run?.period_start, run?.pay_period_start, "") || "");
    const yr = parseInt(src.slice(0, 4), 10);
    return Number.isFinite(yr) ? yr : undefined;
  })();

  for (const att of attachments) {
    const preId = String(pickFirst(att?.id, "") || "").trim();
    if (!preId) continue;

    const rows = byPreId.get(preId) || [];

    let gross = 0;
    let employeeElementDeductions = 0;

    for (const row of rows) {
      const typeId = String(pickFirst((row as any)?.pay_element_type_id, "") || "").trim();
      const amount = round2(toNumberSafe((row as any)?.amount));
      const type = typeId ? typeById.get(typeId) : null;
      const code = String((type as any)?.code || "").trim().toUpperCase();
      const side = normalisePayElementSide((type as any)?.side);

      if (side === "earning") {
        gross += amount;
        continue;
      }

      if (code === "PAYE" || code === "EE_NI" || code === "ER_NI") continue;

      employeeElementDeductions += amount;
    }

    gross = round2(gross);
    employeeElementDeductions = round2(employeeElementDeductions);

    const rawTaxCode = pickFirst(att?.tax_code_used, null);
    const rawTaxBasis = pickFirst(att?.tax_code_basis_used, null);
    const niCategory = String(pickFirst(att?.ni_category_used, "A") || "A")
      .trim()
      .toUpperCase();

    let paye = 0;
    let employeeNi = 0;
    let employerNi = 0;

    if (gross > 0) {
      if (runFrequency === "monthly") {
        const calcTaxCode = formatTaxCodeForCalc(rawTaxCode, rawTaxBasis, runFrequency);

        try {
          const payResult = calculatePay({
            grossForPeriod: gross,
            taxCode: calcTaxCode,
            period: 1,
            ytdTaxableBeforeThisPeriod: 0,
            ytdTaxPaidBeforeThisPeriod: 0,
            taxYear,
          });

          paye = round2(Number((payResult as any)?.tax ?? 0));
        } catch {
          paye = 0;
        }

        const ni = computeApproxMonthlyNi(gross, niCategory);
        employeeNi = ni.employee;
        employerNi = ni.employer;
      }
    }

    const net = round2(Math.max(0, gross - employeeElementDeductions - paye - employeeNi));

    const patch: any = {
      gross_pay: gross,
      tax: paye,
      ni_employee: employeeNi,
      ni_employer: employerNi,
      other_deductions: employeeElementDeductions,
      net_pay: net,
      calc_mode: "full",
    };

    if (att && typeof att === "object" && "employee_ni" in att) patch.employee_ni = employeeNi;
    if (att && typeof att === "object" && "employer_ni" in att) patch.employer_ni = employerNi;

    const { error: rowErr } = await supabase
      .from("payroll_run_employees")
      .update(patch)
      .eq("id", preId)
      .eq("run_id", runId);

    if (rowErr) {
      return {
        ok: false as const,
        status: 500,
        error: `Failed to update payroll_run_employees row ${preId}: ${rowErr.message}`,
      };
    }

    const payeType = generatedTypeByCode.get("PAYE");
    if (payeType?.id) {
      const up = await upsertGeneratedPayElement(
        supabase,
        preId,
        String(payeType.id),
        paye,
        "PAYE (generated by local full compute fallback)"
      );
      if (!up.ok) {
        return {
          ok: false as const,
          status: 500,
          error: `Failed to upsert PAYE pay element for row ${preId}: ${String(up.error?.message || "unknown error")}`,
        };
      }
    }

    const eeNiType = generatedTypeByCode.get("EE_NI");
    if (eeNiType?.id) {
      const up = await upsertGeneratedPayElement(
        supabase,
        preId,
        String(eeNiType.id),
        employeeNi,
        "Employee NI (generated by local full compute fallback)"
      );
      if (!up.ok) {
        return {
          ok: false as const,
          status: 500,
          error: `Failed to upsert EE_NI pay element for row ${preId}: ${String(up.error?.message || "unknown error")}`,
        };
      }
    }

    const erNiType = generatedTypeByCode.get("ER_NI");
    if (erNiType?.id) {
      const up = await upsertGeneratedPayElement(
        supabase,
        preId,
        String(erNiType.id),
        employerNi,
        "Employer NI (generated by local full compute fallback)"
      );
      if (!up.ok) {
        return {
          ok: false as const,
          status: 500,
          error: `Failed to upsert ER_NI pay element for row ${preId}: ${String(up.error?.message || "unknown error")}`,
        };
      }
    }
  }

  return {
    ok: true as const,
    status: 200,
    method: "local_full_compute_fallback",
    rowsUpdated: attachments.length,
  };
}

export async function GET(req: Request, { params }: Ctx) {
  const resolvedParams = await params;
  const id = String(resolvedParams?.id || "").trim();

  if (!id) return json(400, { ok: false, error: "Missing payroll run id" });
  if (!isUuid(id)) return json(400, { ok: false, error: "Invalid payroll run id" });

  const gate = await requireUser();
  if (!gate.ok) return gate.res;

  const includeDebug = new URL(req.url).searchParams.get("debug") === "1";

  const supabase = gate.supabase;

  const result = await getRunAndEmployees(supabase, id, includeDebug);
  if (!result.ok) {
    return json(result.status || 500, {
      ok: false,
      debugSource: "payroll_run_route_rls_v2",
      error: result.error,
      ...(includeDebug ? { debug: result.debug } : {}),
    });
  }

  const roleRes = await getRoleForCompany(supabase, String((result.run as any).company_id), gate.user.id);
  const role = roleRes.ok ? roleRes.role : "member";

  const allowDebug = includeDebug && ["owner", "admin"].includes(role.toLowerCase());

  return json(200, {
    ok: true,
    debugSource: "payroll_run_route_rls_v2",
    run: result.run,
    employees: result.employees,
    totals: result.totals,
    seededMode: result.seededMode,
    exceptions: result.exceptions,
    attachmentsMeta: result.attachmentsMeta,
    ...(allowDebug ? { debug: result.debug } : {}),
  });
}

export async function PATCH(req: Request, { params }: Ctx) {
  const resolvedParams = await params;
  const id = String(resolvedParams?.id || "").trim();

  if (!id) return json(400, { ok: false, error: "Missing payroll run id" });
  if (!isUuid(id)) return json(400, { ok: false, error: "Invalid payroll run id" });

  const gate = await requireUser();
  if (!gate.ok) return gate.res;

  const supabase = gate.supabase;
  const userId = gate.user.id;

  const body = await req.json().catch(() => ({}));
  const action = normalizeAction(body?.action);

  const runRes = await loadRun(supabase, id);
  if (!runRes.ok) {
    return json(runRes.status, { ok: false, debugSource: "payroll_run_route_rls_v2", error: runRes.error });
  }

  const run = runRes.run;
  const companyId = String(run?.company_id || "").trim();
  if (!companyId || !isUuid(companyId)) {
    return json(500, {
      ok: false,
      debugSource: "payroll_run_route_rls_v2",
      error: "Payroll run is missing a valid company_id.",
    });
  }

  const roleRes = await getRoleForCompany(supabase, companyId, userId);
  if (!roleRes.ok) return roleRes.res;
  const role = roleRes.role;

  if (!isStaffRole(role)) {
    return json(403, {
      ok: false,
      code: "INSUFFICIENT_ROLE",
      message: "You do not have permission to modify payroll runs.",
    });
  }

  const statusNow = String(run?.status || "").trim().toLowerCase();

  const isStartProcessing = ["start_processing", "start-processing", "begin_processing", "begin-processing"].includes(
    action
  );

  const isMarkRtiSubmitted = [
    "mark_rti_submitted",
    "mark-rti-submitted",
    "mark_rti",
    "mark-rti",
    "submit_rti",
    "submit-rti",
    "rti_submitted",
    "rti-submitted",
  ].includes(action);

  const isMarkCompleted = [
    "mark_completed",
    "mark-completed",
    "mark_complete",
    "mark-complete",
    "complete",
    "completed",
  ].includes(action);

  const isCancelRun = [
    "cancel_run",
    "cancel-run",
    "cancel",
    "cancelled",
    "mark_cancelled",
    "mark-cancelled",
  ].includes(action);

  const isSetAttachedAllDue = [
    "set_attached_all_due_employees",
    "set-attached-all-due-employees",
    "set_attached_all_due",
    "set-attached-all-due",
    "confirm_all_due_employees_attached",
    "confirm-all-due-employees-attached",
  ].includes(action);

  const isSetPayDate = [
    "set_pay_date",
    "set-pay-date",
    "set_payment_date",
    "set-payment-date",
    "set_paydate",
    "set-paydate",
  ].includes(action);

  const isComputeFull =
    action === "compute_full" ||
    action === "compute-full" ||
    action === "full_compute" ||
    action === "fullcompute" ||
    action === "compute";

  if (isSetAttachedAllDue) {
    if (statusNow !== "processing") {
      return json(409, {
        ok: false,
        debugSource: "payroll_run_route_rls_v2",
        code: "INVALID_STATUS",
        message: "Attachment confirmation is only allowed while the run is processing.",
        runStatus: statusNow,
      });
    }

    const flag = await fetchRunStatusAndFlag(supabase, id, companyId);
    if (!flag.ok || !flag.run) {
      return json(500, {
        ok: false,
        debugSource: "payroll_run_route_rls_v2",
        message: "Failed to read attachment confirmation flag.",
        debug: { attempts: flag.attempts || [] },
      });
    }

    if (!flag.hasAttachedFlag) {
      return json(409, {
        ok: false,
        debugSource: "payroll_run_route_rls_v2",
        code: "ATTACHED_FLAG_MISSING",
        message: "attached_all_due_employees is not available. Apply database migrations.",
      });
    }

    const nextRaw = pickFirst(body?.value, body?.attached_all_due_employees, body?.attachedAllDueEmployees, null);
    const nextVal = parseBoolStrict(nextRaw);

    if (nextVal === null) {
      return json(400, {
        ok: false,
        debugSource: "payroll_run_route_rls_v2",
        code: "BAD_VALUE",
        message: "Expected boolean value for attached_all_due_employees.",
      });
    }

    const up = await updatePayrollRunSafe(supabase, id, companyId, { attached_all_due_employees: nextVal });
    if (!up.ok) {
      return json(500, {
        ok: false,
        debugSource: "payroll_run_route_rls_v2",
        message: "Failed to update attachment confirmation flag.",
        error: String(up.error?.message || "unknown error"),
      });
    }

    const post = await getRunAndEmployees(supabase, id, false);
    if (!post.ok) {
      return json(post.status || 500, {
        ok: false,
        debugSource: "payroll_run_route_rls_v2",
        error: post.error,
      });
    }

    return json(200, {
      ok: true,
      debugSource: "payroll_run_route_rls_v2",
      action: "set_attached_all_due_employees",
      run: post.run,
      employees: post.employees,
      totals: post.totals,
      seededMode: post.seededMode,
      exceptions: post.exceptions,
    });
  }

  if (isSetPayDate) {
    const runKind = String(pickFirst(run?.run_kind, run?.runKind, "primary") || "primary")
      .trim()
      .toLowerCase();

    if (runKind !== "supplementary") {
      return json(409, {
        ok: false,
        debugSource: "payroll_run_route_rls_v2",
        code: "NOT_SUPPLEMENTARY",
        message: "Pay date override is only allowed for supplementary runs.",
        runKind,
      });
    }

    if (statusNow !== "draft") {
      return json(409, {
        ok: false,
        debugSource: "payroll_run_route_rls_v2",
        code: "INVALID_STATUS",
        message: "Pay date can only be changed while the supplementary run is in Draft.",
        runStatus: statusNow,
      });
    }

    const nextRaw = pickFirst(body?.pay_date, body?.payDate, body?.value, null);
    const nextIso = String(nextRaw ?? "").trim();

    if (!isIsoDateOnly(nextIso)) {
      return json(400, {
        ok: false,
        debugSource: "payroll_run_route_rls_v2",
        code: "BAD_DATE",
        message: "Invalid pay_date. Expected YYYY-MM-DD.",
      });
    }

    const reasonRaw = pickFirst(
      body?.reason,
      body?.pay_date_override_reason,
      body?.payDateOverrideReason,
      body?.override_reason,
      body?.overrideReason,
      null
    );
    const reason = String(reasonRaw ?? "").trim();

    if (!reason) {
      return json(400, {
        ok: false,
        debugSource: "payroll_run_route_rls_v2",
        code: "REASON_REQUIRED",
        message: "Reason is required to change the supplementary pay date.",
      });
    }

    const up = await updatePayrollRunSafe(supabase, id, companyId, {
      pay_date: nextIso,
      pay_date_overridden: true,
      pay_date_override_reason: reason,
    });

    if (!up.ok) {
      return json(500, {
        ok: false,
        debugSource: "payroll_run_route_rls_v2",
        message: "Failed to update pay date.",
        error: String(up.error?.message || "unknown error"),
      });
    }

    const post = await getRunAndEmployees(supabase, id, false);
    if (!post.ok) {
      return json(post.status || 500, { ok: false, debugSource: "payroll_run_route_rls_v2", error: post.error });
    }

    return json(200, {
      ok: true,
      debugSource: "payroll_run_route_rls_v2",
      action: "set_pay_date",
      run: post.run,
      employees: post.employees,
      totals: post.totals,
      seededMode: post.seededMode,
      exceptions: post.exceptions,
    });
  }

  if (isStartProcessing) {
    if (statusNow !== "draft") {
      return json(409, {
        ok: false,
        debugSource: "payroll_run_route_rls_v2",
        error: "Start processing is only allowed for draft runs.",
        runStatus: statusNow,
      });
    }

    const wf = await WorkflowService.changeStatus({
      client: supabase,
      runId: id,
      companyId,
      newStatus: "processing",
      userId,
      comment: "Started processing payroll run",
      automated: false,
    });

    if (!wf.success) {
      const msg = String(wf.error || "Failed to start processing run");
      const isTransition = msg.toLowerCase().includes("cannot change");
      return json(isTransition ? 409 : 500, { ok: false, debugSource: "payroll_run_route_rls_v2", error: msg });
    }

    const flag = await fetchRunStatusAndFlag(supabase, id, companyId);
    if (flag.ok && flag.hasAttachedFlag) {
      await updatePayrollRunSafe(supabase, id, companyId, { attached_all_due_employees: false });
    }

    const post = await getRunAndEmployees(supabase, id, false);
    if (!post.ok) {
      return json(post.status || 500, { ok: false, debugSource: "payroll_run_route_rls_v2", error: post.error });
    }

    return json(200, {
      ok: true,
      debugSource: "payroll_run_route_rls_v2",
      action: "start_processing",
      run: post.run,
      employees: post.employees,
      totals: post.totals,
      seededMode: post.seededMode,
      exceptions: post.exceptions,
    });
  }

  if (isMarkRtiSubmitted) {
    if (!isApproveRole(role)) {
      return json(403, {
        ok: false,
        code: "INSUFFICIENT_ROLE",
        message: "You do not have permission to mark RTI submitted.",
      });
    }

    if (!isConfirmTrue(body?.confirm)) {
      return json(409, {
        ok: false,
        debugSource: "payroll_run_route_rls_v2",
        code: "CONFIRM_REQUIRED",
        message: "Confirmation required to mark RTI submitted.",
        action: "mark_rti_submitted",
        required: true,
      });
    }

    if (statusNow !== "approved") {
      return json(409, {
        ok: false,
        debugSource: "payroll_run_route_rls_v2",
        error: "Mark RTI submitted is only allowed for approved runs.",
        runStatus: statusNow,
      });
    }

    const wf = await WorkflowService.changeStatus({
      client: supabase,
      runId: id,
      companyId,
      newStatus: "rti_submitted",
      userId,
      comment: "Marked RTI submitted",
      automated: false,
    });

    if (!wf.success) {
      const msg = String(wf.error || "Failed to mark RTI submitted");
      const isTransition = msg.toLowerCase().includes("cannot change");
      return json(isTransition ? 409 : 500, { ok: false, debugSource: "payroll_run_route_rls_v2", error: msg });
    }

    const rtiLog = await upsertRtiLogForRun(
      supabase,
      id,
      companyId,
      run,
      "pending",
      "FPS marked RTI submitted from payroll run"
    );

    if (!rtiLog.ok) {
      return json(500, {
        ok: false,
        debugSource: "payroll_run_route_rls_v2",
        error: `Run status changed to RTI submitted, but RTI log update failed: ${String(rtiLog.error?.message || "unknown error")}`,
        action: "mark_rti_submitted",
      });
    }

    const post = await getRunAndEmployees(supabase, id, false);
    if (!post.ok) {
      return json(post.status || 500, { ok: false, debugSource: "payroll_run_route_rls_v2", error: post.error });
    }

    return json(200, {
      ok: true,
      debugSource: "payroll_run_route_rls_v2",
      action: "mark_rti_submitted",
      rtiLog,
      run: post.run,
      employees: post.employees,
      totals: post.totals,
      seededMode: post.seededMode,
      exceptions: post.exceptions,
    });
  }

  if (isMarkCompleted) {
    if (!isApproveRole(role)) {
      return json(403, {
        ok: false,
        code: "INSUFFICIENT_ROLE",
        message: "You do not have permission to mark completed.",
      });
    }

    if (!isConfirmTrue(body?.confirm)) {
      return json(409, {
        ok: false,
        debugSource: "payroll_run_route_rls_v2",
        code: "CONFIRM_REQUIRED",
        message: "Confirmation required to mark completed.",
        action: "mark_completed",
        required: true,
      });
    }

    if (statusNow !== "rti_submitted") {
      return json(409, {
        ok: false,
        debugSource: "payroll_run_route_rls_v2",
        error: "Mark completed is only allowed for RTI submitted runs.",
        runStatus: statusNow,
      });
    }

    const wf = await WorkflowService.changeStatus({
      client: supabase,
      runId: id,
      companyId,
      newStatus: "completed",
      userId,
      comment: "Marked payroll run completed",
      automated: false,
    });

    if (!wf.success) {
      const msg = String(wf.error || "Failed to mark completed");
      const isTransition = msg.toLowerCase().includes("cannot change");
      return json(isTransition ? 409 : 500, { ok: false, debugSource: "payroll_run_route_rls_v2", error: msg });
    }

    const post = await getRunAndEmployees(supabase, id, false);
    if (!post.ok) {
      return json(post.status || 500, { ok: false, debugSource: "payroll_run_route_rls_v2", error: post.error });
    }

    return json(200, {
      ok: true,
      debugSource: "payroll_run_route_rls_v2",
      action: "mark_completed",
      run: post.run,
      employees: post.employees,
      totals: post.totals,
      seededMode: post.seededMode,
      exceptions: post.exceptions,
    });
  }

  if (isCancelRun) {
    if (!isConfirmTrue(body?.confirm)) {
      return json(409, {
        ok: false,
        debugSource: "payroll_run_route_rls_v2",
        code: "CONFIRM_REQUIRED",
        message: "Confirmation required to cancel a payroll run.",
        action: "cancel_run",
        required: true,
      });
    }

    if (!(statusNow === "draft" || statusNow === "processing")) {
      return json(409, {
        ok: false,
        debugSource: "payroll_run_route_rls_v2",
        error: "Cancel is only allowed for draft or processing runs.",
        runStatus: statusNow,
      });
    }

    const wf = await WorkflowService.changeStatus({
      client: supabase,
      runId: id,
      companyId,
      newStatus: "cancelled",
      userId,
      comment: "Cancelled payroll run",
      automated: false,
    });

    if (!wf.success) {
      const msg = String(wf.error || "Failed to cancel run");
      const isTransition = msg.toLowerCase().includes("cannot change");
      return json(isTransition ? 409 : 500, { ok: false, debugSource: "payroll_run_route_rls_v2", error: msg });
    }

    const post = await getRunAndEmployees(supabase, id, false);
    if (!post.ok) {
      return json(post.status || 500, { ok: false, debugSource: "payroll_run_route_rls_v2", error: post.error });
    }

    return json(200, {
      ok: true,
      debugSource: "payroll_run_route_rls_v2",
      action: "cancel_run",
      run: post.run,
      employees: post.employees,
      totals: post.totals,
      seededMode: post.seededMode,
      exceptions: post.exceptions,
    });
  }

  if (action === "recalculate") {
    if (String(run?.status || "").toLowerCase() !== "draft") {
      return json(409, {
        ok: false,
        debugSource: "payroll_run_route_rls_v2",
        error: "Recalculate is only allowed for draft runs.",
      });
    }

    const pre = await fetchRunStatusAndFlag(supabase, id, companyId);
    if (!pre.ok || !pre.run) {
      return json(500, {
        ok: false,
        debugSource: "payroll_run_route_rls_v2",
        error: "Failed to fetch payroll run status before recalculation.",
        debug: { attempts: pre.attempts || [] },
      });
    }

    const rec: any = await setGrossOnlyCalcForRun(supabase, id, companyId);
    if (!rec?.ok) {
      return json(rec?.status || 500, {
        ok: false,
        debugSource: "payroll_run_route_rls_v2",
        error: rec?.error || "Recalculate failed",
        ...(rec?.debug ? { debug: rec.debug } : {}),
      });
    }

    const totalsRefresh: any = await refreshRunTotalsFromAttachments(supabase, id, companyId);
    if (!totalsRefresh?.ok) {
      return json(totalsRefresh?.status || 500, {
        ok: false,
        debugSource: "payroll_run_route_rls_v2",
        error: totalsRefresh?.error || "Totals refresh failed",
      });
    }

    const postFlag = await fetchRunStatusAndFlag(supabase, id, companyId);
    const flagFix = await restoreAttachedAllDueEmployeesIfNeeded(
      supabase,
      id,
      companyId,
      pre.attachedFlag,
      postFlag?.attachedFlag,
      Boolean(pre.hasAttachedFlag)
    );

    const result = await getRunAndEmployees(supabase, id, false);
    if (!result.ok) {
      return json(result.status || 500, { ok: false, debugSource: "payroll_run_route_rls_v2", error: result.error });
    }

    return json(200, {
      ok: true,
      debugSource: "payroll_run_route_rls_v2",
      action: "recalculate",
      totalsRefreshOk: true,
      attachmentsMeta: result.attachmentsMeta,
      sideEffects: pre.hasAttachedFlag
        ? {
            attached_all_due_employees: {
              before: pre.attachedFlag,
              after: postFlag?.attachedFlag,
              restored: Boolean(flagFix?.restored),
            },
          }
        : undefined,
      run: result.run,
      employees: result.employees,
      totals: result.totals,
      seededMode: result.seededMode,
      exceptions: result.exceptions,
    });
  }

  if (isComputeFull) {
    const statusForCompute = String(run?.status || "").toLowerCase();
    if (!(statusForCompute === "draft" || statusForCompute === "processing")) {
      return json(409, {
        ok: false,
        debugSource: "payroll_run_route_rls_v2",
        error: "Full compute is only allowed for draft or processing runs.",
        runStatus: statusForCompute,
      });
    }

    const pre = await getRunAndEmployees(supabase, id, true);
    if (!pre.ok) {
      return json(pre.status || 500, {
        ok: false,
        debugSource: "payroll_run_route_rls_v2",
        error: pre.error,
        debug: pre.debug,
      });
    }

    const blockingCount = Number(pre?.exceptions?.blockingCount ?? 0);
    if (blockingCount > 0) {
      return json(409, {
        ok: false,
        debugSource: "payroll_run_route_rls_v2",
        error: "Full compute blocked. Fix blocking exceptions first.",
        exceptions: pre.exceptions,
      });
    }

    const hasEmployees = Array.isArray(pre?.employees) && pre.employees.length > 0;
    if (!hasEmployees) {
      return json(409, {
        ok: false,
        debugSource: "payroll_run_route_rls_v2",
        error: "Full compute blocked. No attached employees were found for this run.",
      });
    }

    const flagPre = await fetchRunStatusAndFlag(supabase, id, companyId);

    const rpc: any = await tryComputeFullViaRpc(supabase, id);
    if (!rpc?.ok) {
      return json(rpc?.status || 501, {
        ok: false,
        debugSource: "payroll_run_route_rls_v2",
        action: "compute_full",
        error: rpc?.error || "Full compute RPC failed",
        attempts: rpc?.attempts || [],
      });
    }

    const totalsRefresh: any = await refreshRunTotalsFromAttachments(supabase, id, companyId);

    const flagPost = await fetchRunStatusAndFlag(supabase, id, companyId);
    const flagFix = await restoreAttachedAllDueEmployeesIfNeeded(
      supabase,
      id,
      companyId,
      flagPre?.attachedFlag,
      flagPost?.attachedFlag,
      Boolean(flagPre?.hasAttachedFlag)
    );

    let post = await getRunAndEmployees(supabase, id, false);
    if (!post.ok) {
      return json(post.status || 500, { ok: false, debugSource: "payroll_run_route_rls_v2", error: post.error });
    }

    const needsLocalFallback = Boolean(post.seededMode) || resultLooksGrossOnly(post);

    let localFallback: any = null;
    if (needsLocalFallback) {
      localFallback = await localComputeFullFromElements(supabase, id, companyId, run);
      if (!localFallback.ok) {
        return json(localFallback.status || 500, {
          ok: false,
          debugSource: "payroll_run_route_rls_v2",
          action: "compute_full",
          error: localFallback.error || "Local full compute fallback failed",
          computeVia: rpc?.via,
          totalsRefreshOk: Boolean(totalsRefresh?.ok),
          localFallback,
        });
      }

      const totalsRefreshAfterLocal: any = await refreshRunTotalsFromAttachments(supabase, id, companyId);
      if (!totalsRefreshAfterLocal?.ok) {
        return json(totalsRefreshAfterLocal?.status || 500, {
          ok: false,
          debugSource: "payroll_run_route_rls_v2",
          action: "compute_full",
          error: totalsRefreshAfterLocal?.error || "Totals refresh failed after local full compute fallback",
          computeVia: rpc?.via,
          localFallback,
        });
      }

      post = await getRunAndEmployees(supabase, id, false);
      if (!post.ok) {
        return json(post.status || 500, {
          ok: false,
          debugSource: "payroll_run_route_rls_v2",
          action: "compute_full",
          error: post.error,
          computeVia: rpc?.via,
          localFallback,
        });
      }
    }

    if (Boolean(post.seededMode) || resultLooksGrossOnly(post)) {
      return json(409, {
        ok: false,
        debugSource: "payroll_run_route_rls_v2",
        action: "compute_full",
        error:
          "Full compute attempted, but the run still looks gross-only/uncomputed. Ensure your DB compute function or local fallback writes tax, NI, net, and calc_mode='full' back to payroll_run_employees.",
        computeVia: rpc?.via,
        totalsRefreshOk: Boolean(totalsRefresh?.ok),
        seededMode: Boolean(post.seededMode),
        localFallback,
        run: post.run,
        employees: post.employees,
        totals: post.totals,
        exceptions: post.exceptions,
      });
    }

    return json(200, {
      ok: true,
      debugSource: "payroll_run_route_rls_v2",
      action: "compute_full",
      computeVia: rpc?.via,
      totalsRefreshOk: Boolean(totalsRefresh?.ok),
      localFallback,
      attachmentsMeta: post.attachmentsMeta,
      sideEffects: flagPre?.hasAttachedFlag
        ? {
            attached_all_due_employees: {
              before: flagPre?.attachedFlag,
              after: flagPost?.attachedFlag,
              restored: Boolean(flagFix?.restored),
            },
          }
        : undefined,
      run: post.run,
      employees: post.employees,
      totals: post.totals,
      seededMode: post.seededMode,
      exceptions: post.exceptions,
    });
  }

  if (action === "approve") {
    if (!isApproveRole(role)) {
      return json(403, {
        ok: false,
        code: "INSUFFICIENT_ROLE",
        message: "You do not have permission to approve payroll runs.",
      });
    }

    if (statusNow !== "processing") {
      return json(409, {
        ok: false,
        debugSource: "payroll_run_route_rls_v2",
        code: "INVALID_STATUS",
        message: "Approve is only allowed after Start processing (status must be processing).",
        runStatus: statusNow,
      });
    }

    const flag = await fetchRunStatusAndFlag(supabase, id, companyId);
    if (!flag.ok || !flag.run) {
      return json(500, {
        ok: false,
        debugSource: "payroll_run_route_rls_v2",
        message: "Failed to read attached_all_due_employees flag.",
        debug: { attempts: flag.attempts || [] },
      });
    }

    if (!flag.hasAttachedFlag) {
      return json(409, {
        ok: false,
        debugSource: "payroll_run_route_rls_v2",
        code: "ATTACHED_FLAG_MISSING",
        message: "Approve blocked. attached_all_due_employees is not available. Apply database migrations.",
      });
    }

    const attachedParsed = parseBoolStrict(flag.attachedFlag);
    if (attachedParsed !== true) {
      return json(409, {
        ok: false,
        debugSource: "payroll_run_route_rls_v2",
        code: "ATTACHMENTS_NOT_CONFIRMED",
        message: "Approve blocked. Confirm all due employees are attached.",
        attached_all_due_employees: attachedParsed,
      });
    }

    const pre = await getRunAndEmployees(supabase, id, true);
    if (!pre.ok) {
      return json(pre.status || 500, {
        ok: false,
        debugSource: "payroll_run_route_rls_v2",
        error: pre.error,
        debug: pre.debug,
      });
    }

    const seededMode = Boolean(pre?.seededMode) || resultLooksGrossOnly(pre);
    const blockingCount = Number(pre?.exceptions?.blockingCount ?? 0);

    if (seededMode) {
      return json(409, {
        ok: false,
        debugSource: "payroll_run_route_rls_v2",
        error: "Approval blocked. This run is not fully calculated. Run full compute first.",
        seededMode: true,
        exceptions: pre.exceptions,
      });
    }

    if (blockingCount > 0) {
      return json(409, {
        ok: false,
        debugSource: "payroll_run_route_rls_v2",
        error: "Approval blocked. Fix blocking exceptions first.",
        seededMode: false,
        exceptions: pre.exceptions,
      });
    }

    const wf = await WorkflowService.changeStatus({
      client: supabase,
      runId: id,
      companyId,
      newStatus: "approved",
      userId,
      comment: "Approved payroll run",
      automated: false,
    });

    if (!wf.success) {
      const msg = String(wf.error || "Failed to approve run");
      const isTransition = msg.toLowerCase().includes("cannot change");
      return json(isTransition ? 409 : 500, { ok: false, debugSource: "payroll_run_route_rls_v2", error: msg });
    }

    const rtiLog = await upsertRtiLogForRun(
      supabase,
      id,
      companyId,
      run,
      "pending",
      "FPS queued on payroll run approval"
    );

    if (!rtiLog.ok) {
      return json(500, {
        ok: false,
        debugSource: "payroll_run_route_rls_v2",
        error: `Run approved, but RTI log queueing failed: ${String(rtiLog.error?.message || "unknown error")}`,
        action: "approve",
      });
    }

    const post = await getRunAndEmployees(supabase, id, false);
    if (!post.ok) {
      return json(post.status || 500, { ok: false, debugSource: "payroll_run_route_rls_v2", error: post.error });
    }

    return json(200, {
      ok: true,
      debugSource: "payroll_run_route_rls_v2",
      action: "approve",
      rtiLog,
      run: post.run,
      employees: post.employees,
      totals: post.totals,
      seededMode: post.seededMode,
      exceptions: post.exceptions,
    });
  }

  const items = Array.isArray(body?.items) ? body.items : [];
  if (items.length === 0) {
    return json(400, {
      ok: false,
      error:
        "Nothing to update. Expected { items: [...] } or { action: 'approve'|'recalculate'|'compute_full'|'start_processing'|'mark_rti_submitted'|'mark_completed'|'cancel_run'|'set_attached_all_due_employees'|'set_pay_date' }",
    });
  }

  const results: any[] = [];

  for (const it of items) {
    const rowId = String(it?.id || "").trim();
    if (!rowId) continue;

    const gross = Number(toNumberSafe(it?.gross).toFixed(2));
    const deductions = Number(toNumberSafe(it?.deductions).toFixed(2));
    const net = Number(toNumberSafe(it?.net).toFixed(2));

    const r = await updateRunEmployeeRow(supabase, id, rowId, gross, deductions, net);
    results.push({ id: rowId, ok: r.ok, ...(r.ok ? {} : { error: (r as any).error }) });
  }

  const totals: any = await refreshRunTotalsFromAttachments(supabase, id, companyId);
  if (!totals?.ok) {
    return json(totals?.status || 500, {
      ok: false,
      debugSource: "payroll_run_route_rls_v2",
      error: `Updated rows, but failed to refresh totals: ${totals?.error || "unknown error"}`,
      updateResults: results,
    });
  }

  const result = await getRunAndEmployees(supabase, id, false);
  if (!result.ok) {
    return json(result.status || 500, {
      ok: false,
      debugSource: "payroll_run_route_rls_v2",
      error: result.error,
      updateResults: results,
    });
  }

  return json(200, {
    ok: true,
    debugSource: "payroll_run_route_rls_v2",
    run: result.run,
    employees: result.employees,
    totals: result.totals,
    seededMode: result.seededMode,
    exceptions: result.exceptions,
    updateResults: results,
  });
}
