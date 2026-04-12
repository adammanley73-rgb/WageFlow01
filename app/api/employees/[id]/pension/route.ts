// C:\Projects\wageflow01\app\api\employees\[id]\pension\route.ts

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type RouteContext = { params: Promise<{ id: string }> };

type ContributionMethod = "relief_at_source" | "net_pay" | "salary_sacrifice";
type EarningsBasis = "qualifying_earnings" | "pensionable_pay" | "basic_pay";

type PensionStatus =
  | "not_assessed"
  | "not_eligible"
  | "eligible"
  | "enrolled"
  | "opted_in"
  | "opted_out"
  | "postponed"
  | "ceased";

type WorkerCategory =
  | "eligible_jobholder"
  | "non_eligible_jobholder"
  | "entitled_worker"
  | "postponed"
  | "unknown";

type PensionRow = {
  pension_enabled: boolean;
  pension_status: PensionStatus;
  pension_scheme_name: string | null;
  pension_reference: string | null;
  pension_contribution_method: ContributionMethod | null;
  pension_earnings_basis: EarningsBasis | null;
  pension_employee_rate: number | null;
  pension_employer_rate: number | null;
  pension_enrolment_date: string | null;
  pension_opt_in_date: string | null;
  pension_opt_out_date: string | null;
  pension_postponement_date: string | null;
  pension_worker_category: WorkerCategory | null;
};

type PensionBody = Partial<PensionRow> & Record<string, unknown>;

type LegacyEmployeePensionRow = Omit<PensionRow, "pension_enabled">;

type ContractPensionRow = PensionRow & {
  id: string;
  contract_number: string | null;
  start_date: string | null;
  created_at: string | null;
};

function json(status: number, body: unknown) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

function previewWriteBlocked() {
  const isPreview = process.env.VERCEL_ENV === "preview";
  const allow = process.env.ALLOW_PREVIEW_WRITES === "1";
  return isPreview && !allow;
}

function looksLikeMissingTableOrRls(err: unknown): boolean {
  const anyErr = err as { code?: unknown; message?: unknown; details?: unknown } | null;
  const code = String(anyErr?.code ?? "").toUpperCase();
  const msg = String(anyErr?.message ?? "").toLowerCase();
  const details = String(anyErr?.details ?? "").toLowerCase();

  if (code === "42P01" || msg.includes("does not exist")) return true;
  if (code === "42501" || msg.includes("permission") || details.includes("permission")) return true;
  if (code.startsWith("PGRST") || msg.includes("schema cache")) return true;

  return false;
}

function isUuid(v: unknown): boolean {
  const s = String(v ?? "").trim();
  if (!s) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(s);
}

function dbErrPayload(err: unknown) {
  const e = err as { message?: unknown; hint?: unknown; code?: unknown; details?: unknown } | null;
  return {
    details: String(e?.message ?? err),
    hint: e?.hint ?? null,
    code: e?.code ?? null,
    dbDetails: e?.details ?? null,
  };
}

function isIsoDateOnly(value: unknown): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(value ?? "").trim());
}

function normalizeNullableString(value: unknown): string | null {
  const s = String(value ?? "").trim();
  return s ? s : null;
}

function normalizeNullableUpperString(value: unknown): string | null {
  const s = String(value ?? "").trim().toUpperCase();
  return s ? s : null;
}

function normalizeContributionMethod(value: unknown): ContributionMethod | null {
  const s = String(value ?? "").trim().toLowerCase();
  if (s === "relief_at_source") return "relief_at_source";
  if (s === "net_pay") return "net_pay";
  if (s === "salary_sacrifice") return "salary_sacrifice";
  return null;
}

function normalizeEarningsBasis(value: unknown): EarningsBasis | null {
  const s = String(value ?? "").trim().toLowerCase();
  if (s === "qualifying_earnings") return "qualifying_earnings";
  if (s === "pensionable_pay") return "pensionable_pay";
  if (s === "basic_pay") return "basic_pay";
  return null;
}

function normalizePensionStatus(value: unknown): PensionStatus {
  const s = String(value ?? "").trim().toLowerCase();
  if (s === "not_eligible") return "not_eligible";
  if (s === "eligible") return "eligible";
  if (s === "enrolled") return "enrolled";
  if (s === "opted_in") return "opted_in";
  if (s === "opted_out") return "opted_out";
  if (s === "postponed") return "postponed";
  if (s === "ceased") return "ceased";
  return "not_assessed";
}

function normalizeWorkerCategory(value: unknown): WorkerCategory | null {
  const s = String(value ?? "").trim().toLowerCase();
  if (s === "eligible_jobholder") return "eligible_jobholder";
  if (s === "non_eligible_jobholder") return "non_eligible_jobholder";
  if (s === "entitled_worker") return "entitled_worker";
  if (s === "postponed") return "postponed";
  if (s === "unknown") return "unknown";
  return null;
}

function normalizeRate(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  return Math.round((n + Number.EPSILON) * 10000) / 10000;
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

function pickPrimaryContract(rows: ContractPensionRow[]): ContractPensionRow | null {
  if (!rows.length) return null;

  const sorted = [...rows].sort((a, b) => {
    const aSuffix = getContractSuffixNumber(a.contract_number);
    const bSuffix = getContractSuffixNumber(b.contract_number);

    if (aSuffix !== null && bSuffix !== null && aSuffix !== bSuffix) {
      return aSuffix - bSuffix;
    }

    if (aSuffix !== null && bSuffix === null) return -1;
    if (aSuffix === null && bSuffix !== null) return 1;

    const aStart = toSortableTime(a.start_date);
    const bStart = toSortableTime(b.start_date);
    if (aStart !== bStart) return aStart - bStart;

    const aCreated = toSortableTime(a.created_at);
    const bCreated = toSortableTime(b.created_at);
    if (aCreated !== bCreated) return aCreated - bCreated;

    return String(a.contract_number || "").localeCompare(String(b.contract_number || ""));
  });

  return sorted[0] ?? null;
}

function hasMeaningfulContractPension(row: ContractPensionRow | null): boolean {
  if (!row) return false;

  return Boolean(
    row.pension_enabled === true ||
      row.pension_scheme_name ||
      row.pension_reference ||
      row.pension_contribution_method ||
      row.pension_earnings_basis ||
      row.pension_employee_rate !== null ||
      row.pension_employer_rate !== null ||
      row.pension_enrolment_date ||
      row.pension_opt_in_date ||
      row.pension_opt_out_date ||
      row.pension_postponement_date ||
      row.pension_worker_category ||
      (row.pension_status && row.pension_status !== "not_assessed")
  );
}

function hasMeaningfulLegacyPension(row: LegacyEmployeePensionRow | null): boolean {
  if (!row) return false;

  return Boolean(
    row.pension_scheme_name ||
      row.pension_reference ||
      row.pension_contribution_method ||
      row.pension_earnings_basis ||
      row.pension_employee_rate !== null ||
      row.pension_employer_rate !== null ||
      row.pension_enrolment_date ||
      row.pension_opt_in_date ||
      row.pension_opt_out_date ||
      row.pension_postponement_date ||
      row.pension_worker_category ||
      (row.pension_status && row.pension_status !== "not_assessed")
  );
}

function derivePensionEnabled(
  explicit: unknown,
  row: Omit<PensionRow, "pension_enabled">
): boolean {
  if (typeof explicit === "boolean") return explicit;

  if (
    row.pension_scheme_name ||
    row.pension_reference ||
    row.pension_contribution_method ||
    row.pension_earnings_basis ||
    row.pension_employee_rate !== null ||
    row.pension_employer_rate !== null ||
    row.pension_enrolment_date ||
    row.pension_opt_in_date ||
    row.pension_opt_out_date ||
    row.pension_postponement_date ||
    row.pension_worker_category
  ) {
    return true;
  }

  if (
    row.pension_status === "eligible" ||
    row.pension_status === "enrolled" ||
    row.pension_status === "opted_in" ||
    row.pension_status === "opted_out" ||
    row.pension_status === "ceased"
  ) {
    return true;
  }

  return false;
}

async function getEmployeeKeys(
  supabase: Awaited<ReturnType<typeof createClient>>,
  routeEmployeeId: string
): Promise<{ uuid: string; company_id: string } | null> {
  const byEmployeeId = await supabase
    .from("employees")
    .select("id, company_id")
    .eq("employee_id", routeEmployeeId)
    .maybeSingle();

  if (byEmployeeId.data) {
    return {
      uuid: String((byEmployeeId.data as { id: string }).id),
      company_id: String((byEmployeeId.data as { company_id: string }).company_id),
    };
  }

  if (isUuid(routeEmployeeId)) {
    const byId = await supabase
      .from("employees")
      .select("id, company_id")
      .eq("id", routeEmployeeId)
      .maybeSingle();

    if (byId.data) {
      return {
        uuid: String((byId.data as { id: string }).id),
        company_id: String((byId.data as { company_id: string }).company_id),
      };
    }
  }

  return null;
}

async function loadLegacyEmployeePension(
  supabase: Awaited<ReturnType<typeof createClient>>,
  employeeUuid: string
): Promise<LegacyEmployeePensionRow | null> {
  const { data, error } = await supabase
    .from("employees")
    .select(
      [
        "pension_status",
        "pension_scheme_name",
        "pension_reference",
        "pension_contribution_method",
        "pension_earnings_basis",
        "pension_employee_rate",
        "pension_employer_rate",
        "pension_enrolment_date",
        "pension_opt_in_date",
        "pension_opt_out_date",
        "pension_postponement_date",
        "pension_worker_category",
      ].join(", ")
    )
    .eq("id", employeeUuid)
    .maybeSingle();

  if (error || !data) return null;

  return {
    pension_status: normalizePensionStatus((data as any).pension_status),
    pension_scheme_name: normalizeNullableString((data as any).pension_scheme_name),
    pension_reference: normalizeNullableUpperString((data as any).pension_reference),
    pension_contribution_method: normalizeContributionMethod((data as any).pension_contribution_method),
    pension_earnings_basis: normalizeEarningsBasis((data as any).pension_earnings_basis),
    pension_employee_rate: normalizeRate((data as any).pension_employee_rate),
    pension_employer_rate: normalizeRate((data as any).pension_employer_rate),
    pension_enrolment_date: normalizeNullableString((data as any).pension_enrolment_date),
    pension_opt_in_date: normalizeNullableString((data as any).pension_opt_in_date),
    pension_opt_out_date: normalizeNullableString((data as any).pension_opt_out_date),
    pension_postponement_date: normalizeNullableString((data as any).pension_postponement_date),
    pension_worker_category: normalizeWorkerCategory((data as any).pension_worker_category),
  };
}

async function loadPrimaryContractPension(
  supabase: Awaited<ReturnType<typeof createClient>>,
  companyId: string,
  employeeUuid: string
): Promise<ContractPensionRow | null> {
  const { data, error } = await supabase
    .from("employee_contracts")
    .select(
      [
        "id",
        "contract_number",
        "start_date",
        "created_at",
        "pension_enabled",
        "pension_status",
        "pension_scheme_name",
        "pension_reference",
        "pension_contribution_method",
        "pension_earnings_basis",
        "pension_employee_rate",
        "pension_employer_rate",
        "pension_worker_category",
        "pension_enrolment_date",
        "pension_opt_in_date",
        "pension_opt_out_date",
        "pension_postponement_date",
      ].join(", ")
    )
    .eq("company_id", companyId)
    .eq("employee_id", employeeUuid);

  if (error || !Array.isArray(data) || data.length === 0) return null;

  const rows: ContractPensionRow[] = data.map((r: any) => ({
    id: String(r?.id ?? "").trim(),
    contract_number: normalizeNullableString(r?.contract_number),
    start_date: normalizeNullableString(r?.start_date),
    created_at: normalizeNullableString(r?.created_at),
    pension_enabled: Boolean(r?.pension_enabled ?? false),
    pension_status: normalizePensionStatus(r?.pension_status),
    pension_scheme_name: normalizeNullableString(r?.pension_scheme_name),
    pension_reference: normalizeNullableUpperString(r?.pension_reference),
    pension_contribution_method: normalizeContributionMethod(r?.pension_contribution_method),
    pension_earnings_basis: normalizeEarningsBasis(r?.pension_earnings_basis),
    pension_employee_rate: normalizeRate(r?.pension_employee_rate),
    pension_employer_rate: normalizeRate(r?.pension_employer_rate),
    pension_worker_category: normalizeWorkerCategory(r?.pension_worker_category),
    pension_enrolment_date: normalizeNullableString(r?.pension_enrolment_date),
    pension_opt_in_date: normalizeNullableString(r?.pension_opt_in_date),
    pension_opt_out_date: normalizeNullableString(r?.pension_opt_out_date),
    pension_postponement_date: normalizeNullableString(r?.pension_postponement_date),
  }));

  return pickPrimaryContract(rows);
}

function validatePensionBody(body: PensionBody): { ok: boolean; errors: string[]; row: PensionRow } {
  const errors: string[] = [];

  const pension_status = normalizePensionStatus(body.pension_status);
  const pension_scheme_name = normalizeNullableString(body.pension_scheme_name);
  const pension_reference = normalizeNullableUpperString(body.pension_reference);
  const pension_contribution_method = normalizeContributionMethod(body.pension_contribution_method);
  const pension_earnings_basis = normalizeEarningsBasis(body.pension_earnings_basis);
  const pension_employee_rate = normalizeRate(body.pension_employee_rate);
  const pension_employer_rate = normalizeRate(body.pension_employer_rate);
  const pension_enrolment_date = normalizeNullableString(body.pension_enrolment_date);
  const pension_opt_in_date = normalizeNullableString(body.pension_opt_in_date);
  const pension_opt_out_date = normalizeNullableString(body.pension_opt_out_date);
  const pension_postponement_date = normalizeNullableString(body.pension_postponement_date);
  const pension_worker_category = normalizeWorkerCategory(body.pension_worker_category);

  const rowWithoutEnabled: Omit<PensionRow, "pension_enabled"> = {
    pension_status,
    pension_scheme_name,
    pension_reference,
    pension_contribution_method,
    pension_earnings_basis,
    pension_employee_rate,
    pension_employer_rate,
    pension_enrolment_date,
    pension_opt_in_date,
    pension_opt_out_date,
    pension_postponement_date,
    pension_worker_category,
  };

  const pension_enabled = derivePensionEnabled(body.pension_enabled, rowWithoutEnabled);

  const requiresSchemeDetails = pension_enabled;

  if (requiresSchemeDetails && !pension_contribution_method) {
    errors.push("pension_contribution_method is required when pension is enabled.");
  }

  if (requiresSchemeDetails && !pension_earnings_basis) {
    errors.push("pension_earnings_basis is required when pension is enabled.");
  }

  if (requiresSchemeDetails && !pension_scheme_name) {
    errors.push("pension_scheme_name is required when pension is enabled.");
  }

  if (pension_employee_rate !== null && (pension_employee_rate < 0 || pension_employee_rate > 100)) {
    errors.push("pension_employee_rate must be between 0 and 100.");
  }

  if (pension_employer_rate !== null && (pension_employer_rate < 0 || pension_employer_rate > 100)) {
    errors.push("pension_employer_rate must be between 0 and 100.");
  }

  if (
    pension_enabled &&
    (pension_status === "enrolled" || pension_status === "opted_in") &&
    !pension_enrolment_date
  ) {
    errors.push("pension_enrolment_date is required for enrolled or opted-in workers.");
  }

  if (pension_enrolment_date && !isIsoDateOnly(pension_enrolment_date)) {
    errors.push("pension_enrolment_date must be a valid YYYY-MM-DD date.");
  }

  if (pension_status === "opted_in" && !pension_opt_in_date) {
    errors.push("pension_opt_in_date is required when pension_status is opted_in.");
  }

  if (pension_opt_in_date && !isIsoDateOnly(pension_opt_in_date)) {
    errors.push("pension_opt_in_date must be a valid YYYY-MM-DD date.");
  }

  if (pension_status === "opted_out" && !pension_opt_out_date) {
    errors.push("pension_opt_out_date is required when pension_status is opted_out.");
  }

  if (pension_opt_out_date && !isIsoDateOnly(pension_opt_out_date)) {
    errors.push("pension_opt_out_date must be a valid YYYY-MM-DD date.");
  }

  if (pension_status === "postponed" && !pension_postponement_date) {
    errors.push("pension_postponement_date is required when pension_status is postponed.");
  }

  if (pension_postponement_date && !isIsoDateOnly(pension_postponement_date)) {
    errors.push("pension_postponement_date must be a valid YYYY-MM-DD date.");
  }

  return {
    ok: errors.length === 0,
    errors,
    row: {
      pension_enabled,
      ...rowWithoutEnabled,
    },
  };
}

export async function GET(_req: Request, ctx: RouteContext) {
  const supabase = await createClient();

  const { data: auth, error: authErr } = await supabase.auth.getUser();
  if (authErr || !auth?.user) {
    return json(401, { ok: false, error: "UNAUTHENTICATED" });
  }

  const params = await ctx.params;
  const routeEmployeeId = String(params?.id ?? "").trim();
  if (!routeEmployeeId) {
    return json(400, { ok: false, error: "BAD_REQUEST", message: "missing employee id" });
  }

  const employeeKeys = await getEmployeeKeys(supabase, routeEmployeeId);
  if (!employeeKeys) {
    return json(404, { ok: false, error: "NOT_FOUND", message: "Employee not found." });
  }

  try {
    const primaryContract = await loadPrimaryContractPension(
      supabase,
      employeeKeys.company_id,
      employeeKeys.uuid
    );

    if (hasMeaningfulContractPension(primaryContract)) {
      return json(200, {
        ok: true,
        data: {
          pension_enabled: primaryContract?.pension_enabled ?? false,
          pension_status: primaryContract?.pension_status ?? "not_assessed",
          pension_scheme_name: primaryContract?.pension_scheme_name ?? null,
          pension_reference: primaryContract?.pension_reference ?? null,
          pension_contribution_method: primaryContract?.pension_contribution_method ?? null,
          pension_earnings_basis: primaryContract?.pension_earnings_basis ?? null,
          pension_employee_rate: primaryContract?.pension_employee_rate ?? null,
          pension_employer_rate: primaryContract?.pension_employer_rate ?? null,
          pension_enrolment_date: primaryContract?.pension_enrolment_date ?? null,
          pension_opt_in_date: primaryContract?.pension_opt_in_date ?? null,
          pension_opt_out_date: primaryContract?.pension_opt_out_date ?? null,
          pension_postponement_date: primaryContract?.pension_postponement_date ?? null,
          pension_worker_category: primaryContract?.pension_worker_category ?? null,
        },
      });
    }

    const legacy = await loadLegacyEmployeePension(supabase, employeeKeys.uuid);

    if (hasMeaningfulLegacyPension(legacy)) {
      return json(200, {
        ok: true,
        data: {
          pension_enabled: derivePensionEnabled(false, legacy!),
          pension_status: legacy?.pension_status ?? "not_assessed",
          pension_scheme_name: legacy?.pension_scheme_name ?? null,
          pension_reference: legacy?.pension_reference ?? null,
          pension_contribution_method: legacy?.pension_contribution_method ?? null,
          pension_earnings_basis: legacy?.pension_earnings_basis ?? null,
          pension_employee_rate: legacy?.pension_employee_rate ?? null,
          pension_employer_rate: legacy?.pension_employer_rate ?? null,
          pension_enrolment_date: legacy?.pension_enrolment_date ?? null,
          pension_opt_in_date: legacy?.pension_opt_in_date ?? null,
          pension_opt_out_date: legacy?.pension_opt_out_date ?? null,
          pension_postponement_date: legacy?.pension_postponement_date ?? null,
          pension_worker_category: legacy?.pension_worker_category ?? null,
        },
      });
    }

    return json(200, {
      ok: true,
      data: {
        pension_enabled: false,
        pension_status: "not_assessed",
        pension_scheme_name: null,
        pension_reference: null,
        pension_contribution_method: null,
        pension_earnings_basis: null,
        pension_employee_rate: null,
        pension_employer_rate: null,
        pension_enrolment_date: null,
        pension_opt_in_date: null,
        pension_opt_out_date: null,
        pension_postponement_date: null,
        pension_worker_category: null,
      },
    });
  } catch (error) {
    if (looksLikeMissingTableOrRls(error)) {
      return new NextResponse(null, { status: 204, headers: { "Cache-Control": "no-store" } });
    }

    return json(500, {
      ok: false,
      error: "LOAD_FAILED",
      message: "Failed to load pension details.",
      ...dbErrPayload(error),
    });
  }
}

export async function POST(req: Request, ctx: RouteContext) {
  if (previewWriteBlocked()) {
    return json(403, { ok: false, error: "employees/pension disabled on preview" });
  }

  const supabase = await createClient();

  const { data: auth, error: authErr } = await supabase.auth.getUser();
  if (authErr || !auth?.user) {
    return json(401, { ok: false, error: "UNAUTHENTICATED" });
  }

  const params = await ctx.params;
  const routeEmployeeId = String(params?.id ?? "").trim();
  if (!routeEmployeeId) {
    return json(400, { ok: false, error: "BAD_REQUEST", message: "missing employee id" });
  }

  let body: PensionBody = {};
  try {
    body = (await req.json()) as PensionBody;
  } catch {
    return json(400, { ok: false, error: "BAD_REQUEST", message: "invalid json" });
  }

  const validated = validatePensionBody(body);
  if (!validated.ok) {
    return json(400, {
      ok: false,
      error: "VALIDATION_FAILED",
      message: "Pension details are invalid.",
      details: validated.errors,
    });
  }

  const employeeKeys = await getEmployeeKeys(supabase, routeEmployeeId);
  if (!employeeKeys) {
    return json(404, { ok: false, error: "NOT_FOUND", message: "Employee not found." });
  }

  try {
    const primaryContract = await loadPrimaryContractPension(
      supabase,
      employeeKeys.company_id,
      employeeKeys.uuid
    );

    if (primaryContract?.id) {
      const { error: contractUpdateError } = await supabase
        .from("employee_contracts")
        .update({
          pension_enabled: validated.row.pension_enabled,
          pension_status: validated.row.pension_status,
          pension_scheme_name: validated.row.pension_scheme_name,
          pension_reference: validated.row.pension_reference,
          pension_contribution_method: validated.row.pension_contribution_method,
          pension_earnings_basis: validated.row.pension_earnings_basis,
          pension_employee_rate: validated.row.pension_employee_rate,
          pension_employer_rate: validated.row.pension_employer_rate,
          pension_enrolment_date: validated.row.pension_enrolment_date,
          pension_opt_in_date: validated.row.pension_opt_in_date,
          pension_opt_out_date: validated.row.pension_opt_out_date,
          pension_postponement_date: validated.row.pension_postponement_date,
          pension_worker_category: validated.row.pension_worker_category,
        })
        .eq("id", primaryContract.id);

      if (contractUpdateError) {
        return json(500, {
          ok: false,
          error: "DB_WRITE_FAILED",
          message: "Failed to save pension details to the primary contract.",
          ...dbErrPayload(contractUpdateError),
        });
      }
    }

    const { data: saved, error: employeeUpdateError } = await supabase
      .from("employees")
      .update({
        pension_status: validated.row.pension_status,
        pension_scheme_name: validated.row.pension_scheme_name,
        pension_reference: validated.row.pension_reference,
        pension_contribution_method: validated.row.pension_contribution_method,
        pension_earnings_basis: validated.row.pension_earnings_basis,
        pension_employee_rate: validated.row.pension_employee_rate,
        pension_employer_rate: validated.row.pension_employer_rate,
        pension_enrolment_date: validated.row.pension_enrolment_date,
        pension_opt_in_date: validated.row.pension_opt_in_date,
        pension_opt_out_date: validated.row.pension_opt_out_date,
        pension_postponement_date: validated.row.pension_postponement_date,
        pension_worker_category: validated.row.pension_worker_category,
      })
      .eq("id", employeeKeys.uuid)
      .select(
        [
          "pension_status",
          "pension_scheme_name",
          "pension_reference",
          "pension_contribution_method",
          "pension_earnings_basis",
          "pension_employee_rate",
          "pension_employer_rate",
          "pension_enrolment_date",
          "pension_opt_in_date",
          "pension_opt_out_date",
          "pension_postponement_date",
          "pension_worker_category",
        ].join(", ")
      )
      .maybeSingle();

    if (employeeUpdateError) {
      return json(500, {
        ok: false,
        error: "DB_WRITE_FAILED",
        message: "Failed to save pension details.",
        ...dbErrPayload(employeeUpdateError),
      });
    }

    return json(201, {
      ok: true,
      id: routeEmployeeId,
      data: {
        pension_enabled: validated.row.pension_enabled,
        pension_status: validated.row.pension_status,
        pension_scheme_name: validated.row.pension_scheme_name,
        pension_reference: validated.row.pension_reference,
        pension_contribution_method: validated.row.pension_contribution_method,
        pension_earnings_basis: validated.row.pension_earnings_basis,
        pension_employee_rate: validated.row.pension_employee_rate,
        pension_employer_rate: validated.row.pension_employer_rate,
        pension_enrolment_date: validated.row.pension_enrolment_date,
        pension_opt_in_date: validated.row.pension_opt_in_date,
        pension_opt_out_date: validated.row.pension_opt_out_date,
        pension_postponement_date: validated.row.pension_postponement_date,
        pension_worker_category: validated.row.pension_worker_category,
        legacy_employee_saved: saved ?? null,
        primary_contract_id: primaryContract?.id ?? null,
        primary_contract_number: primaryContract?.contract_number ?? null,
      },
    });
  } catch (e: unknown) {
    return json(500, {
      ok: false,
      error: "DB_WRITE_FAILED",
      message: "Failed to save pension details.",
      ...dbErrPayload(e),
    });
  }
}