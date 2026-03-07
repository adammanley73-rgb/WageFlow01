// C:\Projects\wageflow01\app\api\employees\[id]\starter\route.ts

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type RouteContext = { params: Promise<{ id: string }> };

type StarterDeclaration = "A" | "B" | "C" | null;
type StudentLoanPlan = "none" | "plan1" | "plan2" | "plan4" | "plan5" | null;

type StarterRow = {
  employee_id: string;   // references employees.id (UUID primary key)
  company_id: string;
  p45_provided: boolean | null;
  starter_declaration: StarterDeclaration;
  student_loan_plan: StudentLoanPlan;
  postgraduate_loan: boolean | null;
};

type StarterBody = Partial<StarterRow> & Record<string, unknown>;

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

function normalizeDeclaration(v: unknown): StarterDeclaration {
  const s = String(v ?? "").trim().toUpperCase();
  if (s === "A" || s === "B" || s === "C") return s;
  return null;
}

function normalizeLoanPlan(v: unknown): StudentLoanPlan {
  const s = String(v ?? "").trim().toLowerCase();
  if (!s) return null;
  if (s === "none") return "none";
  if (s === "plan1" || s === "plan_1" || s === "1") return "plan1";
  if (s === "plan2" || s === "plan_2" || s === "2") return "plan2";
  if (s === "plan4" || s === "plan_4" || s === "4") return "plan4";
  if (s === "plan5" || s === "plan_5" || s === "5") return "plan5";
  return null;
}

function normalizeBoolean(v: unknown): boolean | null {
  if (typeof v === "boolean") return v;
  if (v === "true" || v === "yes" || v === "1") return true;
  if (v === "false" || v === "no" || v === "0") return false;
  return null;
}

function hasOwn(obj: Record<string, unknown>, key: string) {
  return Object.prototype.hasOwnProperty.call(obj, key);
}

function validateStarterBody(body: StarterBody) {
  const p45Provided = normalizeBoolean(body.p45_provided);
  const starterDeclaration = normalizeDeclaration(body.starter_declaration);
  const studentLoanPlan = normalizeLoanPlan(body.student_loan_plan);
  const postgraduateLoan = normalizeBoolean(body.postgraduate_loan);

  const declarationWasSent = hasOwn(body, "starter_declaration");
  const loanPlanWasSent = hasOwn(body, "student_loan_plan");
  const pglWasSent = hasOwn(body, "postgraduate_loan");

  const errors: string[] = [];

  if (p45Provided === null) {
    errors.push("p45_provided must be provided as true or false.");
  }

  if (declarationWasSent) {
    const rawDeclaration = String(body.starter_declaration ?? "").trim();
    if (!rawDeclaration) {
      errors.push("starter_declaration cannot be blank when provided.");
    } else if (starterDeclaration === null) {
      errors.push('starter_declaration must be one of "A", "B", or "C".');
    }
  }

  if (loanPlanWasSent) {
    const rawLoanPlan = String(body.student_loan_plan ?? "").trim();
    if (!rawLoanPlan) {
      errors.push("student_loan_plan cannot be blank when provided.");
    } else if (studentLoanPlan === null) {
      errors.push('student_loan_plan must be one of "none", "plan1", "plan2", "plan4", or "plan5".');
    }
  }

  if (pglWasSent && postgraduateLoan === null) {
    errors.push("postgraduate_loan must be true or false when provided.");
  }

  const declarationFlowSubmitted =
    p45Provided === false && (declarationWasSent || loanPlanWasSent || pglWasSent);

  if (declarationFlowSubmitted) {
    if (starterDeclaration === null) {
      errors.push("starter_declaration is required when p45_provided is false.");
    }
    if (studentLoanPlan === null) {
      errors.push("student_loan_plan is required when p45_provided is false.");
    }
    if (postgraduateLoan === null) {
      errors.push("postgraduate_loan is required when p45_provided is false.");
    }
  }

  return {
    ok: errors.length === 0,
    errors,
    row: {
      p45_provided: p45Provided,
      starter_declaration: p45Provided === true ? null : declarationWasSent ? starterDeclaration : null,
      student_loan_plan: loanPlanWasSent ? studentLoanPlan : null,
      postgraduate_loan: pglWasSent ? postgraduateLoan : null,
    },
  };
}

// FIX: Return employees.id (UUID primary key) as the FK value for employee_starters.
// The trigger employee_starters_set_company_id does: WHERE e.id = new.employee_id
// which means employee_starters.employee_id must hold employees.id, not employees.employee_id.
async function getEmployeeKeys(
  supabase: Awaited<ReturnType<typeof createClient>>,
  routeEmployeeId: string
): Promise<{ uuid: string; company_id: string } | null> {
  // Try matching employees.employee_id first (the human-readable string field).
  const byEmployeeId = await supabase
    .from("employees")
    .select("id, company_id")
    .eq("employee_id", routeEmployeeId)
    .maybeSingle();

  if (byEmployeeId.data) {
    return {
      uuid: String((byEmployeeId.data as any).id),
      company_id: String((byEmployeeId.data as any).company_id),
    };
  }

  // Fall back to matching employees.id (UUID primary key) directly.
  if (isUuid(routeEmployeeId)) {
    const byId = await supabase
      .from("employees")
      .select("id, company_id")
      .eq("id", routeEmployeeId)
      .maybeSingle();

    if (byId.data) {
      return {
        uuid: String((byId.data as any).id),
        company_id: String((byId.data as any).company_id),
      };
    }
  }

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
      .from("employee_starters")
      .select("*")
      .eq("employee_id", employeeKeys.uuid)
      .maybeSingle();

    if (error) {
      if (looksLikeMissingTableOrRls(error)) {
        return new NextResponse(null, { status: 204, headers: { "Cache-Control": "no-store" } });
      }
      return json(500, {
        ok: false,
        error: "LOAD_FAILED",
        message: "Failed to load starter details.",
        ...dbErrPayload(error),
      });
    }

    if (!data) {
      return new NextResponse(null, { status: 204, headers: { "Cache-Control": "no-store" } });
    }

    return json(200, { ok: true, data });
  } catch {
    return new NextResponse(null, { status: 204, headers: { "Cache-Control": "no-store" } });
  }
}

export async function POST(req: Request, ctx: RouteContext) {
  if (previewWriteBlocked()) {
    return json(403, { ok: false, error: "employees/starter disabled on preview" });
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

  let body: StarterBody = {};
  try {
    body = (await req.json()) as StarterBody;
  } catch {
    return json(400, { ok: false, error: "BAD_REQUEST", message: "invalid json" });
  }

  const validated = validateStarterBody(body);
  if (!validated.ok) {
    return json(400, {
      ok: false,
      error: "VALIDATION_FAILED",
      message: "Starter details are invalid.",
      details: validated.errors,
    });
  }

  const employeeKeys = await getEmployeeKeys(supabase, routeEmployeeId);
  if (!employeeKeys) {
    return json(404, { ok: false, error: "NOT_FOUND", message: "Employee not found." });
  }

  // Load existing starter row using the correct FK (employees.id UUID).
  const { data: existing, error: existingError } = await supabase
    .from("employee_starters")
    .select("*")
    .eq("employee_id", employeeKeys.uuid)
    .maybeSingle();

  if (existingError && !looksLikeMissingTableOrRls(existingError)) {
    return json(500, {
      ok: false,
      error: "LOAD_FAILED",
      message: "Failed to load existing starter details.",
      ...dbErrPayload(existingError),
    });
  }

  const existingRow = (existing ?? {}) as Partial<StarterRow>;

  const row: StarterRow = {
    employee_id: employeeKeys.uuid,   // employees.id UUID - correct FK
    company_id: employeeKeys.company_id,
    p45_provided: validated.row.p45_provided,
    starter_declaration:
      validated.row.starter_declaration !== null
        ? validated.row.starter_declaration
        : existingRow.starter_declaration ?? null,
    student_loan_plan:
      validated.row.student_loan_plan !== null
        ? validated.row.student_loan_plan
        : existingRow.student_loan_plan ?? null,
    postgraduate_loan:
      validated.row.postgraduate_loan !== null
        ? validated.row.postgraduate_loan
        : existingRow.postgraduate_loan ?? null,
  };

  if (row.p45_provided === true) {
    row.starter_declaration = null;
    row.student_loan_plan = null;
    row.postgraduate_loan = null;
  }

  try {
    let writeError: unknown = null;

    if (existing) {
      const { error } = await supabase
        .from("employee_starters")
        .update({
          company_id: row.company_id,
          p45_provided: row.p45_provided,
          starter_declaration: row.starter_declaration,
          student_loan_plan: row.student_loan_plan,
          postgraduate_loan: row.postgraduate_loan,
        })
        .eq("employee_id", employeeKeys.uuid);

      writeError = error ?? null;
    } else {
      const { error: insertError } = await supabase
        .from("employee_starters")
        .insert(row);

      const pgCode = String((insertError as any)?.code ?? "");
      if (pgCode === "23505") {
        const { error: updateError } = await supabase
          .from("employee_starters")
          .update({
            company_id: row.company_id,
            p45_provided: row.p45_provided,
            starter_declaration: row.starter_declaration,
            student_loan_plan: row.student_loan_plan,
            postgraduate_loan: row.postgraduate_loan,
          })
          .eq("employee_id", employeeKeys.uuid);

        writeError = updateError ?? null;
      } else {
        writeError = insertError ?? null;
      }
    }

    if (writeError) {
      if (looksLikeMissingTableOrRls(writeError)) {
        return json(500, {
          ok: false,
          error: "DB_WRITE_FAILED",
          message: "Starter details table is unavailable for writing.",
          ...dbErrPayload(writeError),
        });
      }

      return json(500, {
        ok: false,
        error: "DB_WRITE_FAILED",
        message: "Failed to save starter details.",
        ...dbErrPayload(writeError),
      });
    }

    const { data: saved } = await supabase
      .from("employee_starters")
      .select("*")
      .eq("employee_id", employeeKeys.uuid)
      .maybeSingle();

    return json(201, {
      ok: true,
      id: routeEmployeeId,
      data: saved ?? row,
    });
  } catch (e: unknown) {
    return json(500, {
      ok: false,
      error: "DB_WRITE_FAILED",
      message: "Failed to save starter details.",
      ...dbErrPayload(e),
    });
  }
}
