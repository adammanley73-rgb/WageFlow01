// C:\Projects\wageflow01\lib\payroll\getPayrollRunDetail.ts

import { calculatePay } from "@/lib/payroll/calculatePay";

export type PayrollRunDetailSuccess = {
  ok: true;
  run: any;
  employees: any[];
  totals: {
    gross: number;
    total_gross: number;
    tax: number;
    total_tax: number;
    ni: number;
    total_ni: number;
    deductions: number;
    total_deductions: number;
    net: number;
    total_net: number;
  };
  seededMode: boolean;
  exceptions: {
    items: any[];
    blockingCount: number;
    warningCount: number;
    total: number;
  };
  attachmentsMeta: {
    tableUsed: string | null;
    whereColumn: string | null;
  };
  debug?: any;
};

export type PayrollRunDetailFailure = {
  ok: false;
  status: number;
  error: string;
  debug?: any;
};

export type PayrollRunDetailResult = PayrollRunDetailSuccess | PayrollRunDetailFailure;

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

function getNextFriday(isoDate: string): string {
  const d = new Date(isoDate + "T00:00:00Z");
  const day = d.getUTCDay();
  const daysUntilFriday = day === 5 ? 7 : (5 - day + 7) % 7;
  d.setUTCDate(d.getUTCDate() + daysUntilFriday);
  return d.toISOString().slice(0, 10);
}

export function deriveRunPayDate(run: any): string | null {
  const frequency = String(
    pickFirst(run?.frequency, run?.pay_frequency, run?.payFrequency, "") || ""
  )
    .trim()
    .toLowerCase();

  const isWeekly = frequency === "weekly" || frequency === "week" || frequency === "1_week";

  if (isWeekly) {
    const overridden = parseBoolStrict(
      pickFirst(run?.pay_date_overridden, run?.payDateOverridden, null)
    );
    if (overridden === true) {
      const stored = String(
        pickFirst(run?.pay_date, run?.payDate, "") || ""
      ).trim();
      if (isIsoDateOnly(stored)) return stored;
    }

    const periodEnd = String(
      pickFirst(run?.period_end, run?.pay_period_end, run?.end_date, "") || ""
    ).trim();
    if (isIsoDateOnly(periodEnd)) return getNextFriday(periodEnd);
  }

  const stored = String(pickFirst(run?.pay_date, run?.payDate, "") || "").trim();
  if (isIsoDateOnly(stored)) return stored;

  return null;
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
  if (!value) return null;
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
      // ignore invalid JSON
    }
  }
  return null;
}

function normalizeTaxCodeBasisValue(
  value: any
): "cumulative" | "week1_month1" | null {
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

function getContractSuffixNumber(contractNumber: string | null | undefined): number | null {
  const raw = String(contractNumber || "").trim();
  if (!raw) return null;
  const match = raw.match(/-(\d+)$/);
  if (!match) return null;
  const n = Number(match[1]);
  return Number.isFinite(n) ? n : null;
}

function toSortableTime(value: string | null | undefined): number {
  const raw = String(value || "").trim();
  if (!raw) return Number.MAX_SAFE_INTEGER;
  const ts = new Date(raw).getTime();
  return Number.isFinite(ts) ? ts : Number.MAX_SAFE_INTEGER;
}

function sortContractsMainFirst(rows: any[]): any[] {
  return [...rows].sort((a, b) => {
    const aSuffix = getContractSuffixNumber(a?.contract_number);
    const bSuffix = getContractSuffixNumber(b?.contract_number);
    if (aSuffix !== null && bSuffix !== null && aSuffix !== bSuffix) {
      return aSuffix - bSuffix;
    }
    if (aSuffix !== null && bSuffix === null) return -1;
    if (aSuffix === null && bSuffix !== null) return 1;

    const aStart = toSortableTime(a?.start_date);
    const bStart = toSortableTime(b?.start_date);
    if (aStart !== bStart) return aStart - bStart;

    const aCreated = toSortableTime(a?.created_at);
    const bCreated = toSortableTime(b?.created_at);
    if (aCreated !== bCreated) return aCreated - bCreated;

    return String(a?.contract_number || "").localeCompare(
      String(b?.contract_number || "")
    );
  });
}

type LocalNormalisedPayElement = {
  payrollRunEmployeeId: string;
  payElementTypeId: string;
  code: string;
  side: "earning" | "deduction";
  amount: number;
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

function resolveBooleanOverride(
  overrideValue: any,
  defaultValue: any
): boolean {
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

  if (basis === "qualifying_earnings") return qualifying;
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

  const enabled = explicitEnabled !== null
    ? explicitEnabled
    : employeePercent > 0 || employerPercent > 0;

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

  const status = String(
    pickFirst(source?.pension_status, source?.pensionStatus, "") || ""
  )
    .trim()
    .toLowerCase();

  if (status && status !== "not_assessed" && status !== "not_eligible") {
    return true;
  }

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
    return {
      settings: readPensionSettingsFromSource(args.contract),
      source: "contract",
    };
  }

  if (hasContract && args.isPrimaryContract && employeeMeaningful) {
    return {
      settings: readPensionSettingsFromSource(args.emp),
      source: "employee",
    };
  }

  if (!hasContract && employeeMeaningful) {
    return {
      settings: readPensionSettingsFromSource(args.emp),
      source: "employee",
    };
  }

  if (hasContract) {
    return {
      settings: readPensionSettingsFromSource(args.contract),
      source: "none",
    };
  }

  return {
    settings: readPensionSettingsFromSource(args.emp),
    source: "none",
  };
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
  if (
    s === "4_weekly" ||
    s === "four_weekly" ||
    s === "4_weeks" ||
    s === "four_weeks"
  ) {
    return { lower: 480, upper: 3867 };
  }
  if (s === "quarterly" || s === "quarter" || s === "1_quarter") {
    return { lower: 1560, upper: 12568 };
  }
  if (
    s === "biannual" ||
    s === "bi_annual" ||
    s === "semiannual" ||
    s === "semi_annual"
  ) {
    return { lower: 3120, upper: 25135 };
  }
  if (s === "annual" || s === "yearly" || s === "year") {
    return { lower: 6240, upper: 50270 };
  }
  return { lower: 520, upper: 4189 };
}

function computeQualifyingEarnings(
  qualifyingSourcePay: number,
  payFrequency: any
): number {
  const source = round2(Math.max(0, qualifyingSourcePay || 0));
  if (source <= 0) return 0;

  const { lower, upper } = getAeQualifyingEarningsBounds(payFrequency);
  return round2(Math.max(Math.min(source, upper) - lower, 0));
}

function normaliseLocalPayElement(row: any, type: any): LocalNormalisedPayElement {
  const payrollRunEmployeeId = String(
    pickFirst(row?.payroll_run_employee_id, row?.payrollRunEmployeeId, "") || ""
  ).trim();

  const payElementTypeId = String(
    pickFirst(row?.pay_element_type_id, row?.payElementTypeId, "") || ""
  ).trim();

  const code = String(pickFirst(type?.code, row?.code, "") || "")
    .trim()
    .toUpperCase();

  const side = normalisePayElementSide(pickFirst(type?.side, row?.side, null));

  const amount = round2(toNumberSafe(pickFirst(row?.amount, 0)));

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

function formatTaxCodeForCalc(
  taxCode: any,
  basis: any,
  payFrequency?: any
): string {
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

  const baseHasNonCumulativeMarker = /\b(?:WK1\/MTH1|WK1MTH1|W1M1|W1|M1)\b/i.test(
    rawBase
  );

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
  if (!taxYear || taxYear >= 2025) {
    return {
      PT: 1048,
      UEL: 4189,
      ST: 417,
      employeeMain: 0.08,
      employeeUpper: 0.02,
      employerRate: 0.15,
    };
  }
  if (taxYear === 2024) {
    return {
      PT: 1048,
      UEL: 4189,
      ST: 758,
      employeeMain: 0.08,
      employeeUpper: 0.02,
      employerRate: 0.138,
    };
  }
  if (taxYear === 2023) {
    return {
      PT: 1048,
      UEL: 4189,
      ST: 758,
      employeeMain: 0.1,
      employeeUpper: 0.02,
      employerRate: 0.138,
    };
  }
  if (taxYear === 2022) {
    return {
      PT: 1048,
      UEL: 4189,
      ST: 758,
      employeeMain: 0.1325,
      employeeUpper: 0.0325,
      employerRate: 0.1485,
    };
  }
  return {
    PT: 1048,
    UEL: 4189,
    ST: 417,
    employeeMain: 0.08,
    employeeUpper: 0.02,
    employerRate: 0.15,
  };
}

function computeApproxMonthlyNi(
  gross: number,
  niCategory: any,
  taxYear?: number
) {
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
    return { paye: 0, employeeNi: 0, employerNi: 0 };
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

  const employeeNi = computeApproxMonthlyNi(
    grossForEmployeeNi,
    args.niCategory,
    args.taxYear
  ).employee;

  const employerNi = computeApproxMonthlyNi(
    grossForEmployerNi,
    args.niCategory,
    args.taxYear
  ).employer;

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

export function resultLooksGrossOnly(result: any): boolean {
  const totals = result?.totals ?? {};
  const employees = Array.isArray(result?.employees) ? result.employees : [];

  if (employees.length === 0) return true;

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

async function loadRun(supabase: any, runId: string) {
  const { data, error } = await supabase
    .from("payroll_runs")
    .select("*")
    .eq("id", runId)
    .maybeSingle();

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
    error: {
      code: a.error.code,
      message: a.error.message,
      details: a.error.details,
      hint: a.error.hint,
    },
  });

  const msg = String(a.error.message || "").toLowerCase();
  const missingCol = a.error.code === "42703" || (msg.includes("column") && msg.includes("does not exist"));

  if (missingCol) {
    const b = await supabase
      .from("payroll_run_employees")
      .select("*")
      .eq("run_id", runId);

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
      error: {
        code: b.error.code,
        message: b.error.message,
        details: b.error.details,
        hint: b.error.hint,
      },
    });
  }

  return {
    ok: false as const,
    tableUsed: null,
    whereColumn: null,
    rows: [],
    attempts,
  };
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
}

function buildEmployeeRow(
  att: any,
  emp: any,
  contract: any,
  run: any,
  isPrimaryContract: boolean
) {
  const meta = getObjectSafe(att?.metadata);

  const employeeId = String(pickFirst(att?.employee_id, att?.employeeId, "") || "");
  const contractId = String(pickFirst(att?.contract_id, att?.contractId, contract?.id, "") || "");

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
    pensionSettings.method === "salary_sacrifice" ? pensionEmployee : 0;

  const grossForTaxFallback = round2(Math.max(0, gross - taxReductionFromPension));
  const grossForNiFallback = round2(Math.max(0, gross - niReductionFromPension));

  if (tax <= 0 && gross > 0 && runFrequency === "monthly" && taxCodeUsed) {
    try {
      const periodStartSrc = String(
        pickFirst(run?.period_start, run?.pay_period_start, run?.start_date, "") || ""
      );
      const taxYear = parseInt(periodStartSrc.slice(0, 4), 10);

      const payResult = calculatePay({
        grossForPeriod: grossForTaxFallback,
        taxCode: formatTaxCodeForCalc(taxCodeUsed, taxCodeBasisUsed, runFrequency),
        period: 1,
        ytdTaxableBeforeThisPeriod: toNumberSafe(
          pickFirst(att?.ytd_taxable_before, att?.ytd_gross_before, emp?.ytd_gross, 0)
        ),
        ytdTaxPaidBeforeThisPeriod: toNumberSafe(
          pickFirst(att?.ytd_tax_before, emp?.ytd_tax, 0)
        ),
        taxYear: Number.isFinite(taxYear) ? taxYear : undefined,
      });

      const computedTax = round2(Number((payResult as any)?.tax ?? 0));
      if (computedTax > 0) {
        tax = computedTax;
        usedTaxFallback = true;
      }
    } catch {
      // leave stored values as-is
    }
  }

  if (
    gross > 0 &&
    runFrequency === "monthly" &&
    niCategoryUsed &&
    (employeeNi <= 0 || employerNi <= 0)
  ) {
    try {
      const periodStartSrc = String(
        pickFirst(run?.period_start, run?.pay_period_start, run?.start_date, "") || ""
      );
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
      // leave stored values as-is
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

  const contractNumber = pickFirst(
    contract?.contract_number,
    meta?.contract_number,
    att?.contract_number,
    att?.contractNumber,
    null
  );

  const contractJobTitle = pickFirst(
    contract?.job_title,
    att?.contract_job_title,
    att?.contractJobTitle,
    meta?.contract_job_title,
    null
  );

  const contractStatus = pickFirst(
    contract?.status,
    att?.contract_status,
    att?.contractStatus,
    null
  );

  const contractStartDate = pickFirst(
    contract?.start_date,
    att?.contract_start_date,
    att?.contractStartDate,
    null
  );

  const contractLeaveDate = pickFirst(
    contract?.leave_date,
    att?.contract_leave_date,
    att?.contractLeaveDate,
    null
  );

  const contractPayAfterLeaving = pickFirst(
    contract?.pay_after_leaving,
    att?.contract_pay_after_leaving,
    att?.contractPayAfterLeaving,
    null
  );

  return {
    ...(att && typeof att === "object" ? att : {}),
    id: safeId,
    payroll_run_employee_id: safeId,
    payrollRunEmployeeId: safeId,
    employee_id: employeeId,
    employeeId: employeeId,
    contract_id: contractId || null,
    contractId: contractId || null,
    contract_number: contractNumber,
    contractNumber,
    contract_job_title: contractJobTitle,
    contractJobTitle: contractJobTitle,
    contract_status: contractStatus,
    contractStatus,
    contract_start_date: contractStartDate,
    contractStartDate: contractStartDate,
    contract_leave_date: contractLeaveDate,
    contractLeaveDate: contractLeaveDate,
    contract_pay_after_leaving: contractPayAfterLeaving,
    contractPayAfterLeaving: contractPayAfterLeaving,
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
      contract?.pay_frequency,
      emp?.pay_frequency,
      emp?.frequency,
      run?.frequency,
      run?.pay_frequency,
      null
    ),
    pay_basis_used: pickFirst(
      att?.pay_basis_used,
      contract?.pay_basis,
      emp?.pay_basis,
      emp?.pay_basis_used,
      emp?.pay_type,
      emp?.payType,
      null
    ),
    hours_per_week_used: pickFirst(
      att?.hours_per_week_used,
      contract?.hours_per_week,
      emp?.hours_per_week,
      emp?.hoursPerWeek,
      null
    ),
  };
}

function summariseEmployeeRows(employees: any[]) {
  const gross = round2(
    employees.reduce(
      (sum: number, row: any) => sum + toNumberSafe(pickFirst(row?.gross, row?.gross_pay, 0)),
      0
    )
  );

  const tax = round2(
    employees.reduce(
      (sum: number, row: any) => sum + toNumberSafe(pickFirst(row?.tax, row?.total_tax, 0)),
      0
    )
  );

  const ni = round2(
    employees.reduce(
      (sum: number, row: any) =>
        sum + toNumberSafe(pickFirst(row?.ni_employee, row?.employee_ni, row?.ni, 0)),
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
    employees.reduce(
      (sum: number, row: any) => sum + toNumberSafe(pickFirst(row?.net, row?.net_pay, 0)),
      0
    )
  );

  return { gross, tax, ni, deductions, net };
}

function deriveSeededMode(run: any, attachments: any[]): boolean {
  if (!Array.isArray(attachments) || attachments.length === 0) return true;

  const hasCalcMode = attachments.some(
    (r: any) => r && typeof r === "object" && "calc_mode" in r
  );

  if (hasCalcMode) {
    const allFull = attachments.every(
      (r: any) => String(pickFirst(r?.calc_mode, "uncomputed")) === "full"
    );
    if (allFull) return false;
    return true;
  }

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

    const taxCode = pickFirst(
      att?.tax_code_used,
      emp?.tax_code,
      emp?.taxCode,
      emp?.taxcode,
      null
    );
    if (!taxCode) codes.push("MISSING_TAX_CODE");

    const niCat = pickFirst(
      att?.ni_category_used,
      emp?.ni_category,
      emp?.niCategory,
      emp?.ni_cat,
      emp?.niCat,
      null
    );
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

  return {
    items,
    blockingCount,
    warningCount,
    total: items.length,
  };
}

export async function getPayrollRunDetail(
  supabase: any,
  runId: string,
  includeDebug = false
): Promise<PayrollRunDetailResult> {
  const debug: any = { runId, stage: {} };

  if (!runId || !isUuid(runId)) {
    return {
      ok: false,
      status: 400,
      error: "Invalid payroll run id",
      debug: includeDebug ? debug : undefined,
    };
  }

  const runRes = await loadRun(supabase, runId);
  if (!runRes.ok) {
    debug.stage.runFetch = { ok: false, error: runRes.error };
    return {
      ok: false,
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
      ok: false,
      status: 500,
      error: "Payroll run is missing a valid company_id.",
      debug: includeDebug ? { ...debug, companyId } : undefined,
    };
  }

  const attachTry = await loadAttachments(supabase, runId, companyId);
  if (!attachTry.ok) {
    return {
      ok: false,
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

  const contractIds: string[] = Array.from(
    new Set(
      attachments
        .map((r: any) => String(pickFirst(r?.contract_id, r?.contractId, "") || "").trim())
        .filter((id: string) => Boolean(id) && isUuid(id))
    )
  );

  let empRows: any[] = [];
  let contractRows: any[] = [];

  if (employeeIds.length > 0) {
    const { data: emps, error: empErr } = await supabase
      .from("employees")
      .select("*")
      .in("id", employeeIds)
      .eq("company_id", companyId);

    if (empErr) {
      return {
        ok: false,
        status: 500,
        error: "Failed to load employees for payroll run.",
        debug: includeDebug ? { ...debug, empErr: empErr.message } : undefined,
      };
    }
    empRows = Array.isArray(emps) ? emps : [];
  }

  if (contractIds.length > 0) {
    const contractRes = await loadContracts(supabase, companyId, contractIds);
    if (!contractRes.ok) {
      return {
        ok: false,
        status: 500,
        error: "Failed to load contracts for payroll run.",
        debug: includeDebug ? { ...debug, contractErr: contractRes.error } : undefined,
      };
    }
    contractRows = contractRes.rows;
  }

  debug.stage.employeeFetch = {
    ok: true,
    requested: employeeIds.length,
    found: empRows.length,
  };

  debug.stage.contractFetch = {
    ok: true,
    requested: contractIds.length,
    found: contractRows.length,
  };

  const empById = new Map<string, any>();
  for (const e of empRows) {
    const id = String((e as any)?.id || "").trim();
    if (id) empById.set(id, e);
  }

  const contractById = new Map<string, any>();
  for (const c of contractRows) {
    const id = String((c as any)?.id || "").trim();
    if (id) contractById.set(id, c);
  }

  const sortedContracts = sortContractsMainFirst(contractRows);
  const primaryContractId = String(sortedContracts[0]?.id || "").trim();

  const employees = attachments.map((att: any) => {
    const employeeId = String(pickFirst(att?.employee_id, "") || "").trim();
    const contractId = String(
      pickFirst(att?.contract_id, att?.contractId, "") || ""
    ).trim();

    const emp = employeeId ? empById.get(employeeId) : null;
    const contract = contractId ? contractById.get(contractId) : null;

    return buildEmployeeRow(
      att,
      emp,
      contract,
      run,
      Boolean(contractId) && contractId === primaryContractId
    );
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
      (rowTotals.net > 0 && Math.abs(storedTotalNet - rowTotals.net) > 0.01 &&
        (storedTotalTax === 0 || storedTotalNi === 0)) ||
      (rowTotals.deductions > 0 &&
        Math.abs(storedDerivedDeductions - rowTotals.deductions) > 0.01 &&
        (storedTotalTax === 0 || storedTotalNi === 0)));

  const totalGross =
    storedTotalsLookStale && rowTotals.gross > 0 ? rowTotals.gross : storedTotalGross;
  const totalTax = storedTotalsLookStale ? rowTotals.tax : storedTotalTax;
  const totalNi = storedTotalsLookStale ? rowTotals.ni : storedTotalNi;
  const totalNet =
    storedTotalsLookStale && rowTotals.net > 0 ? rowTotals.net : storedTotalNet;
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
  const effectivePayDate = deriveRunPayDate(run);

  return {
    ok: true,
    run: {
      ...(run as any),
      company_id: companyId,
      ...(effectivePayDate !== null ? { pay_date: effectivePayDate } : {}),
    },
    employees,
    totals,
    seededMode,
    exceptions,
    attachmentsMeta: {
      tableUsed: attachTry.tableUsed,
      whereColumn: attachTry.whereColumn,
    },
    debug: includeDebug ? debug : undefined,
  };
}

