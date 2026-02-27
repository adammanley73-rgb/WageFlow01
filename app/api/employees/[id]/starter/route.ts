// C:\Projects\wageflow01\app\api\employees\[id]\starter\route.ts

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type RouteContext = { params: Promise<{ id: string }> };

type StarterDeclaration = "A" | "B" | "C" | null;
type StudentLoanPlan = "none" | "plan1" | "plan2" | "plan4" | "plan5" | null;

type StarterRow = {
  employee_id: string;
  p45_provided: boolean | null;
  starter_declaration: StarterDeclaration;
  student_loan_plan: StudentLoanPlan;
  postgraduate_loan: boolean | null;
};

type StarterBody = Partial<StarterRow> & Record<string, unknown>;

// Only block writes on real preview builds unless explicitly allowed.
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

export async function GET(_req: Request, ctx: RouteContext) {
  const supabase = await createClient();

  const { data: auth, error: authErr } = await supabase.auth.getUser();
  if (authErr || !auth?.user) {
    return NextResponse.json({ ok: false, error: "UNAUTHENTICATED" }, { status: 401 });
  }

  const params = await ctx.params;
  const employeeId = String(params?.id ?? "").trim();
  if (!employeeId) {
    return NextResponse.json({ ok: false, error: "BAD_REQUEST", message: "missing employee id" }, { status: 400 });
  }

  try {
    const { data, error } = await supabase.from("employee_starters").select("*").eq("employee_id", employeeId).maybeSingle();

    if (error) {
      if (looksLikeMissingTableOrRls(error)) return new NextResponse(null, { status: 204 });
      return NextResponse.json(
        { ok: false, error: "LOAD_FAILED", message: "Failed to load starter details.", details: error.message },
        { status: 500 }
      );
    }

    if (!data) return new NextResponse(null, { status: 204 });

    return NextResponse.json({ ok: true, data }, { status: 200 });
  } catch {
    return new NextResponse(null, { status: 204 });
  }
}

export async function POST(req: Request, ctx: RouteContext) {
  if (previewWriteBlocked()) {
    return NextResponse.json({ ok: false, error: "employees/starter disabled on preview" }, { status: 403 });
  }

  const supabase = await createClient();

  const { data: auth, error: authErr } = await supabase.auth.getUser();
  if (authErr || !auth?.user) {
    return NextResponse.json({ ok: false, error: "UNAUTHENTICATED" }, { status: 401 });
  }

  const params = await ctx.params;
  const employeeId = String(params?.id ?? "").trim();
  if (!employeeId) {
    return NextResponse.json({ ok: false, error: "BAD_REQUEST", message: "missing employee id" }, { status: 400 });
  }

  let body: StarterBody = {};
  try {
    body = (await req.json()) as StarterBody;
  } catch {
    return NextResponse.json({ ok: false, error: "BAD_REQUEST", message: "invalid json" }, { status: 400 });
  }

  const p45Provided = typeof body.p45_provided === "boolean" ? body.p45_provided : null;

  const row: StarterRow = {
    employee_id: employeeId,
    p45_provided: p45Provided,
    starter_declaration: p45Provided ? null : normalizeDeclaration(body.starter_declaration),
    student_loan_plan: normalizeLoanPlan(body.student_loan_plan),
    postgraduate_loan: typeof body.postgraduate_loan === "boolean" ? body.postgraduate_loan : null,
  };

  try {
    const { data, error } = await supabase
      .from("employee_starters")
      .upsert(row, { onConflict: "employee_id" })
      .select("*")
      .eq("employee_id", employeeId)
      .maybeSingle();

    if (error) {
      if (looksLikeMissingTableOrRls(error)) {
        return NextResponse.json({ ok: true, id: employeeId, data: row, warning: "db_write_failed" }, { status: 201 });
      }

      return NextResponse.json(
        { ok: true, id: employeeId, data: row, warning: "db_write_failed", detail: error.message },
        { status: 201 }
      );
    }

    return NextResponse.json({ ok: true, id: employeeId, data: data ?? row }, { status: 201 });
  } catch (e: unknown) {
    const msg = e && typeof e === "object" && "message" in e ? String((e as any).message) : String(e);
    return NextResponse.json({ ok: true, id: employeeId, data: row, warning: "db_write_failed", detail: msg }, { status: 201 });
  }
}