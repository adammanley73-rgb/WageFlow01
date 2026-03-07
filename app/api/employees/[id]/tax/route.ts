// C:\Projects\wageflow01\app\api\employees\[id]\tax\route.ts

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type RouteContext = { params: Promise<{ id: string }> };

type TaxCodeBasis = "cumulative" | "week1_month1";
type NiCategory = "A" | "B" | "C" | "H" | "J" | "M" | "V" | "Z";

const VALID_NI_CATEGORIES: NiCategory[] = ["A", "B", "C", "H", "J", "M", "V", "Z"];

type TaxRow = {
  tax_code: string;
  tax_code_basis: TaxCodeBasis;
  ni_category: NiCategory;
  is_director: boolean;
};

type TaxBody = Partial<TaxRow> & {
  tax_basis?: TaxCodeBasis | string;
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

/**
 * HMRC tax code validation.
 * Accepts:
 * - standard numeric codes: 1257L
 * - Welsh/Scottish prefixed standard codes: C1257L, S1257L
 * - special codes: BR, D0, D1, NT, 0T
 * - Welsh/Scottish variants where valid: CBR, SBR, CD0, SD0, CD1, SD1, C0T, S0T
 * - Scottish starter/rate variants: SD2 to SD8
 * - K codes: K505, CK505, SK505
 */
function isValidTaxCode(v: unknown): boolean {
  const s = String(v ?? "").trim().toUpperCase();
  if (!s) return false;

  return /^(?:NT|(?:[SC]?)(?:K[1-9][0-9]{0,3}|0T|BR|D0|D1|[0-9]+[A-Z]{1,4})|SD[0-8])$/.test(s);
}

function normalizeTaxCodeBasis(v: unknown): TaxCodeBasis {
  const s = String(v ?? "").trim().toLowerCase();

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

function normalizeNiCategory(v: unknown): NiCategory | null {
  const s = String(v ?? "").trim().toUpperCase() as NiCategory;
  return VALID_NI_CATEGORIES.includes(s) ? s : null;
}

function normalizeBoolean(v: unknown): boolean {
  if (v === true || v === "true" || v === "yes" || v === "1" || v === 1) return true;
  return false;
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

function validateTaxBody(body: TaxBody): { ok: boolean; errors: string[]; row: TaxRow } {
  const errors: string[] = [];

  const rawTaxCode = String(body.tax_code ?? "")
    .trim()
    .toUpperCase();

  if (!rawTaxCode) {
    errors.push("tax_code is required.");
  } else if (!isValidTaxCode(rawTaxCode)) {
    errors.push(
      "tax_code is not a recognised HMRC tax code. Examples: 1257L, S1257L, C1257L, BR, D0, D1, NT, K505, SD2."
    );
  }

  const niCategory = normalizeNiCategory(body.ni_category);
  if (!niCategory) {
    errors.push(`ni_category must be one of: ${VALID_NI_CATEGORIES.join(", ")}.`);
  }

  const taxCodeBasis = normalizeTaxCodeBasis(body.tax_code_basis ?? body.tax_basis);

  return {
    ok: errors.length === 0,
    errors,
    row: {
      tax_code: rawTaxCode || "1257L",
      tax_code_basis: taxCodeBasis,
      ni_category: niCategory ?? "A",
      is_director: normalizeBoolean(body.is_director),
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
    const { data, error } = await supabase
      .from("employees")
      .select("tax_code, tax_code_basis, ni_category, is_director")
      .eq("id", employeeKeys.uuid)
      .maybeSingle();

    if (error) {
      if (looksLikeMissingTableOrRls(error)) {
        return new NextResponse(null, { status: 204, headers: { "Cache-Control": "no-store" } });
      }

      return json(500, {
        ok: false,
        error: "LOAD_FAILED",
        message: "Failed to load tax details.",
        ...dbErrPayload(error),
      });
    }

    if (!data) {
      return new NextResponse(null, { status: 204, headers: { "Cache-Control": "no-store" } });
    }

    return json(200, {
      ok: true,
      data: {
        ...data,
        tax_basis: data.tax_code_basis,
      },
    });
  } catch {
    return new NextResponse(null, { status: 204, headers: { "Cache-Control": "no-store" } });
  }
}

export async function POST(req: Request, ctx: RouteContext) {
  if (previewWriteBlocked()) {
    return json(403, { ok: false, error: "employees/tax disabled on preview" });
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

  let body: TaxBody = {};
  try {
    body = (await req.json()) as TaxBody;
  } catch {
    return json(400, { ok: false, error: "BAD_REQUEST", message: "invalid json" });
  }

  const validated = validateTaxBody(body);
  if (!validated.ok) {
    return json(400, {
      ok: false,
      error: "VALIDATION_FAILED",
      message: "Tax details are invalid.",
      details: validated.errors,
    });
  }

  const employeeKeys = await getEmployeeKeys(supabase, routeEmployeeId);
  if (!employeeKeys) {
    return json(404, { ok: false, error: "NOT_FOUND", message: "Employee not found." });
  }

  try {
    const { data: saved, error: updateError } = await supabase
      .from("employees")
      .update({
        tax_code: validated.row.tax_code,
        tax_code_basis: validated.row.tax_code_basis,
        ni_category: validated.row.ni_category,
        is_director: validated.row.is_director,
      })
      .eq("id", employeeKeys.uuid)
      .select("tax_code, tax_code_basis, ni_category, is_director")
      .maybeSingle();

    if (updateError) {
      if (looksLikeMissingTableOrRls(updateError)) {
        return json(500, {
          ok: false,
          error: "DB_WRITE_FAILED",
          message: "Tax columns are unavailable. Run the migration SQL first.",
          ...dbErrPayload(updateError),
        });
      }

      return json(500, {
        ok: false,
        error: "DB_WRITE_FAILED",
        message: "Failed to save tax details.",
        ...dbErrPayload(updateError),
      });
    }

    return json(201, {
      ok: true,
      id: routeEmployeeId,
      data: saved
        ? {
            ...saved,
            tax_basis: saved.tax_code_basis,
          }
        : {
            ...validated.row,
            tax_basis: validated.row.tax_code_basis,
          },
    });
  } catch (e: unknown) {
    return json(500, {
      ok: false,
      error: "DB_WRITE_FAILED",
      message: "Failed to save tax details.",
      ...dbErrPayload(e),
    });
  }
}