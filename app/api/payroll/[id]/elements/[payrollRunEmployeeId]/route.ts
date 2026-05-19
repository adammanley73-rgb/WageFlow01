// C:\Projects\wageflow01\app\api\payroll\[id]\elements\[payrollRunEmployeeId]\route.ts

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  EXTRA_PAY_DEFINITIONS,
  EXTRA_PAY_CODES,
  getExtraPayDefinition,
  isExtraPayCode,
} from "@/lib/payroll/extraPayItems";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

type ParamsShape = {
  id?: string;
  payrollRunEmployeeId?: string;
};

type RouteContext = {
  params: Promise<ParamsShape>;
};

type PayrollRunRow = {
  id: string;
  company_id: string | null;
  status: string | null;
};

type PayrollRunEmployeeRow = {
  id: string;
  run_id: string;
  company_id: string | null;
  employee_id: string;
  contract_id: string | null;
  pay_basis_used: string | null;
  hours_per_week_used: number | null;
};

type EmployeeRateRow = {
  id: string;
  pay_basis: string | null;
  annual_salary: number | null;
  hourly_rate: number | null;
  hours_per_week: number | null;
};

type ContractRateRow = {
  id: string;
  pay_basis: string | null;
  annual_salary: number | null;
  hourly_rate: number | null;
  hours_per_week: number | null;
};

type PayRateContext = {
  contractId: string | null;
  payBasis: string | null;
  annualSalary: number | null;
  hourlyRate: number | null;
  hoursPerWeek: number | null;
  baseHourlyRate: number | null;
  baseHourlyRateSource: string | null;
};

type PayElementTypeRow = {
  id: string;
  company_id: string | null;
  code: string | null;
  name: string | null;
  side: string | null;
  taxable_for_paye: boolean | null;
  nic_earnings: boolean | null;
  pensionable_default: boolean | null;
  ae_qualifying_default: boolean | null;
  is_salary_sacrifice_type: boolean | null;
  created_at?: string | null;
};

type PayrollRunPayElementJoinedRow = {
  id: string;
  payroll_run_employee_id: string;
  pay_element_type_id: string | null;
  amount: number | null;
  calculation_kind: string | null;
  units: number | null;
  base_rate: number | null;
  rate_multiplier: number | null;
  calculated_rate: number | null;
  manual_override: boolean | null;
  override_reason: string | null;
  description_override: string | null;
  taxable_for_paye_override: boolean | null;
  nic_earnings_override: boolean | null;
  pensionable_override: boolean | null;
  ae_qualifying_override: boolean | null;
  created_at?: string | null;
  updated_at?: string | null;
  pay_element_types?: PayElementTypeRow | PayElementTypeRow[] | null;
};

type NormalisedElementType = {
  id: string;
  companyId: string | null;
  source: "company" | "global";
  code: string;
  name: string;
  side: "earning" | "deduction";
  taxableForPaye: boolean;
  nicEarnings: boolean;
  pensionable: boolean;
  aeQualifying: boolean;
  isSalarySacrificeType: boolean;
};

type EditablePayloadItem = {
  code?: unknown;
  amount?: unknown;
  calculation_kind?: unknown;
  units?: unknown;
  base_rate?: unknown;
  rate_multiplier?: unknown;
  calculated_rate?: unknown;
  manual_override?: unknown;
  override_reason?: unknown;
  description_override?: unknown;
};

type ValidatedPayloadItem = {
  code: string;
  amount: number;
  calculation_kind: "manual_amount" | "rate_units";
  units: number | null;
  base_rate: number | null;
  rate_multiplier: number | null;
  calculated_rate: number | null;
  manual_override: boolean;
  override_reason: string | null;
  description_override: string | null;
};

const EXTRA_PAY_CODE_SET = new Set<string>(EXTRA_PAY_CODES);
const BASIC_CODE = "BASIC";
const WEEKS_PER_YEAR = 52.14285714;

function isUuid(value: unknown) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    String(value ?? "").trim()
  );
}

function toNumberSafe(value: unknown): number {
  const n =
    typeof value === "number"
      ? value
      : parseFloat(String(value ?? "").replace(/[^\d.-]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

function toNullableNumber(value: unknown): number | null {
  const n = toNumberSafe(value);
  return Number.isFinite(n) ? n : null;
}

function positiveOrNull(value: unknown): number | null {
  const n = toNumberSafe(value);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function round2(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

function round4(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.round((n + Number.EPSILON) * 10000) / 10000;
}

function trimOrNull(value: unknown): string | null {
  const s = String(value ?? "").trim();
  return s ? s : null;
}

function lowerTrim(value: unknown): string {
  return String(value ?? "").trim().toLowerCase();
}

function statusFromErr(err: unknown, fallback = 500): number {
  const anyErr = err as { status?: unknown } | null;
  const s = Number(anyErr?.status);
  return Number.isFinite(s) && s >= 100 ? s : fallback;
}

function canEditRunStatus(status: unknown) {
  const s = lowerTrim(status);
  return s === "draft" || s === "processing";
}

function json(status: number, body: Record<string, unknown>) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

function isManualExtraPayCode(code: unknown) {
  return EXTRA_PAY_CODE_SET.has(String(code ?? "").trim().toUpperCase());
}

function isBasicCode(code: unknown) {
  return String(code ?? "").trim().toUpperCase() === BASIC_CODE;
}

function isVisibleInPayItemsModal(code: unknown) {
  return isBasicCode(code) || isManualExtraPayCode(code);
}

function normalisePayBasis(value: unknown): string | null {
  const s = lowerTrim(value);
  if (!s) return null;

  if (s.includes("salary") || s === "salaried" || s === "annual") return "salary";
  if (s.includes("hour") || s === "casual" || s === "worker") return "hourly";

  return s;
}

function deriveBaseHourlyRate(input: {
  payBasis: string | null;
  annualSalary: number | null;
  hourlyRate: number | null;
  hoursPerWeek: number | null;
}): { rate: number | null; source: string | null } {
  const payBasis = normalisePayBasis(input.payBasis);
  const annualSalary = positiveOrNull(input.annualSalary);
  const hourlyRate = positiveOrNull(input.hourlyRate);
  const hoursPerWeek = positiveOrNull(input.hoursPerWeek);

  if (payBasis === "hourly" && hourlyRate !== null) {
    return { rate: round4(hourlyRate), source: "hourly_rate" };
  }

  if (payBasis === "salary") {
    if (hourlyRate !== null) {
      return { rate: round4(hourlyRate), source: "stored_salary_equivalent_hourly_rate" };
    }

    if (annualSalary !== null && hoursPerWeek !== null) {
      return {
        rate: round4(annualSalary / WEEKS_PER_YEAR / hoursPerWeek),
        source: "derived_from_annual_salary_and_hours_per_week",
      };
    }
  }

  if (hourlyRate !== null) {
    return { rate: round4(hourlyRate), source: "hourly_rate" };
  }

  if (annualSalary !== null && hoursPerWeek !== null) {
    return {
      rate: round4(annualSalary / WEEKS_PER_YEAR / hoursPerWeek),
      source: "derived_from_annual_salary_and_hours_per_week",
    };
  }

  return { rate: null, source: null };
}

function normaliseElementTypeRow(row: PayElementTypeRow): NormalisedElementType | null {
  const code = String(row.code ?? "").trim().toUpperCase();
  const name = String(row.name ?? "").trim();
  const sideRaw = String(row.side ?? "").trim().toLowerCase();

  if (!row.id || !code || !name) return null;
  if (sideRaw !== "earning" && sideRaw !== "deduction") return null;

  return {
    id: String(row.id),
    companyId: row.company_id ? String(row.company_id) : null,
    source: row.company_id ? "company" : "global",
    code,
    name,
    side: sideRaw,
    taxableForPaye: row.taxable_for_paye === true,
    nicEarnings: row.nic_earnings === true,
    pensionable: row.pensionable_default === true,
    aeQualifying: row.ae_qualifying_default === true,
    isSalarySacrificeType: row.is_salary_sacrifice_type === true,
  };
}

function normaliseJoinedType(
  raw: PayElementTypeRow | PayElementTypeRow[] | null | undefined
): NormalisedElementType | null {
  if (!raw) return null;
  const row = Array.isArray(raw) ? raw[0] ?? null : raw;
  if (!row) return null;
  return normaliseElementTypeRow(row);
}

async function resolveRun(supabase: any, runId: string): Promise<PayrollRunRow | null> {
  const { data, error } = await supabase
    .from("payroll_runs")
    .select("id, company_id, status")
    .eq("id", runId)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  return {
    id: String(data.id),
    company_id: data.company_id ? String(data.company_id) : null,
    status: data.status ? String(data.status) : null,
  };
}

async function resolveRunEmployeeById(
  supabase: any,
  runId: string,
  payrollRunEmployeeId: string
): Promise<PayrollRunEmployeeRow | null> {
  const { data, error } = await supabase
    .from("payroll_run_employees")
    .select("id, run_id, company_id, employee_id, contract_id, pay_basis_used, hours_per_week_used")
    .eq("id", payrollRunEmployeeId)
    .eq("run_id", runId)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  return {
    id: String(data.id),
    run_id: String(data.run_id),
    company_id: data.company_id ? String(data.company_id) : null,
    employee_id: String(data.employee_id),
    contract_id: data.contract_id ? String(data.contract_id) : null,
    pay_basis_used: data.pay_basis_used ? String(data.pay_basis_used) : null,
    hours_per_week_used: toNullableNumber(data.hours_per_week_used),
  };
}

async function resolveEmployeeSummary(supabase: any, employeeId: string) {
  const { data, error } = await supabase
    .from("employees")
    .select("id, employee_number, first_name, last_name")
    .eq("id", employeeId)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  const first = String(data.first_name ?? "").trim();
  const last = String(data.last_name ?? "").trim();

  return {
    id: String(data.id),
    employeeNumber: String(data.employee_number ?? "").trim() || "Not set",
    employeeName: `${first} ${last}`.trim() || "Unnamed employee",
  };
}

async function resolveEmployeeRateRow(
  supabase: any,
  employeeId: string
): Promise<EmployeeRateRow | null> {
  const { data, error } = await supabase
    .from("employees")
    .select("id, pay_basis, annual_salary, hourly_rate, hours_per_week")
    .eq("id", employeeId)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  return {
    id: String(data.id),
    pay_basis: trimOrNull(data.pay_basis),
    annual_salary: toNullableNumber(data.annual_salary),
    hourly_rate: toNullableNumber(data.hourly_rate),
    hours_per_week: toNullableNumber(data.hours_per_week),
  };
}

async function resolveContractRateRow(
  supabase: any,
  contractId: string | null
): Promise<ContractRateRow | null> {
  if (!contractId || !isUuid(contractId)) return null;

  const { data, error } = await supabase
    .from("employee_contracts")
    .select("id, pay_basis, annual_salary, hourly_rate, hours_per_week")
    .eq("id", contractId)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  return {
    id: String(data.id),
    pay_basis: trimOrNull(data.pay_basis),
    annual_salary: toNullableNumber(data.annual_salary),
    hourly_rate: toNullableNumber(data.hourly_rate),
    hours_per_week: toNullableNumber(data.hours_per_week),
  };
}

async function resolvePayRateContext(
  supabase: any,
  prep: PayrollRunEmployeeRow
): Promise<PayRateContext> {
  const [employee, contract] = await Promise.all([
    resolveEmployeeRateRow(supabase, prep.employee_id),
    resolveContractRateRow(supabase, prep.contract_id),
  ]);

  const payBasis =
    trimOrNull(prep.pay_basis_used) ??
    trimOrNull(contract?.pay_basis) ??
    trimOrNull(employee?.pay_basis);

  const annualSalary =
    positiveOrNull(contract?.annual_salary) ?? positiveOrNull(employee?.annual_salary);

  const hourlyRate =
    positiveOrNull(contract?.hourly_rate) ?? positiveOrNull(employee?.hourly_rate);

  const hoursPerWeek =
    positiveOrNull(prep.hours_per_week_used) ??
    positiveOrNull(contract?.hours_per_week) ??
    positiveOrNull(employee?.hours_per_week);

  const derived = deriveBaseHourlyRate({
    payBasis,
    annualSalary,
    hourlyRate,
    hoursPerWeek,
  });

  return {
    contractId: prep.contract_id,
    payBasis,
    annualSalary,
    hourlyRate,
    hoursPerWeek,
    baseHourlyRate: derived.rate,
    baseHourlyRateSource: derived.source,
  };
}

async function loadElementTypesForCompany(
  supabase: any,
  companyId: string | null
): Promise<Map<string, NormalisedElementType>> {
  let query = supabase
    .from("pay_element_types")
    .select(
      "id, company_id, code, name, side, taxable_for_paye, nic_earnings, pensionable_default, ae_qualifying_default, is_salary_sacrifice_type, created_at"
    );

  if (companyId) {
    query = query.or(`company_id.is.null,company_id.eq.${companyId}`);
  } else {
    query = query.is("company_id", null);
  }

  const { data, error } = await query;
  if (error) throw error;

  const out = new Map<string, NormalisedElementType>();

  for (const raw of (Array.isArray(data) ? data : []) as PayElementTypeRow[]) {
    const norm = normaliseElementTypeRow(raw);
    if (!norm) continue;

    const existing = out.get(norm.code);
    if (!existing) {
      out.set(norm.code, norm);
      continue;
    }

    const existingScore = existing.source === "company" ? 1 : 0;
    const nextScore = norm.source === "company" ? 1 : 0;

    if (nextScore > existingScore) {
      out.set(norm.code, norm);
    }
  }

  return out;
}

async function loadPayItems(
  supabase: any,
  payrollRunEmployeeId: string
): Promise<PayrollRunPayElementJoinedRow[]> {
  const { data, error } = await supabase
    .from("payroll_run_pay_elements")
    .select(
      `
      id,
      payroll_run_employee_id,
      pay_element_type_id,
      amount,
      calculation_kind,
      units,
      base_rate,
      rate_multiplier,
      calculated_rate,
      manual_override,
      override_reason,
      description_override,
      taxable_for_paye_override,
      nic_earnings_override,
      pensionable_override,
      ae_qualifying_override,
      created_at,
      updated_at,
      pay_element_types (
        id,
        company_id,
        code,
        name,
        side,
        taxable_for_paye,
        nic_earnings,
        pensionable_default,
        ae_qualifying_default,
        is_salary_sacrifice_type
      )
      `
    )
    .eq("payroll_run_employee_id", payrollRunEmployeeId)
    .order("created_at", { ascending: true });

  if (error) throw error;

  return (Array.isArray(data) ? data : []) as PayrollRunPayElementJoinedRow[];
}

function buildAvailableTypes(typeMap: Map<string, NormalisedElementType>) {
  return EXTRA_PAY_DEFINITIONS.map((definition) => {
    const liveType = typeMap.get(definition.code);
    if (!liveType) return null;

    return {
      code: liveType.code,
      name: liveType.name,
      side: liveType.side,
      taxable_for_paye: liveType.taxableForPaye,
      nic_earnings: liveType.nicEarnings,
      pensionable: liveType.pensionable,
      ae_qualifying: liveType.aeQualifying,
      calculation_kind: definition.calculationKind,
      rate_multiplier: definition.rateMultiplier,
      unit_label: definition.unitLabel,
    };
  }).filter(Boolean);
}

function buildItems(itemRows: PayrollRunPayElementJoinedRow[]) {
  return itemRows
    .map((row) => {
      const type = normaliseJoinedType(row.pay_element_types);
      if (!type) return null;
      if (!isVisibleInPayItemsModal(type.code)) return null;

      const definition = getExtraPayDefinition(type.code);
      const isBasic = isBasicCode(type.code);
      const fallbackCalculationKind = isBasic
        ? "manual_amount"
        : definition?.calculationKind ?? "manual_amount";

      const taxable =
        row.taxable_for_paye_override === null ||
        row.taxable_for_paye_override === undefined
          ? type.taxableForPaye
          : row.taxable_for_paye_override === true;
      const nic =
        row.nic_earnings_override === null || row.nic_earnings_override === undefined
          ? type.nicEarnings
          : row.nic_earnings_override === true;
      const pensionable =
        row.pensionable_override === null || row.pensionable_override === undefined
          ? type.pensionable
          : row.pensionable_override === true;
      const aeQualifying =
        row.ae_qualifying_override === null ||
        row.ae_qualifying_override === undefined
          ? type.aeQualifying
          : row.ae_qualifying_override === true;

      return {
        id: String(row.id),
        code: type.code,
        name: type.name,
        amount: round2(toNumberSafe(row.amount)),
        calculation_kind: trimOrNull(row.calculation_kind) ?? fallbackCalculationKind,
        units: toNullableNumber(row.units),
        base_rate: toNullableNumber(row.base_rate),
        rate_multiplier: toNullableNumber(row.rate_multiplier),
        calculated_rate: toNullableNumber(row.calculated_rate),
        manual_override: row.manual_override === true,
        override_reason: trimOrNull(row.override_reason),
        description_override: trimOrNull(row.description_override),
        side: type.side,
        taxable_for_paye: taxable,
        nic_earnings: nic,
        pensionable,
        ae_qualifying: aeQualifying,
        is_basic: isBasic,
        is_read_only: isBasic,
      };
    })
    .filter(Boolean);
}

function validatePayloadItems(items: unknown, payRate: PayRateContext) {
  if (!Array.isArray(items)) {
    return { ok: false as const, error: "items must be an array" };
  }

  const out: ValidatedPayloadItem[] = [];
  const seen = new Set<string>();

  for (const raw of items as EditablePayloadItem[]) {
    const code = String(raw?.code ?? "").trim().toUpperCase();
    const descriptionOverride = trimOrNull(raw?.description_override);
    const manualOverride = raw?.manual_override === true;
    const overrideReason = trimOrNull(raw?.override_reason);

    if (!isExtraPayCode(code)) {
      return {
        ok: false as const,
        error: `unsupported pay item code: ${code || "(blank)"}`,
      };
    }

    if (seen.has(code)) {
      return { ok: false as const, error: `duplicate pay item code: ${code}` };
    }

    const definition = getExtraPayDefinition(code);

    if (!definition) {
      return {
        ok: false as const,
        error: `pay item definition not found for ${code}`,
      };
    }

    if (definition.calculationKind === "rate_units") {
      const units = positiveOrNull(raw?.units);
      const multiplier = positiveOrNull(definition.rateMultiplier);
      const requestedBaseRate = positiveOrNull(raw?.base_rate);
      const baseRate = manualOverride ? requestedBaseRate : positiveOrNull(payRate.baseHourlyRate);

      if (units === null) {
        return { ok: false as const, error: `enter hours greater than 0 for ${code}` };
      }

      if (multiplier === null) {
        return { ok: false as const, error: `rate multiplier missing for ${code}` };
      }

      if (baseRate === null) {
        return {
          ok: false as const,
          error: `hourly rate is missing for ${code}. Update the employee or contract payroll file first.`,
        };
      }

      if (manualOverride && !overrideReason) {
        return {
          ok: false as const,
          error: `override reason is required for ${code}`,
        };
      }

      const calculatedRate = round4(baseRate * multiplier);
      const amount = round2(units * calculatedRate);

      if (!(amount > 0)) {
        return { ok: false as const, error: `calculated amount must be greater than 0 for ${code}` };
      }

      seen.add(code);
      out.push({
        code,
        amount,
        calculation_kind: "rate_units",
        units: round4(units),
        base_rate: round4(baseRate),
        rate_multiplier: round4(multiplier),
        calculated_rate: calculatedRate,
        manual_override: manualOverride,
        override_reason: manualOverride ? overrideReason : null,
        description_override: descriptionOverride,
      });
      continue;
    }

    const amount = round2(toNumberSafe(raw?.amount));

    if (!(amount > 0)) {
      return { ok: false as const, error: `amount must be greater than 0 for ${code}` };
    }

    seen.add(code);
    out.push({
      code,
      amount,
      calculation_kind: "manual_amount",
      units: null,
      base_rate: null,
      rate_multiplier: null,
      calculated_rate: null,
      manual_override: false,
      override_reason: null,
      description_override: descriptionOverride,
    });
  }

  return { ok: true as const, items: out };
}

export async function GET(_req: Request, { params }: RouteContext) {
  try {
    const supabase = await createClient();
    const p = await params;

    const runId = String(p?.id ?? "").trim();
    const payrollRunEmployeeId = String(p?.payrollRunEmployeeId ?? "").trim();

    if (!isUuid(runId)) {
      return json(400, { ok: false, error: "invalid run id" });
    }

    if (!isUuid(payrollRunEmployeeId)) {
      return json(400, { ok: false, error: "invalid payroll run employee id" });
    }

    const run = await resolveRun(supabase, runId);
    if (!run) {
      return json(404, { ok: false, error: "payroll run not found" });
    }

    const prep = await resolveRunEmployeeById(supabase, runId, payrollRunEmployeeId);
    if (!prep) {
      return json(404, {
        ok: false,
        error: "payroll run employee row not found for this payroll run",
      });
    }

    const employee = await resolveEmployeeSummary(supabase, prep.employee_id);
    if (!employee) {
      return json(404, { ok: false, error: "employee not found" });
    }

    const payRate = await resolvePayRateContext(supabase, prep);
    const typeMap = await loadElementTypesForCompany(supabase, run.company_id);
    const itemRows = await loadPayItems(supabase, prep.id);

    return json(200, {
      ok: true,
      run: {
        id: run.id,
        status: String(run.status ?? "").trim() || "unknown",
      },
      employee,
      payroll_run_employee_id: prep.id,
      contract_id: prep.contract_id,
      payRate,
      canEdit: canEditRunStatus(run.status),
      availableTypes: buildAvailableTypes(typeMap),
      items: buildItems(itemRows),
    });
  } catch (error: any) {
    return json(statusFromErr(error), {
      ok: false,
      error: error?.message || "failed to load pay items",
    });
  }
}

export async function PUT(req: Request, { params }: RouteContext) {
  try {
    const supabase = await createClient();
    const p = await params;

    const runId = String(p?.id ?? "").trim();
    const payrollRunEmployeeId = String(p?.payrollRunEmployeeId ?? "").trim();

    if (!isUuid(runId)) {
      return json(400, { ok: false, error: "invalid run id" });
    }

    if (!isUuid(payrollRunEmployeeId)) {
      return json(400, { ok: false, error: "invalid payroll run employee id" });
    }

    const run = await resolveRun(supabase, runId);
    if (!run) {
      return json(404, { ok: false, error: "payroll run not found" });
    }

    if (!canEditRunStatus(run.status)) {
      return json(409, {
        ok: false,
        error: "pay items can only be edited while the run is Draft or Processing",
      });
    }

    const prep = await resolveRunEmployeeById(supabase, runId, payrollRunEmployeeId);
    if (!prep) {
      return json(404, {
        ok: false,
        error: "payroll run employee row not found for this payroll run",
      });
    }

    const payRate = await resolvePayRateContext(supabase, prep);
    const body = await req.json().catch(() => null);
    const parsed = validatePayloadItems(body?.items, payRate);

    if (!parsed.ok) {
      return json(400, { ok: false, error: parsed.error });
    }

    const typeMap = await loadElementTypesForCompany(supabase, run.company_id);

    const missingCodes = parsed.items
      .map((item) => item.code)
      .filter((code) => !typeMap.has(code));

    if (missingCodes.length > 0) {
      return json(400, {
        ok: false,
        error: `pay element types missing for: ${missingCodes.join(", ")}`,
      });
    }

    const deleteTypeIds = EXTRA_PAY_CODES
      .map((code) => typeMap.get(code)?.id ?? null)
      .filter(Boolean) as string[];

    if (deleteTypeIds.length > 0) {
      const deleteRes = await supabase
        .from("payroll_run_pay_elements")
        .delete()
        .eq("payroll_run_employee_id", prep.id)
        .in("pay_element_type_id", deleteTypeIds);

      if (deleteRes.error) throw deleteRes.error;
    }

    if (parsed.items.length > 0) {
      const insertPayload = parsed.items.map((item) => {
        const type = typeMap.get(item.code);
        if (!type) {
          throw new Error(`pay element type not found for code ${item.code}`);
        }

        return {
          payroll_run_employee_id: prep.id,
          pay_element_type_id: type.id,
          amount: round2(item.amount),
          calculation_kind: item.calculation_kind,
          units: item.units,
          base_rate: item.base_rate,
          rate_multiplier: item.rate_multiplier,
          calculated_rate: item.calculated_rate,
          manual_override: item.manual_override,
          override_reason: item.override_reason,
          description_override: item.description_override,
          taxable_for_paye_override: null,
          nic_earnings_override: null,
          pensionable_override: null,
          ae_qualifying_override: null,
        };
      });

      const insertRes = await supabase.from("payroll_run_pay_elements").insert(insertPayload);

      if (insertRes.error) throw insertRes.error;
    }

    const refreshedItems = await loadPayItems(supabase, prep.id);

    return json(200, {
      ok: true,
      payroll_run_employee_id: prep.id,
      payRate,
      items: buildItems(refreshedItems),
      message: "Pay items saved. Run calculation to refresh payroll values.",
    });
  } catch (error: any) {
    return json(statusFromErr(error), {
      ok: false,
      error: error?.message || "failed to save pay items",
    });
  }
}