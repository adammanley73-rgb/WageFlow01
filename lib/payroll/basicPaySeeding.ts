const WEEKS_PER_YEAR = 52.14285714;

export type BasicPaySeedRunRow = {
  run_kind?: unknown;
  kind?: unknown;
  parent_run_id?: unknown;
  parentRunId?: unknown;
  [key: string]: unknown;
};

export type BasicPaySeedContractRow = {
  contract_id?: unknown;
  contract_pay_frequency?: unknown;
  contract_pay_basis?: unknown;
  contract_annual_salary?: unknown;
  contract_hourly_rate?: unknown;
  contract_hours_per_week?: unknown;
  [key: string]: unknown;
};

export type AttachedSeedRow = {
  id: string;
  employee_id: string;
  contract_id: string;
};

type SeedInitialBasicPayElementsArgs = {
  supabase: any;
  runRow: BasicPaySeedRunRow;
  companyId: string;
  runFrequency: string;
  insertedRows: AttachedSeedRow[];
  contractById: Map<string, BasicPaySeedContractRow>;
};

type SeedInitialBasicPayElementsResult =
  | { ok: true; seededCount: number; skippedCount: number }
  | { ok: false; error: string; details?: string };

function pickFirst(...values: unknown[]): string | null {
  for (const v of values) {
    if (v == null) continue;
    const s = String(v).trim();
    if (!s) continue;
    return s;
  }

  return null;
}

function normalizeFrequency(v: unknown): string {
  const s = String(v ?? "").trim().toLowerCase();
  if (!s) return "";
  if (s === "4weekly" || s === "fourweekly" || s === "four-weekly") return "four_weekly";
  return s;
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

export function isSupplementaryRun(runRow: BasicPaySeedRunRow): boolean {
  const runKindRaw = String(pickFirst(runRow.run_kind, runRow.kind, "") ?? "").trim().toLowerCase();
  const parentRunId = String(pickFirst(runRow.parent_run_id, runRow.parentRunId, "") ?? "").trim();
  return runKindRaw === "supplementary" || Boolean(parentRunId);
}

export function computeInitialBasicAmount(row: BasicPaySeedContractRow, frequency: string): number {
  const payBasis = String(pickFirst(row.contract_pay_basis, "") ?? "")
    .trim()
    .toLowerCase();

  const isSalary = payBasis === "salary" || payBasis === "salaried";
  const isHourly = payBasis === "hourly";

  if (!isSalary && !isHourly) return 0;

  const annualSalary = getNumber(row.contract_annual_salary);
  const hourlyRate = getNumber(row.contract_hourly_rate);
  const hoursPerWeek = getNumber(row.contract_hours_per_week);

  let weeklyAmount = 0;

  if (isSalary && annualSalary !== null && annualSalary > 0) {
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
    if (isSalary && annualSalary !== null && annualSalary > 0) return round2(annualSalary / 12);
    return round2((weeklyAmount * WEEKS_PER_YEAR) / 12);
  }

  return 0;
}

export async function loadBasicPayElementTypeId(supabase: any, companyId: string): Promise<string | null> {
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

export async function loadInsertedRunEmployeeRows(
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

export async function seedInitialBasicPayElements(
  args: SeedInitialBasicPayElementsArgs
): Promise<SeedInitialBasicPayElementsResult> {
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