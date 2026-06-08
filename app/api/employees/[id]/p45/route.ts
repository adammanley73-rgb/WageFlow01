import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type RouteContext = { params: Promise<{ id: string }> };

type TaxCodeBasis = "cumulative" | "week1_month1" | null;
type P45TaxBasisDb = "Cumulative" | "Week1Month1" | null;

type EmployeeKeys = {
  uuid: string;
  legacy_employee_id: string | null;
  company_id: string;
  start_date: string | null;
  hire_date: string | null;
};

type P45DbRow = {
  employee_id: string;
  employer_paye_ref: string | null;
  employer_name: string | null;
  works_number: string | null;
  leaving_date: string | null;
  tax_code: string | null;
  tax_basis: P45TaxBasisDb;
  total_pay_to_date: number | null;
  total_tax_to_date: number | null;
  had_student_loan_deductions: boolean | null;
  student_loan_details?: string | null;
  previous_employer_paye_ref?: string | null;
};

type P45Body = {
  employer_paye_ref?: unknown;
  employer_name?: unknown;
  works_number?: unknown;
  leaving_date?: unknown;
  tax_code?: unknown;
  tax_code_basis?: unknown;
  tax_basis?: unknown;
  total_pay_to_date?: unknown;
  total_tax_to_date?: unknown;
  had_student_loan_deductions?: unknown;
  student_loan_details?: unknown;
  previous_employer_paye_ref?: unknown;
} & Record<string, unknown>;

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

function isUuid(v: unknown): boolean {
  const s = String(v ?? "").trim();
  if (!s) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(s);
}

function isIsoDate(v: unknown): boolean {
  return typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v.trim());
}

function toIsoDateOnly(v: unknown): string | null {
  const s = String(v ?? "").trim();
  if (!s) return null;
  if (isIsoDate(s)) return s;

  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return null;

  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");

  return `${yyyy}-${mm}-${dd}`;
}

function safeNumber(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;

  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function normalizeText(v: unknown): string | null {
  const s = String(v ?? "").trim();
  return s ? s : null;
}

function normalizeTaxCode(v: unknown): string | null {
  const s = String(v ?? "").trim().toUpperCase();
  return s ? s : null;
}

function normalizeTaxCodeBasis(v: unknown): TaxCodeBasis {
  const s = String(v ?? "").trim().toLowerCase();
  if (!s) return null;

  if (s === "cumulative") return "cumulative";

  if (
    s === "week1_month1" ||
    s === "week1month1" ||
    s === "w1m1" ||
    s === "wk1/mth1" ||
    s === "wk1mth1" ||
    s === "week1" ||
    s === "month1" ||
    s === "week 1 / month 1" ||
    s === "week 1 month 1"
  ) {
    return "week1_month1";
  }

  return null;
}

function toP45DbTaxBasis(v: TaxCodeBasis): P45TaxBasisDb {
  if (v === "cumulative") return "Cumulative";
  if (v === "week1_month1") return "Week1Month1";
  return null;
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

async function getEmployeeKeys(
  supabase: Awaited<ReturnType<typeof createClient>>,
  routeEmployeeId: string
): Promise<EmployeeKeys | null> {
  const selectCols = "id, employee_id, company_id, start_date, hire_date";

  const byLegacyId = await supabase
    .from("employees")
    .select(selectCols)
    .eq("employee_id", routeEmployeeId)
    .maybeSingle();

  if (byLegacyId.data) {
    const row = byLegacyId.data as Record<string, unknown>;

    return {
      uuid: String(row.id),
      legacy_employee_id: row.employee_id ? String(row.employee_id) : null,
      company_id: String(row.company_id),
      start_date: row.start_date ? String(row.start_date) : null,
      hire_date: row.hire_date ? String(row.hire_date) : null,
    };
  }

  if (!isUuid(routeEmployeeId)) return null;

  const byPrimaryId = await supabase
    .from("employees")
    .select(selectCols)
    .eq("id", routeEmployeeId)
    .maybeSingle();

  if (byPrimaryId.data) {
    const row = byPrimaryId.data as Record<string, unknown>;

    return {
      uuid: String(row.id),
      legacy_employee_id: row.employee_id ? String(row.employee_id) : null,
      company_id: String(row.company_id),
      start_date: row.start_date ? String(row.start_date) : null,
      hire_date: row.hire_date ? String(row.hire_date) : null,
    };
  }

  return null;
}

function toClientP45Row(row: Record<string, unknown> | null, employeeKeys: EmployeeKeys) {
  if (!row) return null;

  const taxBasis = normalizeTaxCodeBasis(row.tax_basis);

  return {
    ...row,
    tax_basis: taxBasis,
    tax_code_basis: taxBasis,
    employee_start_date: employeeKeys.start_date,
    employee_hire_date: employeeKeys.hire_date,
  };
}

function employeePayload(employeeKeys: EmployeeKeys) {
  return {
    id: employeeKeys.uuid,
    employee_id: employeeKeys.legacy_employee_id,
    company_id: employeeKeys.company_id,
    start_date: employeeKeys.start_date,
    hire_date: employeeKeys.hire_date,
  };
}

export async function GET(_req: Request, ctx: RouteContext) {
  const supabase = await createClient();

  const { data: auth, error: authErr } = await supabase.auth.getUser();
  if (authErr || !auth?.user) {
    return json(401, { ok: false, error: "UNAUTHENTICATED", message: "Sign in required." });
  }

  const params = await ctx.params;
  const routeEmployeeId = String(params?.id ?? "").trim();

  if (!routeEmployeeId) {
    return json(400, { ok: false, error: "BAD_REQUEST", message: "Missing employee id." });
  }

  const employeeKeys = await getEmployeeKeys(supabase, routeEmployeeId);

  if (!employeeKeys) {
    return json(404, { ok: false, error: "NOT_FOUND", message: "Employee not found." });
  }

  try {
    const { data, error } = await supabase
      .from("employee_p45")
      .select("*")
      .eq("employee_id", employeeKeys.uuid)
      .maybeSingle();

    if (error) {
      if (looksLikeMissingTableOrRls(error)) {
        return json(500, {
          ok: false,
          error: "LOAD_FAILED",
          message: "P45 table is unavailable or blocked by database permissions.",
          ...dbErrPayload(error),
        });
      }

      return json(500, {
        ok: false,
        error: "LOAD_FAILED",
        message: "Failed to load P45 data.",
        ...dbErrPayload(error),
      });
    }

    return json(200, {
      ok: true,
      id: routeEmployeeId,
      employee: employeePayload(employeeKeys),
      employee_start_date: employeeKeys.start_date,
      employee_hire_date: employeeKeys.hire_date,
      data: toClientP45Row((data ?? null) as Record<string, unknown> | null, employeeKeys),
    });
  } catch (e: unknown) {
    return json(500, {
      ok: false,
      error: "LOAD_FAILED",
      message: "Failed to load P45 data.",
      ...dbErrPayload(e),
    });
  }
}

export async function POST(req: Request, ctx: RouteContext) {
  if (previewWriteBlocked()) {
    return json(403, { ok: false, error: "employees/p45 disabled on preview" });
  }

  const supabase = await createClient();

  const { data: auth, error: authErr } = await supabase.auth.getUser();
  if (authErr || !auth?.user) {
    return json(401, { ok: false, error: "UNAUTHENTICATED", message: "Sign in required." });
  }

  const params = await ctx.params;
  const routeEmployeeId = String(params?.id ?? "").trim();

  if (!routeEmployeeId) {
    return json(400, { ok: false, error: "BAD_REQUEST", message: "Missing employee id." });
  }

  let body: P45Body = {};

  try {
    body = (await req.json()) as P45Body;
  } catch {
    return json(400, { ok: false, error: "BAD_REQUEST", message: "Invalid JSON." });
  }

  const employeeKeys = await getEmployeeKeys(supabase, routeEmployeeId);

  if (!employeeKeys) {
    return json(404, { ok: false, error: "NOT_FOUND", message: "Employee not found." });
  }

  const normalizedTaxBasis = normalizeTaxCodeBasis(body.tax_basis ?? body.tax_code_basis);
  const p45TaxBasis = toP45DbTaxBasis(normalizedTaxBasis);

  const row: P45DbRow = {
    employee_id: employeeKeys.uuid,
    employer_paye_ref: normalizeText(body.employer_paye_ref),
    employer_name: normalizeText(body.employer_name),
    works_number: normalizeText(body.works_number),
    leaving_date: toIsoDateOnly(body.leaving_date),
    tax_code: normalizeTaxCode(body.tax_code),
    tax_basis: p45TaxBasis,
    total_pay_to_date: safeNumber(body.total_pay_to_date),
    total_tax_to_date: safeNumber(body.total_tax_to_date),
    had_student_loan_deductions:
      typeof body.had_student_loan_deductions === "boolean" ? body.had_student_loan_deductions : null,
    student_loan_details: normalizeText(body.student_loan_details),
    previous_employer_paye_ref: normalizeText(body.previous_employer_paye_ref),
  };

  if (!row.tax_code) {
    return json(400, {
      ok: false,
      error: "VALIDATION_FAILED",
      message: "P45 tax code is required.",
    });
  }

  if (!row.tax_basis) {
    return json(400, {
      ok: false,
      error: "VALIDATION_FAILED",
      message: "P45 tax basis is required.",
    });
  }

  if (row.total_pay_to_date === null || row.total_pay_to_date < 0) {
    return json(400, {
      ok: false,
      error: "VALIDATION_FAILED",
      message: "P45 total pay to date is required and cannot be negative.",
    });
  }

  if (row.total_tax_to_date === null || row.total_tax_to_date < 0) {
    return json(400, {
      ok: false,
      error: "VALIDATION_FAILED",
      message: "P45 total tax to date is required and cannot be negative.",
    });
  }

  try {
    const { data: existing, error: existingError } = await supabase
      .from("employee_p45")
      .select("employee_id")
      .eq("employee_id", employeeKeys.uuid)
      .maybeSingle();

    if (existingError && !looksLikeMissingTableOrRls(existingError)) {
      return json(500, {
        ok: false,
        error: "LOAD_FAILED",
        message: "Failed to check existing P45 data.",
        ...dbErrPayload(existingError),
      });
    }

    if (existing) {
      const { error: updateError } = await supabase
        .from("employee_p45")
        .update({
          employer_paye_ref: row.employer_paye_ref,
          employer_name: row.employer_name,
          works_number: row.works_number,
          leaving_date: row.leaving_date,
          tax_code: row.tax_code,
          tax_basis: row.tax_basis,
          total_pay_to_date: row.total_pay_to_date,
          total_tax_to_date: row.total_tax_to_date,
          had_student_loan_deductions: row.had_student_loan_deductions,
          student_loan_details: row.student_loan_details ?? null,
          previous_employer_paye_ref: row.previous_employer_paye_ref ?? null,
        })
        .eq("employee_id", employeeKeys.uuid);

      if (updateError) {
        return json(500, {
          ok: false,
          error: "DB_WRITE_FAILED",
          message: "Failed to update P45 details.",
          ...dbErrPayload(updateError),
        });
      }
    } else {
      const { error: insertError } = await supabase.from("employee_p45").insert(row);

      if (insertError) {
        return json(500, {
          ok: false,
          error: "DB_WRITE_FAILED",
          message: "Failed to save P45 details.",
          ...dbErrPayload(insertError),
        });
      }
    }

    const { error: employeeUpdateError } = await supabase
      .from("employees")
      .update({
        tax_code: row.tax_code,
        tax_code_basis: normalizedTaxBasis,
      })
      .eq("id", employeeKeys.uuid);

    if (employeeUpdateError) {
      return json(500, {
        ok: false,
        error: "EMPLOYEE_SYNC_FAILED",
        message: "P45 details were saved, but syncing employee tax settings failed.",
        ...dbErrPayload(employeeUpdateError),
      });
    }

    const { data: saved, error: savedError } = await supabase
      .from("employee_p45")
      .select("*")
      .eq("employee_id", employeeKeys.uuid)
      .maybeSingle();

    if (savedError) {
      return json(500, {
        ok: false,
        error: "LOAD_FAILED",
        message: "P45 details were saved, but reloading them failed.",
        ...dbErrPayload(savedError),
      });
    }

    return json(201, {
      ok: true,
      id: routeEmployeeId,
      employee: employeePayload(employeeKeys),
      employee_start_date: employeeKeys.start_date,
      employee_hire_date: employeeKeys.hire_date,
      data: toClientP45Row((saved ?? row) as Record<string, unknown>, employeeKeys),
    });
  } catch (e: unknown) {
    return json(500, {
      ok: false,
      error: "DB_WRITE_FAILED",
      message: "Failed to save P45 details.",
      ...dbErrPayload(e),
    });
  }
}