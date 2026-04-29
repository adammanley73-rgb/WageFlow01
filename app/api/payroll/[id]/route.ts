// C:\Projects\wageflow01\app\api\payroll\[id]\route.ts

import { NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase/server";
import { WorkflowService } from "@/lib/services/workflow.service";
import { calculatePay } from "@/lib/payroll/calculatePay";
import { syncAbsencePayToRun } from "@/lib/payroll/syncAbsencePayToRun";
import { getPayrollRunDetail } from "@/lib/payroll/getPayrollRunDetail";

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


function toSortableTime(value: any): number {
  const s = String(value ?? "").trim();
  if (!s) return Number.MAX_SAFE_INTEGER;
  const t = Date.parse(s);
  return Number.isFinite(t) ? t : Number.MAX_SAFE_INTEGER;
}

function getContractSuffixNumber(value: any): number | null {
  const s = String(value ?? "").trim();
  if (!s) return null;
  const m = s.match(/-(\d+)$/);
  if (!m) return null;
  const n = parseInt(m[1], 10);
  return Number.isFinite(n) ? n : null;
}

function sortContractsMainFirst(rows: any[]): any[] {
  return [...rows].sort((a, b) => {
    const aSuffix = getContractSuffixNumber(pickFirst(a?.contract_number, a?.contractNumber, ""));
    const bSuffix = getContractSuffixNumber(pickFirst(b?.contract_number, b?.contractNumber, ""));
    if (aSuffix !== null && bSuffix !== null && aSuffix !== bSuffix) return aSuffix - bSuffix;
    if (aSuffix !== null && bSuffix === null) return -1;
    if (aSuffix === null && bSuffix !== null) return 1;

    const aStart = toSortableTime(pickFirst(a?.start_date, a?.startDate, null));
    const bStart = toSortableTime(pickFirst(b?.start_date, b?.startDate, null));
    if (aStart !== bStart) return aStart - bStart;

    const aCreated = toSortableTime(pickFirst(a?.created_at, a?.createdAt, null));
    const bCreated = toSortableTime(pickFirst(b?.created_at, b?.createdAt, null));
    if (aCreated !== bCreated) return aCreated - bCreated;

    return String(pickFirst(a?.contract_number, a?.contractNumber, "") || "").localeCompare(
      String(pickFirst(b?.contract_number, b?.contractNumber, "") || "")
    );
  });
}

function buildPrimaryContractIdByEmployee(contractRows: any[]): Map<string, string> {
  const byEmployee = new Map<string, any[]>();

  for (const row of contractRows || []) {
    const employeeId = String(pickFirst(row?.employee_id, row?.employeeId, "") || "").trim();
    const contractId = String(pickFirst(row?.id, row?.contract_id, row?.contractId, "") || "").trim();
    if (!employeeId || !contractId) continue;
    const list = byEmployee.get(employeeId) || [];
    list.push(row);
    byEmployee.set(employeeId, list);
  }

  const result = new Map<string, string>();
  for (const [employeeId, rows] of byEmployee.entries()) {
    const sorted = sortContractsMainFirst(rows);
    const primaryId = String(pickFirst(sorted[0]?.id, sorted[0]?.contract_id, sorted[0]?.contractId, "") || "").trim();
    if (primaryId) result.set(employeeId, primaryId);
  }

  return result;
}

// Returns the ISO date (YYYY-MM-DD) of the Friday that follows isoDate.
// For a MonÃ¢â‚¬â€œSun weekly run period_end is always a Sunday, so the result is
// always the Friday five days later (e.g. Sun 06-Apr Ã¢â€ â€™ Fri 11-Apr).
// If isoDate itself is a Friday, returns the NEXT Friday (7 days later), so
// there is no ambiguity between "same day" and "following" interpretations.
function getNextFriday(isoDate: string): string {
  const d = new Date(isoDate + "T00:00:00Z");
  const day = d.getUTCDay(); // 0=Sun Ã¢â‚¬Â¦ 5=Fri Ã¢â‚¬Â¦ 6=Sat
  const daysUntilFriday = day === 5 ? 7 : (5 - day + 7) % 7;
  d.setUTCDate(d.getUTCDate() + daysUntilFriday);
  return d.toISOString().slice(0, 10);
}

// Returns the effective pay date for a run.
// Priority:
//   1. Stored pay_date (covers manual overrides and supplementary runs).
//   2. For weekly runs: the Friday following period_end (MonÃ¢â‚¬â€œSun Ã¢â€ â€™ next Fri).
//   3. null (caller decides what to do).
function deriveRunPayDate(run: any): string | null {
  const frequency = String(
    pickFirst(run?.frequency, run?.pay_frequency, run?.payFrequency, "") || ""
  )
    .trim()
    .toLowerCase();

  const isWeekly =
    frequency === "weekly" ||
    frequency === "week" ||
    frequency === "1_week";

  if (isWeekly) {
    // A user-explicit override (written by set_pay_date) always wins.
    const overridden = parseBoolStrict(
      pickFirst(run?.pay_date_overridden, run?.payDateOverridden, null)
    );
    if (overridden === true) {
      const stored = String(pickFirst(run?.pay_date, run?.payDate, "") || "").trim();
      if (isIsoDateOnly(stored)) return stored;
    }

    // Always derive from period_end for weekly runs.
    // The DB often stores the Friday WITHIN the week; we need the one AFTER.
    const periodEnd = String(
      pickFirst(run?.period_end, run?.pay_period_end, run?.end_date, "") || ""
    ).trim();
    if (isIsoDateOnly(periodEnd)) return getNextFriday(periodEnd);
  }

  // Non-weekly: honour the stored value as-is.
  const stored = String(pickFirst(run?.pay_date, run?.payDate, "") || "").trim();
  if (isIsoDateOnly(stored)) return stored;

  return null;
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


function getAttachmentContractId(att: any): string {
  const meta = getObjectSafe(att?.metadata);
  return String(
    pickFirst(
      att?.contract_id,
      att?.contractId,
      meta?.contract_id,
      meta?.contractId,
      ""
    ) || ""
  ).trim();
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

type LocalNormalisedPayElement = {
  payrollRunEmployeeId: string;
  payElementTypeId: string;
  code: string;
  side: "earning" | "deduction";
  amount: number;
  effectiveTaxableForPaye: boolean;
  effectivePensionable: boolean;
  effectiveAeQualifying: boolean;
  effectiveSalarySacrifice: boolean;
};

type EmployeePensionSettings = {
  enabled: boolean;
  basis: "qualifying_earnings" | "pensionable_pay" | "basic_pay";
  method: "net_pay" | "relief_at_source" | "salary_sacrifice";
  employeePercent: number;
  employerPercent: number;
};

type MonthlyPayeAndNiResult = {
  paye: number;
  employeeNi: number;
  employerNi: number;
};

type PensionOverlayResult = {
  pensionBasisAmount: number;
  qualifyingEarnings: number;
  pensionEmployee: number;
  pensionEmployer: number;
  grossForTax: number;
  grossForEmployeeNi: number;
  grossForEmployerNi: number;
  paye: number;
  employeeNi: number;
  employerNi: number;
  employeePensionCode: "EE_PEN" | "EE_PEN_RAS" | "EE_PEN_SAL_SAC";
};

function resolveBooleanOverride(overrideValue: any, defaultValue: any): boolean {
  const override = parseBoolStrict(overrideValue);
  if (override !== null) return override;

  const fallback = parseBoolStrict(defaultValue);
  return fallback === true;
}

function normalizePercentMaybe(value: any): number {
  const n = toNumberSafe(value);
  if (!Number.isFinite(n) || n <= 0) return 0;
  if (n > 0 && n < 1) return round2(n * 100);
  return round2(n);
}

function normalizePensionBasisValue(
  value: any
): "qualifying_earnings" | "pensionable_pay" | "basic_pay" {
  const s = String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/-/g, "_");

  if (
    s === "qualifying_earnings" ||
    s === "qualifying" ||
    s === "qe" ||
    s === "ae_qualifying" ||
    s === "auto_enrolment_qualifying"
  ) {
    return "qualifying_earnings";
  }

  if (
    s === "pensionable_pay" ||
    s === "pensionable" ||
    s === "pensionable_earnings" ||
    s === "pensionable_pay_basis"
  ) {
    return "pensionable_pay";
  }

  if (s === "basic_pay" || s === "basic" || s === "basic_only") {
    return "basic_pay";
  }

  return "qualifying_earnings";
}

function normalizePensionMethodValue(
  value: any
): "net_pay" | "relief_at_source" | "salary_sacrifice" {
  const s = String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/-/g, "_");

  if (
    s === "relief_at_source" ||
    s === "ras" ||
    s === "reliefatsource" ||
    s === "relief_at_source_method"
  ) {
    return "relief_at_source";
  }

  if (
    s === "salary_sacrifice" ||
    s === "salarysacrifice" ||
    s === "sal_sac" ||
    s === "sacrifice"
  ) {
    return "salary_sacrifice";
  }

  return "net_pay";
}

function pickPensionBasisAmount(
  basis: "qualifying_earnings" | "pensionable_pay" | "basic_pay",
  basicPay: number,
  pensionablePay: number,
  qualifyingPay: number
): number {
  const basic = round2(Math.max(0, basicPay || 0));
  const pensionable = round2(Math.max(0, pensionablePay || 0));
  const qualifying = round2(Math.max(0, qualifyingPay || 0));

  if (basis === "qualifying_earnings") {
    return qualifying;
  }

  if (basis === "basic_pay") {
    if (basic > 0) return basic;
    if (pensionable > 0) return pensionable;
    return qualifying;
  }

  if (basis === "pensionable_pay") {
    if (pensionable > 0) return pensionable;
    if (basic > 0) return basic;
    return qualifying;
  }

  return qualifying;
}

function readPensionSettingsFromSource(source: any): EmployeePensionSettings {
  const explicitEnabled = parseBoolStrict(
    pickFirst(
      source?.pension_enabled,
      source?.pensionEnabled,
      source?.pension_enrolled,
      source?.pensionEnrolled,
      source?.pension_active,
      source?.pensionActive,
      source?.auto_enrolment_enabled,
      source?.autoEnrolmentEnabled,
      source?.auto_enrolment_active,
      source?.autoEnrolmentActive,
      source?.ae_enabled,
      source?.aeEnabled,
      source?.ae_enrolled,
      source?.aeEnrolled,
      source?.ae_active,
      source?.aeActive,
      null
    )
  );

  const employeePercent = normalizePercentMaybe(
    pickFirst(
      source?.pension_employee_percent,
      source?.pensionEmployeePercent,
      source?.employee_pension_percent,
      source?.employeePensionPercent,
      source?.pension_employee_rate,
      source?.pensionEmployeeRate,
      source?.employee_pension_rate,
      source?.employeePensionRate,
      source?.employee_contribution_percent,
      source?.employeeContributionPercent,
      source?.employee_contribution_rate,
      source?.employeeContributionRate,
      source?.pension_percent_employee,
      source?.pensionPercentEmployee,
      source?.pension_pct_employee,
      source?.pensionPctEmployee,
      0
    )
  );

  const employerPercent = normalizePercentMaybe(
    pickFirst(
      source?.pension_employer_percent,
      source?.pensionEmployerPercent,
      source?.employer_pension_percent,
      source?.employerPensionPercent,
      source?.pension_employer_rate,
      source?.pensionEmployerRate,
      source?.employer_pension_rate,
      source?.employerPensionRate,
      source?.employer_contribution_percent,
      source?.employerContributionPercent,
      source?.employer_contribution_rate,
      source?.employerContributionRate,
      source?.pension_percent_employer,
      source?.pensionPercentEmployer,
      source?.pension_pct_employer,
      source?.pensionPctEmployer,
      0
    )
  );

  const enabled = explicitEnabled !== null ? explicitEnabled : employeePercent > 0 || employerPercent > 0;

  const basis = normalizePensionBasisValue(
    pickFirst(
      source?.pension_basis,
      source?.pensionBasis,
      source?.pension_basis_type,
      source?.pensionBasisType,
      source?.pensionable_basis,
      source?.pensionableBasis,
      source?.pension_earnings_basis,
      source?.pensionEarningsBasis,
      source?.ae_basis,
      source?.aeBasis,
      source?.auto_enrolment_basis,
      source?.autoEnrolmentBasis,
      "qualifying_earnings"
    )
  );

  const method = normalizePensionMethodValue(
    pickFirst(
      source?.pension_method,
      source?.pensionMethod,
      source?.pension_contribution_method,
      source?.pensionContributionMethod,
      source?.pension_tax_treatment,
      source?.pensionTaxTreatment,
      source?.ae_method,
      source?.aeMethod,
      source?.auto_enrolment_method,
      source?.autoEnrolmentMethod,
      "net_pay"
    )
  );

  return {
    enabled,
    basis,
    method,
    employeePercent,
    employerPercent,
  };
}

function readEmployeePensionSettings(emp: any): EmployeePensionSettings {
  return readPensionSettingsFromSource(emp);
}

function hasMeaningfulPensionSettings(source: any): boolean {
  if (!source) return false;

  const explicitEnabled = parseBoolStrict(
    pickFirst(
      source?.pension_enabled,
      source?.pensionEnabled,
      source?.pension_enrolled,
      source?.pensionEnrolled,
      source?.pension_active,
      source?.pensionActive,
      source?.auto_enrolment_enabled,
      source?.autoEnrolmentEnabled,
      source?.auto_enrolment_active,
      source?.autoEnrolmentActive,
      source?.ae_enabled,
      source?.aeEnabled,
      source?.ae_enrolled,
      source?.aeEnrolled,
      source?.ae_active,
      source?.aeActive,
      null
    )
  );

  if (explicitEnabled === true) return true;

  const status = String(pickFirst(source?.pension_status, source?.pensionStatus, "") || "")
    .trim()
    .toLowerCase();
  if (status && status !== "not_assessed" && status !== "not_eligible") return true;

  if (
    normalizePercentMaybe(
      pickFirst(
        source?.pension_employee_percent,
        source?.pensionEmployeePercent,
        source?.employee_pension_percent,
        source?.employeePensionPercent,
        source?.pension_employee_rate,
        source?.pensionEmployeeRate,
        source?.employee_pension_rate,
        source?.employeePensionRate,
        source?.employee_contribution_percent,
        source?.employeeContributionPercent,
        source?.employee_contribution_rate,
        source?.employeeContributionRate,
        source?.pension_percent_employee,
        source?.pensionPercentEmployee,
        source?.pension_pct_employee,
        source?.pensionPctEmployee,
        0
      )
    ) > 0
  ) {
    return true;
  }

  if (
    normalizePercentMaybe(
      pickFirst(
        source?.pension_employer_percent,
        source?.pensionEmployerPercent,
        source?.employer_pension_percent,
        source?.employerPensionPercent,
        source?.pension_employer_rate,
        source?.pensionEmployerRate,
        source?.employer_pension_rate,
        source?.employerPensionRate,
        source?.employer_contribution_percent,
        source?.employerContributionPercent,
        source?.employer_contribution_rate,
        source?.employerContributionRate,
        source?.pension_percent_employer,
        source?.pensionPercentEmployer,
        source?.pension_pct_employer,
        source?.pensionPctEmployer,
        0
      )
    ) > 0
  ) {
    return true;
  }

  const hasText = Boolean(
    pickFirst(
      source?.pension_scheme_name,
      source?.pensionSchemeName,
      source?.pension_reference,
      source?.pensionReference,
      source?.pension_contribution_method,
      source?.pensionContributionMethod,
      source?.pension_earnings_basis,
      source?.pensionEarningsBasis,
      source?.pension_basis,
      source?.pensionBasis,
      source?.pension_basis_type,
      source?.pensionBasisType,
      source?.pension_worker_category,
      source?.pensionWorkerCategory,
      source?.pension_enrolment_date,
      source?.pensionEnrolmentDate,
      source?.pension_opt_in_date,
      source?.pensionOptInDate,
      source?.pension_opt_out_date,
      source?.pensionOptOutDate,
      source?.pension_postponement_date,
      source?.pensionPostponementDate,
      null
    )
  );

  return hasText;
}

function resolvePensionSettingsForRow(args: {
  contract: any;
  emp: any;
  isPrimaryContract: boolean;
}): { settings: EmployeePensionSettings; source: "contract" | "employee" | "none" } {
  const hasContract = Boolean(args.contract);
  const contractMeaningful = hasMeaningfulPensionSettings(args.contract);
  const employeeMeaningful = hasMeaningfulPensionSettings(args.emp);

  if (hasContract && contractMeaningful) {
    return { settings: readPensionSettingsFromSource(args.contract), source: "contract" };
  }

  if (hasContract && args.isPrimaryContract && employeeMeaningful) {
    return { settings: readPensionSettingsFromSource(args.emp), source: "employee" };
  }

  if (!hasContract && employeeMeaningful) {
    return { settings: readPensionSettingsFromSource(args.emp), source: "employee" };
  }

  if (hasContract) {
    return { settings: readPensionSettingsFromSource(args.contract), source: "none" };
  }

  return { settings: readPensionSettingsFromSource(args.emp), source: "none" };
}

function getAeQualifyingEarningsBounds(payFrequency: any): { lower: number; upper: number } {
  const s = String(payFrequency ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/-/g, "_");

  if (s === "weekly" || s === "week" || s === "1_week") {
    return { lower: 120, upper: 967 };
  }

  if (s === "fortnightly" || s === "fortnight" || s === "2_weeks") {
    return { lower: 240, upper: 1934 };
  }

  if (s === "4_weekly" || s === "four_weekly" || s === "4_weeks" || s === "four_weeks") {
    return { lower: 480, upper: 3867 };
  }

  if (s === "quarterly" || s === "quarter" || s === "1_quarter") {
    return { lower: 1560, upper: 12568 };
  }

  if (s === "biannual" || s === "bi_annual" || s === "semiannual" || s === "semi_annual") {
    return { lower: 3120, upper: 25135 };
  }

  if (s === "annual" || s === "yearly" || s === "year") {
    return { lower: 6240, upper: 50270 };
  }

  return { lower: 520, upper: 4189 };
}

function computeQualifyingEarnings(qualifyingSourcePay: number, payFrequency: any): number {
  const source = round2(Math.max(0, qualifyingSourcePay || 0));
  if (source <= 0) return 0;

  const { lower, upper } = getAeQualifyingEarningsBounds(payFrequency);
  return round2(Math.max(Math.min(source, upper) - lower, 0));
}

function normaliseLocalPayElement(row: any, type: any): LocalNormalisedPayElement {
  const payrollRunEmployeeId = String(pickFirst(row?.payroll_run_employee_id, row?.payrollRunEmployeeId, "") || "").trim();
  const payElementTypeId = String(pickFirst(row?.pay_element_type_id, row?.payElementTypeId, "") || "").trim();
  const code = String(pickFirst(type?.code, row?.code, "") || "").trim().toUpperCase();
  const side = normalisePayElementSide(pickFirst(type?.side, row?.side, null));
  const amount = round2(toNumberSafe(pickFirst(row?.amount, 0)));

  const effectiveTaxableForPaye = resolveBooleanOverride(
    pickFirst(
      row?.taxable_for_paye_override,
      row?.taxableForPayeOverride,
      row?.taxable_for_paye,
      row?.taxableForPaye,
      row?.is_taxable_for_paye,
      row?.isTaxableForPaye,
      row?.taxable,
      null
    ),
    pickFirst(
      type?.taxable_for_paye,
      type?.taxableForPaye,
      type?.is_taxable_for_paye_default,
      type?.isTaxableForPayeDefault,
      type?.taxable,
      null
    )
  );

  const effectivePensionable = resolveBooleanOverride(
    pickFirst(
      row?.pensionable_override,
      row?.pensionableOverride,
      row?.pensionable,
      row?.is_pensionable,
      row?.isPensionable,
      null
    ),
    pickFirst(
      type?.pensionable_default,
      type?.pensionableDefault,
      type?.is_pensionable_default,
      type?.isPensionableDefault,
      type?.pensionable,
      type?.is_pensionable,
      null
    )
  );

  const effectiveAeQualifying = resolveBooleanOverride(
    pickFirst(
      row?.ae_qualifying_override,
      row?.aeQualifyingOverride,
      row?.ae_qualifying,
      row?.aeQualifying,
      row?.is_ae_qualifying,
      row?.isAeQualifying,
      null
    ),
    pickFirst(
      type?.ae_qualifying_default,
      type?.aeQualifyingDefault,
      type?.is_ae_qualifying_default,
      type?.isAeQualifyingDefault,
      type?.ae_qualifying,
      type?.aeQualifying,
      null
    )
  );

  const effectiveSalarySacrifice = resolveBooleanOverride(
    pickFirst(
      row?.salary_sacrifice_override,
      row?.salarySacrificeOverride,
      row?.salary_sacrifice,
      row?.salarySacrifice,
      row?.is_salary_sacrifice,
      row?.isSalarySacrifice,
      null
    ),
    pickFirst(
      type?.is_salary_sacrifice_type,
      type?.isSalarySacrificeType,
      type?.salary_sacrifice_default,
      type?.salarySacrificeDefault,
      type?.is_salary_sacrifice_default,
      type?.isSalarySacrificeDefault,
      null
    )
  );

  return {
    payrollRunEmployeeId,
    payElementTypeId,
    code,
    side,
    amount,
    effectiveTaxableForPaye,
    effectivePensionable,
    effectiveAeQualifying,
    effectiveSalarySacrifice,
  };
}

function isSspCode(value: any): boolean {
  return String(value ?? "").trim().toUpperCase() === "SSP";
}

function isSicknessBasicReductionCode(value: any): boolean {
  return String(value ?? "").trim().toUpperCase() === "SICK_BASIC_REDUCTION";
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

type NiThresholds = {
  PT: number;
  UEL: number;
  ST: number;
  employeeMain: number;
  employeeUpper: number;
  employerRate: number;
};

function getNiThresholds(taxYear?: number): NiThresholds {
  // taxYear is the calendar year in which the tax year starts.
  // e.g. 2025 = 2025/26, 2024 = 2024/25.
  // All figures are monthly.
  if (!taxYear || taxYear >= 2025) {
    // 2025/26: employer rate raised to 15%, ST dropped to Ã‚Â£5,000/yr (Ã‚Â£417/month),
    // employee rate 8%/2% (unchanged from 2024/25).
    return { PT: 1048, UEL: 4189, ST: 417, employeeMain: 0.08, employeeUpper: 0.02, employerRate: 0.15 };
  }
  if (taxYear === 2024) {
    // 2024/25: employer rate 13.8%, ST Ã‚Â£9,100/yr (Ã‚Â£758/month), employee 8%/2%
    // (reduced from 10% in Jan 2024; 8% from Apr 2024).
    return { PT: 1048, UEL: 4189, ST: 758, employeeMain: 0.08, employeeUpper: 0.02, employerRate: 0.138 };
  }
  if (taxYear === 2023) {
    // 2023/24: employer rate 13.8%, ST Ã‚Â£9,100/yr (Ã‚Â£758/month).
    // Employee rate was 12% until Jan 2024 then 10%; approximate with 10%.
    return { PT: 1048, UEL: 4189, ST: 758, employeeMain: 0.10, employeeUpper: 0.02, employerRate: 0.138 };
  }
  if (taxYear === 2022) {
    // 2022/23: employer rate 13.8%, ST Ã‚Â£9,100/yr (Ã‚Â£758/month), employee 13.25%/3.25%
    // (temporary 1.25pp health and social care levy in force AprÃ¢â‚¬â€œNov 2022).
    return { PT: 1048, UEL: 4189, ST: 758, employeeMain: 0.1325, employeeUpper: 0.0325, employerRate: 0.1485 };
  }
  // Fallback to latest known rates.
  return { PT: 1048, UEL: 4189, ST: 417, employeeMain: 0.08, employeeUpper: 0.02, employerRate: 0.15 };
}

function computeApproxMonthlyNi(gross: number, niCategory: any, taxYear?: number) {
  const pay = Math.max(0, Number(gross || 0));
  const cat = String(niCategory ?? "A").trim().toUpperCase();

  const { PT, UEL, ST, employeeMain, employeeUpper, employerRate } = getNiThresholds(taxYear);

  let employee = 0;
  let employer = 0;

  if (pay > 0) {
    if (cat !== "C") {
      const employeeMainBand = Math.max(Math.min(pay, UEL) - PT, 0);
      const employeeUpperBand = Math.max(pay - UEL, 0);
      employee = employeeMainBand * employeeMain + employeeUpperBand * employeeUpper;
    }

    employer = Math.max(pay - ST, 0) * employerRate;
  }

  return {
    employee: round2(employee),
    employer: round2(employer),
  };
}

function computeMonthlyPayeAndNiFromGross(args: {
  grossForTax: number;
  grossForEmployeeNi: number;
  grossForEmployerNi: number;
  taxCode: any;
  taxBasis: any;
  payFrequency: any;
  taxYear?: number;
  niCategory: any;
}): MonthlyPayeAndNiResult {
  const payFrequency = String(args.payFrequency ?? "").trim().toLowerCase();
  if (payFrequency !== "monthly") {
    return {
      paye: 0,
      employeeNi: 0,
      employerNi: 0,
    };
  }

  const grossForTax = round2(Math.max(0, args.grossForTax || 0));
  const grossForEmployeeNi = round2(Math.max(0, args.grossForEmployeeNi || 0));
  const grossForEmployerNi = round2(Math.max(0, args.grossForEmployerNi || 0));

  let paye = 0;
  try {
    const payResult = calculatePay({
      grossForPeriod: grossForTax,
      taxCode: formatTaxCodeForCalc(args.taxCode, args.taxBasis, payFrequency),
      period: 1,
      ytdTaxableBeforeThisPeriod: 0,
      ytdTaxPaidBeforeThisPeriod: 0,
      taxYear: args.taxYear,
    });

    paye = round2(Number((payResult as any)?.tax ?? 0));
  } catch {
    paye = 0;
  }

  const employeeNi = computeApproxMonthlyNi(grossForEmployeeNi, args.niCategory, args.taxYear).employee;
  const employerNi = computeApproxMonthlyNi(grossForEmployerNi, args.niCategory, args.taxYear).employer;

  return {
    paye: round2(paye),
    employeeNi: round2(employeeNi),
    employerNi: round2(employerNi),
  };
}

function overlayPensionFromEmployeeSettings(args: {
  gross: number;
  basicPay: number;
  pensionablePay: number;
  aeQualifyingSourcePay: number;
  payFrequency: any;
  taxYear?: number;
  taxCode: any;
  taxBasis: any;
  niCategory: any;
  settings: EmployeePensionSettings;
}): PensionOverlayResult {
  const gross = round2(Math.max(0, args.gross || 0));
  const basicPay = round2(Math.max(0, args.basicPay || 0));
  const pensionablePay = round2(Math.max(0, args.pensionablePay || 0));
  const aeQualifyingSourcePay = round2(Math.max(0, args.aeQualifyingSourcePay || 0));
  const settings = args.settings;

  const qualifyingEarnings = computeQualifyingEarnings(
    aeQualifyingSourcePay > 0 ? aeQualifyingSourcePay : gross,
    args.payFrequency
  );

  const pensionBasisAmount = settings.enabled
    ? pickPensionBasisAmount(settings.basis, basicPay, pensionablePay, qualifyingEarnings)
    : 0;

  const pensionEmployee = settings.enabled
    ? round2((pensionBasisAmount * settings.employeePercent) / 100)
    : 0;

  const pensionEmployer = settings.enabled
    ? round2((pensionBasisAmount * settings.employerPercent) / 100)
    : 0;

  let grossForTax = gross;
  let grossForEmployeeNi = gross;
  let grossForEmployerNi = gross;
  let employeePensionCode: "EE_PEN" | "EE_PEN_RAS" | "EE_PEN_SAL_SAC" = "EE_PEN";

  if (settings.enabled) {
    if (settings.method === "net_pay") {
      employeePensionCode = "EE_PEN";
      grossForTax = round2(Math.max(0, gross - pensionEmployee));
    } else if (settings.method === "relief_at_source") {
      employeePensionCode = "EE_PEN_RAS";
    } else if (settings.method === "salary_sacrifice") {
      employeePensionCode = "EE_PEN_SAL_SAC";
      grossForTax = round2(Math.max(0, gross - pensionEmployee));
      grossForEmployeeNi = round2(Math.max(0, gross - pensionEmployee));
      grossForEmployerNi = round2(Math.max(0, gross - pensionEmployee));
    }
  }

  const computed = computeMonthlyPayeAndNiFromGross({
    grossForTax,
    grossForEmployeeNi,
    grossForEmployerNi,
    taxCode: args.taxCode,
    taxBasis: args.taxBasis,
    payFrequency: args.payFrequency,
    taxYear: args.taxYear,
    niCategory: args.niCategory,
  });

  return {
    pensionBasisAmount: round2(pensionBasisAmount),
    qualifyingEarnings: round2(qualifyingEarnings),
    pensionEmployee: round2(pensionEmployee),
    pensionEmployer: round2(pensionEmployer),
    grossForTax: round2(grossForTax),
    grossForEmployeeNi: round2(grossForEmployeeNi),
    grossForEmployerNi: round2(grossForEmployerNi),
    paye: round2(computed.paye),
    employeeNi: round2(computed.employeeNi),
    employerNi: round2(computed.employerNi),
    employeePensionCode,
  };
}

function resultLooksGrossOnly(result: any): boolean {
  const totals = result?.totals ?? {};
  const employees = Array.isArray(result?.employees) ? result.employees : [];

  if (employees.length === 0) return true;

  // A row that was written by a full compute is never gross-only, even when
  // PAYE and NI are legitimately zero (e.g. weekly low-earner below thresholds).
  const anyFullCalcMode = employees.some(
    (row: any) => String(row?.calc_mode ?? "").toLowerCase() === "full"
  );
  if (anyFullCalcMode) return false;

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

function buildEmployeeRow(att: any, emp: any, contract: any, run: any, isPrimaryContract: boolean) {
  const meta = getObjectSafe(att?.metadata);

  const employeeId = String(pickFirst(att?.employee_id, att?.employeeId, "") || "");
  const contractId = getAttachmentContractId(att);

  const employeeName = String(
    pickFirst(
      emp?.full_name,
      emp?.fullName,
      emp?.name,
      [emp?.first_name, emp?.last_name].filter(Boolean).join(" ").trim(),
      [emp?.firstName, emp?.lastName].filter(Boolean).join(" ").trim(),
      "-"
    ) || "-"
  );

  const employeeNumber = String(
    pickFirst(
      emp?.employee_number,
      emp?.employeeNumber,
      emp?.payroll_number,
      emp?.payrollNumber,
      emp?.payroll_no,
      emp?.payrollNo,
      "-"
    ) || "-"
  );

  const email = String(pickFirst(emp?.email, emp?.work_email, emp?.workEmail, "-") || "-");

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
    pickFirst(
      run?.frequency,
      run?.pay_frequency,
      run?.payFrequency,
      att?.pay_frequency_used,
      contract?.pay_frequency,
      contract?.payFrequency,
      ""
    ) || ""
  )
    .trim()
    .toLowerCase();

  const resolvedPension = resolvePensionSettingsForRow({
    contract,
    emp,
    isPrimaryContract,
  });
  const pensionSettings = resolvedPension.settings;
  const taxReductionFromPension =
    pensionSettings.method === "salary_sacrifice" || pensionSettings.method === "net_pay"
      ? pensionEmployee
      : 0;
  const niReductionFromPension =
    pensionSettings.method === "salary_sacrifice"
      ? pensionEmployee
      : 0;

  const grossForTaxFallback = round2(Math.max(0, gross - taxReductionFromPension));
  const grossForNiFallback = round2(Math.max(0, gross - niReductionFromPension));

  if (tax <= 0 && gross > 0 && runFrequency === "monthly" && taxCodeUsed) {
    try {
      const periodStartSrc = String(pickFirst(run?.period_start, run?.pay_period_start, run?.start_date, "") || "");
      const taxYear = parseInt(periodStartSrc.slice(0, 4), 10);

      const payResult = calculatePay({
        grossForPeriod: grossForTaxFallback,
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

  if (gross > 0 && runFrequency === "monthly" && niCategoryUsed && (employeeNi <= 0 || employerNi <= 0)) {
    try {
      const periodStartSrc = String(pickFirst(run?.period_start, run?.pay_period_start, run?.start_date, "") || "");
      const taxYearForNi = parseInt(periodStartSrc.slice(0, 4), 10);
      const niTaxYear = Number.isFinite(taxYearForNi) ? taxYearForNi : undefined;
      const ni = computeApproxMonthlyNi(grossForNiFallback, niCategoryUsed, niTaxYear);
      const cat = String(niCategoryUsed || "").trim().toUpperCase();

      if ((employeeNi <= 0 && ni.employee > 0) || cat === "C") {
        employeeNi = ni.employee;
      }

      if (employerNi <= 0 && ni.employer >= 0) {
        employerNi = ni.employer;
      }

      usedNiFallback = true;
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
    contract_id: contractId || pickFirst(att?.contract_id, att?.contractId, contract?.id, null),
    contractId: contractId || pickFirst(att?.contract_id, att?.contractId, contract?.id, null),
    contract_number: pickFirst(att?.contract_number, att?.contractNumber, contract?.contract_number, contract?.contractNumber, null),
    contractNumber: pickFirst(att?.contract_number, att?.contractNumber, contract?.contract_number, contract?.contractNumber, null),
    contract_job_title: pickFirst(att?.contract_job_title, att?.contractJobTitle, contract?.job_title, contract?.jobTitle, null),
    contractJobTitle: pickFirst(att?.contract_job_title, att?.contractJobTitle, contract?.job_title, contract?.jobTitle, null),
    contract_status: pickFirst(att?.contract_status, att?.contractStatus, contract?.status, null),
    contractStatus: pickFirst(att?.contract_status, att?.contractStatus, contract?.status, null),
    contract_start_date: pickFirst(att?.contract_start_date, att?.contractStartDate, contract?.start_date, contract?.startDate, null),
    contractStartDate: pickFirst(att?.contract_start_date, att?.contractStartDate, contract?.start_date, contract?.startDate, null),
    contract_leave_date: pickFirst(att?.contract_leave_date, att?.contractLeaveDate, contract?.leave_date, contract?.leaveDate, null),
    contractLeaveDate: pickFirst(att?.contract_leave_date, att?.contractLeaveDate, contract?.leave_date, contract?.leaveDate, null),
    contract_pay_after_leaving: pickFirst(att?.contract_pay_after_leaving, att?.contractPayAfterLeaving, contract?.pay_after_leaving, contract?.payAfterLeaving, null),
    contractPayAfterLeaving: pickFirst(att?.contract_pay_after_leaving, att?.contractPayAfterLeaving, contract?.pay_after_leaving, contract?.payAfterLeaving, null),
    pension_settings_source: resolvedPension.source,

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

  const hasCalcMode = attachments.some((r: any) => r && typeof r === "object" && "calc_mode" in r);
  if (hasCalcMode) {
    const anyNotFull = attachments.some(
      (r: any) => String(pickFirst(r?.calc_mode, "uncomputed")) !== "full"
    );
    // All rows explicitly written as "full" Ã¢â€ â€™ computation is complete.
    // Do NOT fall through to the zero-tax heuristic; a legitimately zero-tax
    // weekly low-earner run would be falsely flagged as seeded otherwise.
    if (!anyNotFull) return false;
    return true;
  }

  // No calc_mode column present yet Ã¢â‚¬â€ fall back to heuristic.
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
        "-"
      ) || "-"
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
  const payDate = deriveRunPayDate(run) ?? "";

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
  const result = await getPayrollRunDetail(supabase, runId, includeDebug);

  if (!result.ok) {
    return {
      ok: false as const,
      status: result.status,
      error: result.error,
      debug: includeDebug ? result.debug : undefined,
    };
  }

  return {
    ok: true as const,
    run: result.run,
    employees: result.employees,
    totals: result.totals,
    seededMode: result.seededMode,
    exceptions: result.exceptions,
    attachmentsMeta: result.attachmentsMeta,
    debug: includeDebug ? result.debug : undefined,
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
    const studentLoan = toNumberSafe(pickFirst(r?.student_loan, 0));
    const postgradLoan = toNumberSafe(pickFirst(r?.pg_loan, r?.postgrad_loan, 0));

    let net = 0;
    if (gross > 0) {
      net = gross - otherDeductions - pensionEmployee - aoe - studentLoan - postgradLoan;
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
  companyId: string,
  rowId: string,
  gross: number,
  deductions: number,
  net: number
) {
  const patch = { gross_pay: gross, net_pay: net, other_deductions: deductions, manual_override: true };

  const { error } = await supabase
    .from("payroll_run_employees")
    .update(patch)
    .eq("id", rowId)
    .eq("run_id", runId)
    .eq("company_id", companyId);

  if (!error) return { ok: true as const };

  return {
    ok: false as const,
    error: { code: error.code, message: error.message, details: error.details, hint: error.hint },
  };
}


async function bestEffortAbsenceSyncForRun(supabase: any, runId: string, companyId: string, runRow: any) {
  try {
    const attachTry = await loadAttachments(supabase, runId, companyId);
    if (!attachTry.ok) {
      return {
        ok: false as const,
        reason: "attachments_load_failed",
        attempts: attachTry.attempts || [],
      };
    }

    const payrollRunEmployees = Array.isArray(attachTry.rows) ? attachTry.rows : [];

    await syncAbsencePayToRun({
      supabase,
      runId,
      runRow,
      payrollRunEmployees,
    });

    return {
      ok: true as const,
      payrollRunEmployeesCount: payrollRunEmployees.length,
    };
  } catch (err: any) {
    return {
      ok: false as const,
      reason: "unexpected_error",
      error: {
        message: err?.message ?? String(err),
      },
    };
  }
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


async function loadContracts(
  supabase: any,
  companyId: string,
  contractIds: string[]
) {
  if (!Array.isArray(contractIds) || contractIds.length === 0) {
    return { ok: true as const, rows: [] as any[] };
  }

  const { data, error } = await supabase
    .from("employee_contracts")
    .select("*")
    .eq("company_id", companyId)
    .in("id", contractIds);

  if (error) {
    return { ok: false as const, error: error.message };
  }

  return {
    ok: true as const,
    rows: Array.isArray(data) ? data : [],
  };
}async function localComputeFullFromElements(supabase: any, runId: string, companyId: string, run: any) {
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

  const employeeIds = Array.from(
    new Set(
      attachments
        .map((r: any) => String(pickFirst(r?.employee_id, r?.employeeId, "") || "").trim())
        .filter(Boolean)
    )
  );

  const contractIds = Array.from(
    new Set(
      attachments
        .map((r: any) => String(pickFirst(r?.contract_id, r?.contractId, "") || "").trim())
        .filter((id: string) => Boolean(id) && isUuid(id))
    )
  );

  const empById = new Map<string, any>();
  if (employeeIds.length > 0) {
    const { data: empRowsRaw, error: empErr } = await supabase
      .from("employees")
      .select("*")
      .in("id", employeeIds)
      .eq("company_id", companyId);

    if (empErr) {
      return {
        ok: false as const,
        status: 500,
        error: `Failed to load employees for local full compute: ${empErr.message}`,
      };
    }

    for (const emp of Array.isArray(empRowsRaw) ? empRowsRaw : []) {
      const employeeId = String((emp as any)?.id || "").trim();
      if (employeeId) empById.set(employeeId, emp);
    }
  }

  const contractById = new Map<string, any>();
  if (contractIds.length > 0) {
    const contractRes = await loadContracts(supabase, companyId, contractIds);

    if (!contractRes.ok) {
      return {
        ok: false as const,
        status: 500,
        error: `Failed to load contracts for local full compute: ${contractRes.error}`,
      };
    }

    for (const contract of contractRes.rows) {
      const contractId = String((contract as any)?.id || "").trim();
      if (contractId) contractById.set(contractId, contract);
    }
  }

  const sortedContracts = sortContractsMainFirst(Array.from(contractById.values()));
  const primaryContractId = String(sortedContracts[0]?.id || "").trim();

  const { data: elementRowsRaw, error: elementErr } = await supabase
    .from("payroll_run_pay_elements")
    .select("*")
    .in("payroll_run_employee_id", preIds);

  if (elementErr) {
    return { ok: false as const, status: 500, error: `Failed to load pay elements: ${elementErr.message}` };
  }

  const elementRows = Array.isArray(elementRowsRaw) ? elementRowsRaw : [];
  const typeIds = Array.from(
    new Set(
      elementRows
        .map((r: any) => String(pickFirst(r?.pay_element_type_id, r?.payElementTypeId, "") || "").trim())
        .filter(Boolean)
    )
  );

  const codesWeNeed = ["PAYE", "EE_NI", "ER_NI", "EE_PEN", "EE_PEN_RAS", "EE_PEN_SAL_SAC", "ER_PEN"];
  const { data: generatedTypesRaw, error: generatedTypeErr } = await supabase
    .from("pay_element_types")
    .select("*")
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

  const typeById = new Map<string, any>();
  if (typeIds.length > 0) {
    const { data: typeRowsRaw, error: typeErr } = await supabase
      .from("pay_element_types")
      .select("*")
      .in("id", typeIds);

    if (typeErr) {
      return { ok: false as const, status: 500, error: `Failed to load pay element types: ${typeErr.message}` };
    }

    for (const t of Array.isArray(typeRowsRaw) ? typeRowsRaw : []) {
      const id = String((t as any)?.id || "").trim();
      if (id) typeById.set(id, t);
    }
  }

  const generatedCodeSet = new Set<string>(codesWeNeed);

  const byPreId = new Map<string, LocalNormalisedPayElement[]>();
  for (const rawRow of elementRows) {
    const preId = String(pickFirst((rawRow as any)?.payroll_run_employee_id, "") || "").trim();
    if (!preId) continue;

    const typeId = String(pickFirst((rawRow as any)?.pay_element_type_id, "") || "").trim();
    const type = typeId ? typeById.get(typeId) : null;
    const normalised = normaliseLocalPayElement(rawRow, type);

    if (!byPreId.has(preId)) byPreId.set(preId, []);
    byPreId.get(preId)!.push(normalised);
  }

  const taxYear = (() => {
    const src = String(pickFirst(run?.period_start, run?.pay_period_start, "") || "");
    const yr = parseInt(src.slice(0, 4), 10);
    return Number.isFinite(yr) ? yr : undefined;
  })();

  for (const att of attachments) {
    const preId = String(pickFirst(att?.id, "") || "").trim();
    if (!preId) continue;

    const employeeId = String(pickFirst(att?.employee_id, att?.employeeId, "") || "").trim();
    const emp = employeeId ? empById.get(employeeId) : null;

    const contractId = String(
      pickFirst(att?.contract_id, att?.contractId, "") || ""
    ).trim();
    const contract = contractId ? contractById.get(contractId) : null;

    const rowPayFrequency = String(
      pickFirst(
        att?.pay_frequency_used,
        contract?.pay_frequency,
        emp?.pay_frequency,
        emp?.frequency,
        run?.frequency,
        run?.pay_frequency,
        ""
      ) || ""
    )
      .trim()
      .toLowerCase();

    const rows = byPreId.get(preId) || [];

    let gross = 0;
    let basicPay = 0;
    let taxablePay = 0;
    let pensionablePay = 0;
    let aeQualifyingSourcePay = 0;
    let employeeElementDeductions = 0;
    let nonSspEarningsGross = 0;

    for (const row of rows) {
      const code = String(row.code || "").trim().toUpperCase();
      const amount = round2(toNumberSafe(row.amount));
      const isSsp = isSspCode(code);
      const isSicknessReduction = isSicknessBasicReductionCode(code);

      if (row.side === "earning") {
        gross += amount;

        if (code === "BASIC" || isSicknessReduction) {
          basicPay += amount;
        }

        if (row.effectiveTaxableForPaye) {
          taxablePay += amount;
        }

        if (!isSsp) {
          nonSspEarningsGross += amount;
        }

        if (row.effectivePensionable && !isSsp) {
          pensionablePay += amount;
        }

        if (row.effectiveAeQualifying && !isSsp) {
          aeQualifyingSourcePay += amount;
        }

        continue;
      }

      if (generatedCodeSet.has(code)) continue;

      employeeElementDeductions += amount;
    }

    const nonSspGross = round2(Math.max(0, nonSspEarningsGross));

    gross = round2(gross);
    basicPay = round2(Math.max(0, basicPay));
    taxablePay = round2(Math.max(0, taxablePay));
    pensionablePay = round2(pensionablePay > 0 ? pensionablePay : nonSspGross);
    aeQualifyingSourcePay = round2(aeQualifyingSourcePay > 0 ? aeQualifyingSourcePay : nonSspGross);
    employeeElementDeductions = round2(employeeElementDeductions);

    const resolvedPension = resolvePensionSettingsForRow({
      contract,
      emp,
      isPrimaryContract: Boolean(contractId) && contractId === primaryContractId,
    });
    const pensionSettings = resolvedPension.settings;

    const rawTaxCode = pickFirst(
      att?.tax_code_used,
      att?.taxCodeUsed,
      emp?.tax_code,
      emp?.taxCode,
      emp?.taxcode,
      null
    );
    const rawTaxBasis = normalizeTaxCodeBasisValue(
      pickFirst(
        att?.tax_code_basis_used,
        att?.taxCodeBasisUsed,
        emp?.tax_code_basis,
        emp?.tax_basis,
        emp?.taxBasis,
        null
      )
    );
    const niCategory = String(pickFirst(att?.ni_category_used, "A") || "A")
      .trim()
      .toUpperCase();

    const pensionOverlay = overlayPensionFromEmployeeSettings({
      gross,
      basicPay,
      pensionablePay,
      aeQualifyingSourcePay,
      payFrequency: rowPayFrequency,
      taxYear,
      taxCode: rawTaxCode,
      taxBasis: rawTaxBasis,
      niCategory,
      settings: pensionSettings,
    });

    const paye = round2(pensionOverlay.paye);
    const employeeNi = round2(pensionOverlay.employeeNi);
    const employerNi = round2(pensionOverlay.employerNi);
    const pensionEmployee = round2(pensionOverlay.pensionEmployee);
    const pensionEmployer = round2(pensionOverlay.pensionEmployer);

    const net = round2(Math.max(0, gross - employeeElementDeductions - paye - employeeNi - pensionEmployee));

    const patch: any = {
      gross_pay: gross,
      basic_pay: basicPay,
      taxable_pay: taxablePay,
      tax: paye,
      ni_employee: employeeNi,
      ni_employer: employerNi,
      pension_employee: pensionEmployee,
      pension_employer: pensionEmployer,
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
        "PAYE income tax"
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
        "National Insurance (employee)"
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
        "Employer NI"
      );
      if (!up.ok) {
        return {
          ok: false as const,
          status: 500,
          error: `Failed to upsert ER_NI pay element for row ${preId}: ${String(up.error?.message || "unknown error")}`,
        };
      }
    }

    const employeePensionDescriptions: Record<string, string> = {
      EE_PEN: "Employee pension",
      EE_PEN_RAS: "Employee pension relief at source",
      EE_PEN_SAL_SAC: "Salary sacrifice pension",
    };

    for (const code of ["EE_PEN", "EE_PEN_RAS", "EE_PEN_SAL_SAC"] as const) {
      const type = generatedTypeByCode.get(code);
      if (!type?.id) continue;

      const amount = code === pensionOverlay.employeePensionCode ? pensionEmployee : 0;
      const up = await upsertGeneratedPayElement(
        supabase,
        preId,
        String(type.id),
        amount,
        employeePensionDescriptions[code]
      );

      if (!up.ok) {
        return {
          ok: false as const,
          status: 500,
          error: `Failed to upsert ${code} pay element for row ${preId}: ${String(up.error?.message || "unknown error")}`,
        };
      }
    }

    const erPenType = generatedTypeByCode.get("ER_PEN");
    if (erPenType?.id) {
      const up = await upsertGeneratedPayElement(
        supabase,
        preId,
        String(erPenType.id),
        pensionEmployer,
        "Employer pension"
      );
      if (!up.ok) {
        return {
          ok: false as const,
          status: 500,
          error: `Failed to upsert ER_PEN pay element for row ${preId}: ${String(up.error?.message || "unknown error")}`,
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

  const result = await getPayrollRunDetail(supabase, id, includeDebug);
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

    const absenceSync = await bestEffortAbsenceSyncForRun(supabase, id, companyId, run);

    // Attempt the DB-side RPC first. If no matching function exists (ok: false,
    // status: 501) we fall through to the local TypeScript compute below.
    // Any other RPC error (wrong schema, runtime exception, etc.) is still
    // surfaced immediately Ã¢â‚¬â€ those need the developer to fix, not a silent
    // client-side recompute.
    const rpc: any = {
      ok: false,
      status: 501,
      error: "RPC bypassed to force contract-aware local compute",
      attempts: [],
      via: { fn: "bypassed", args: { run_id: id } },
    };

    let localFallback: any = null;

    if (rpc?.ok) {
      // RPC succeeded Ã¢â‚¬â€ refresh totals from what the DB function wrote.
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

      if (!totalsRefresh?.ok) {
        return json(totalsRefresh?.status || 500, {
          ok: false,
          debugSource: "payroll_run_route_rls_v2",
          action: "compute_full",
          error: totalsRefresh?.error || "Totals refresh failed after RPC compute",
          computeVia: rpc?.via,
          absenceSync,
        });
      }

      const post = await getRunAndEmployees(supabase, id, false);
      if (!post.ok) {
        return json(post.status || 500, {
          ok: false,
          debugSource: "payroll_run_route_rls_v2",
          action: "compute_full",
          error: post.error,
          computeVia: rpc?.via,
        });
      }

      if (Boolean(post.seededMode) || resultLooksGrossOnly(post)) {
        return json(409, {
          ok: false,
          debugSource: "payroll_run_route_rls_v2",
          action: "compute_full",
          error:
            "Full compute attempted via RPC, but the run still looks gross-only/uncomputed. Ensure your DB compute function writes tax, NI, net, and calc_mode='full' back to payroll_run_employees.",
          computeVia: rpc?.via,
          totalsRefreshOk: Boolean(totalsRefresh?.ok),
          absenceSync,
          seededMode: Boolean(post.seededMode),
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
        absenceSync,
        localFallback: null,
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

    // RPC not found (501) Ã¢â€ â€™ fall back to local TypeScript compute.
    // Any other RPC failure status Ã¢â€ â€™ surface it; don't silently recompute.
    if ((rpc?.status ?? 501) !== 501) {
      return json(rpc?.status || 500, {
        ok: false,
        debugSource: "payroll_run_route_rls_v2",
        action: "compute_full",
        error: rpc?.error || "Full compute RPC failed",
        attempts: rpc?.attempts || [],
        absenceSync,
      });
    }

    localFallback = await localComputeFullFromElements(supabase, id, companyId, run);
    if (!localFallback.ok) {
      return json(localFallback.status || 500, {
        ok: false,
        debugSource: "payroll_run_route_rls_v2",
        action: "compute_full",
        error: localFallback.error || "Local full compute fallback failed",
        computeVia: rpc?.via,
        totalsRefreshOk: false,
        absenceSync,
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
        absenceSync,
        localFallback,
      });
    }

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
      return json(post.status || 500, {
        ok: false,
        debugSource: "payroll_run_route_rls_v2",
        action: "compute_full",
        error: post.error,
        computeVia: rpc?.via,
        localFallback,
      });
    }

    if (Boolean(post.seededMode) || resultLooksGrossOnly(post)) {
      return json(409, {
        ok: false,
        debugSource: "payroll_run_route_rls_v2",
        action: "compute_full",
        error:
          "Full compute attempted, but the run still looks gross-only/uncomputed. Ensure your DB compute function or local fallback writes tax, NI, net, and calc_mode='full' back to payroll_run_employees.",
        computeVia: rpc?.via,
        totalsRefreshOk: Boolean(totalsRefreshAfterLocal?.ok),
        absenceSync,
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
      totalsRefreshOk: Boolean(totalsRefreshAfterLocal?.ok),
      absenceSync,
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

    const r = await updateRunEmployeeRow(supabase, id, companyId, rowId, gross, deductions, net);
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



